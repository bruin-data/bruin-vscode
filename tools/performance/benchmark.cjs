// Run after launch.cjs has opened both panels. Optional PERF_LABEL and PERF_CASES.
// Metrics: file-request -> first matching details / laid-out visible graph frame,
// main-thread long tasks (>50ms), mounted DOM, CLI count, and message bytes.
// The pipeline graph is virtualized: readiness requires visible nodes and no
// loading overlay; DOM node counts are mounted nodes, not total pipeline size.
// Cold pipeline cases clear the parse cache. Cases must switch the active file.
// Results and the final screenshot are written under PERF_DIR (.context/perf).
const fs = require("fs/promises");
const path = require("path");
const perfDir = process.env.PERF_DIR || path.resolve(__dirname, "../../.context/perf");
const label = process.env.PERF_LABEL || `run-${Date.now()}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { right, lineage, page, close } = await require("./cdp.cjs").connect();
  if (!right || !lineage) throw new Error("Missing panels");
  await page.send("Page.bringToFront");
  await right.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await lineage.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  const results = [];
  const cases = JSON.parse(
    process.env.PERF_CASES ||
      '[{"n":100,"type":"asset","i":51},{"n":500,"type":"asset","i":250},{"n":1500,"type":"asset","i":750},{"n":1500,"type":"asset","i":751},{"n":100,"type":"pipeline"},{"n":500,"type":"pipeline"},{"n":1500,"type":"pipeline"}]'
  );
  for (const c of cases) {
    const name = c.type === "asset" ? `perf.asset_${String(c.i).padStart(4, "0")}` : `perf-${c.n}`;
    const file =
      `pipeline-${c.n}/` +
      (c.type === "asset" ? `assets/asset_${String(c.i).padStart(4, "0")}.sql` : "pipeline.yml");
    const start = Date.now(),
      id = String(start);
    for (const [f, kind] of [
      [right, "right"],
      [lineage, "lineage"],
    ])
      await f.evaluate(
        ({ kind, name, n, type, start }) => {
          window.__perf?.observer?.disconnect();
          window.__perf?.mutation?.disconnect();
          if (window.__perf?.receive) window.removeEventListener("message", window.__perf.receive);
          cancelAnimationFrame(window.__perf?.raf);
          const state = (window.__perf = {
            start,
            events: [],
            tasks: [],
            first: null,
            ready: null,
            kind,
            received: false,
          });
          state.receive = (event) => {
            const message = event.data;
            if (
              message.command === "flow-lineage-message" &&
              message.payload?.status === "success" &&
              message.payload.message?.name === name
            ) {
              state.received = true;
            }
          };
          window.addEventListener("message", state.receive);
          state.observer = new PerformanceObserver((list) =>
            state.tasks.push(
              ...list.getEntries().map((e) => ({
                start: e.startTime + performance.timeOrigin - start,
                ms: e.duration,
              }))
            )
          );
          state.observer.observe({ type: "longtask", buffered: false });
          let scheduled = false;
          const check = () => {
            scheduled = false;
            const ok =
              kind === "right"
                ? document.querySelector("#input-name")?.textContent.trim() === name
                : !state.received
                  ? false
                  : type === "pipeline"
                    ? document.querySelectorAll(".vue-flow__node").length > 0
                    : document.querySelector(".flow")?.textContent.includes(name);
            if (ok && !document.querySelector(".loading-overlay")) {
              if (state.first === null) state.first = Date.now() - start;
              state.raf = requestAnimationFrame(() => {
                state.ready ??= Date.now() - start;
              });
            }
          };
          state.mutation = new MutationObserver(() => {
            if (!scheduled) {
              scheduled = true;
              state.raf = requestAnimationFrame(check);
            }
          });
          state.mutation.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
          });
        },
        { kind, name, n: c.n, type: c.type, start }
      );
    await fs.writeFile(
      path.join(perfDir, "request.json"),
      JSON.stringify({ id, file, clearCache: c.cold ?? c.type === "pipeline" })
    );
    let done = false;
    for (let j = 0; j < 240; j++) {
      await sleep(250);
      const ready = await lineage.evaluate(() => window.__perf?.ready);
      const r = await right.evaluate(() => window.__perf?.ready);
      if (ready && r) {
        done = true;
        break;
      }
    }
    await sleep(1500);
    const metrics = await Promise.all(
      [right, lineage].map((f) =>
        f.evaluate(() => {
          const s = window.__perf;
          s.observer.disconnect();
          s.mutation.disconnect();
          window.removeEventListener("message", s.receive);
          cancelAnimationFrame(s.raf);
          return {
            first: s.first,
            ready: s.ready,
            longTasks: s.tasks,
            dom: document.querySelectorAll("*").length,
            nodes: document.querySelectorAll(".vue-flow__node").length,
            edges: document.querySelectorAll(".vue-flow__edge").length,
            workerCount: performance
              .getEntriesByType("resource")
              .filter((x) => x.name.includes("worker")).length,
          };
        })
      )
    );
    const events = (await fs.readFile(path.join(perfDir, "extension-events.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse)
      .filter((e) => e.time >= start);
    const result = { ...c, name, start, done, right: metrics[0], lineage: metrics[1], events };
    results.push(result);
    console.log(
      JSON.stringify({
        ...c,
        done,
        rightMs: metrics[0].first,
        lineageMs: metrics[1].first,
        rightMaxTask: Math.max(0, ...metrics[0].longTasks.map((x) => x.ms)),
        lineageMaxTask: Math.max(0, ...metrics[1].longTasks.map((x) => x.ms)),
        lineageDom: metrics[1].dom,
        nodes: metrics[1].nodes,
        edges: metrics[1].edges,
        calls: events.filter((e) => e.kind === "cli-start").length,
      })
    );
    await fs.writeFile(path.join(perfDir, label + ".json"), JSON.stringify(results, null, 2));
    if (!done)
      throw new Error(`Timed out waiting for ${file}; partial results saved to ${label}.json`);
  }
  const shot = await page.send("Page.captureScreenshot");
  await fs.writeFile(path.join(perfDir, label + ".png"), Buffer.from(shot.data, "base64"));
  close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
