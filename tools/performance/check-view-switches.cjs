// Run against launch.cjs after a fresh launch to exercise uncached view switches.
// Samples every animation frame; a revealed graph must already have its final
// geometry. PERF_RECORD_ONLY=1 records the baseline without failing assertions.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const dir = process.env.PERF_DIR || path.resolve(__dirname, "../../.context/perf");
const label = process.env.PERF_LABEL || "view-switches";
const size = Number(process.env.PERF_SIZE || 100);
const cases = JSON.parse(process.env.PERF_SWITCHES || JSON.stringify([
  "pipeline", "direct", "all", "direct", "column", "pipeline", "column", "direct",
  { mode: "direct", via: "pipeline" }, { mode: "direct", via: "column" },
]));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  const c = await require("./cdp.cjs").connect();
  const results = [];
  try {
    assert(c.lineage, "Lineage panel is not ready");
    await c.page.send("Page.bringToFront");
    await c.lineage.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await c.lineage.evaluate((size) => {
      window.__switchFixtureReady = false;
      const receive = (event) => {
        const message = event.data;
        if (message.command === "flow-lineage-message" &&
            message.payload?.status === "success" &&
            message.payload.filePath?.replaceAll("\\", "/").endsWith(`pipeline-${size}/assets/asset_0041.sql`)) {
          window.__switchFixtureReady = true;
          window.removeEventListener("message", receive);
        }
      };
      window.addEventListener("message", receive);
    }, size);
    await fs.writeFile(
      path.join(dir, "request.json"),
      JSON.stringify({
        id: String(Date.now()),
        file: `pipeline-${size}/assets/asset_0041.sql`,
        command: "notifications.clearAll",
      })
    );
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      await sleep(250);
      ready = await c.lineage.evaluate(() =>
        window.__switchFixtureReady && !document.querySelector(".loading-overlay") &&
        document.querySelectorAll(".vue-flow__node").length === 7 &&
        document.querySelector(".flow")?.textContent.includes("perf.asset_0041")
      );
      if (ready) break;
    }
    assert(ready, "Initial asset neighborhood did not finish rendering");
    for (const testCase of cases) {
      const { mode, via } = typeof testCase === "string" ? { mode: testCase } : testCase;
      const result = await c.lineage.evaluate(
        async ({ mode, via }) => {
          document.querySelector("#filter-tab-trigger")?.click();
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (via) {
            [...document.querySelectorAll("vscode-radio")].find((n) => n.value === via).click();
            await new Promise((resolve) => requestAnimationFrame(resolve));
            document.querySelector("#filter-tab-trigger")?.click();
            await new Promise((resolve) => requestAnimationFrame(resolve));
          }
          const radio = [...document.querySelectorAll("vscode-radio")].find(
            (n) => n.value === mode
          );
          if (!radio) throw new Error(`Missing ${mode} control`);
          const snapshots = [];
          const started = performance.now();
          let lastChange = started;
          let lastSignature = "";
          let blankFramesAfterReveal = 0;
          let maxMountedNodes = 0;
          radio.click();
          return new Promise((resolve, reject) => {
            const sample = () => {
              const now = performance.now();
              if (now - started > 30000) return reject(new Error(`Timed out switching to ${mode}`));
              const flow = document.querySelector(".vue-flow");
              const pane = flow?.querySelector(".vue-flow__transformationpane");
              const loading = !!document.querySelector(".loading-overlay");
              const mounted = [...(flow?.querySelectorAll(".vue-flow__node") || [])];
              maxMountedNodes = Math.max(maxMountedNodes, mounted.length);
              // Opacity preserves measurement while preventing intermediate paint.
              const visible =
                pane &&
                getComputedStyle(pane).visibility === "visible" &&
                Number(getComputedStyle(pane).opacity) > 0 &&
                !loading;
              const nodes = visible
                ? mounted.filter(
                    (n) => getComputedStyle(n).visibility === "visible"
                  )
                : [];
              const columns = !!flow?.querySelector(".vue-flow__node-customWithColumn");
              const pipeline = !columns && !!flow?.querySelector(".vue-flow__minimap");
              const matching =
                mode === "column"
                  ? columns
                  : mode === "pipeline"
                    ? pipeline
                    : !columns &&
                      !pipeline &&
                      (mode === "direct" ? nodes.length === 7 : nodes.length > 7);
              if (!nodes.length && snapshots.length) blankFramesAfterReveal++;
              if (nodes.length) {
                const bounds = nodes
                  .map((n) => {
                    const r = n.getBoundingClientRect();
                    return [
                      n.dataset.id,
                      ...[r.x, r.y, r.width, r.height].map((x) => Math.round(x * 10) / 10),
                    ];
                  })
                  .sort((a, b) => a[0].localeCompare(b[0]));
                const signature = JSON.stringify(bounds);
                if (signature !== lastSignature) {
                  snapshots.push({
                    ms: Math.round(now - started),
                    matching,
                    transform: pane.style.transform,
                    nodes: nodes.length,
                    bounds,
                  });
                  lastSignature = signature;
                  lastChange = now;
                }
              }
              if (matching && nodes.length && now - lastChange > 1000)
                return resolve({
                  mode,
                  via,
                  ms: Math.round(now - started),
                  blankFramesAfterReveal,
                  maxMountedNodes,
                  snapshots,
                });
              requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          });
        },
        { mode, via }
      );
      results.push(result);
      console.log(
        JSON.stringify({
          mode,
          via,
          blankFramesAfterReveal: result.blankFramesAfterReveal,
          visibleLayouts: result.snapshots.length,
          maxMountedNodes: result.maxMountedNodes,
          changes: result.snapshots.map((s) => ({
            ms: s.ms,
            nodes: s.nodes,
            transform: s.transform,
          })),
        })
      );
    }
    await fs.writeFile(path.join(dir, label + ".json"), JSON.stringify(results, null, 2));
    if (!process.env.PERF_RECORD_ONLY)
      for (const result of results) {
        assert.equal(
          result.snapshots.length,
          1,
          `${result.mode}: exposed ${result.snapshots.length} different layouts during switch`
        );
        assert.equal(
          result.blankFramesAfterReveal,
          0,
          `${result.mode}: graph flickered after reveal`
        );
        assert(result.snapshots[0].matching, `${result.mode}: revealed the wrong graph`);
        if (result.mode === "pipeline")
          assert.equal(result.maxMountedNodes, size, "Pipeline must mount every node before fitting");
      }
    console.log(`Completed ${cases.length} view switches on ${size} assets`);
  } finally {
    c.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
