// Run against launch.cjs. Checks actual node bounds after switching, hiding,
// and resizing the VS Code panel, then verifies manual pan/zoom is preserved.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const dir = process.env.PERF_DIR || path.resolve(__dirname, "../../.context/perf");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  const c = await require("./cdp.cjs").connect();
  const results = [];
  const request = async (data) => {
    await fs.writeFile(
      path.join(dir, "request.json"),
      JSON.stringify({ id: String(Date.now()), ...data })
    );
    await sleep(1000);
  };
  const state = () =>
    c.lineage.evaluate(() => {
      const box = document.querySelector(".vue-flow").getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        loading: !!document.querySelector(".loading-overlay"),
        transform: document.querySelector(".vue-flow__transformationpane")?.getAttribute("style"),
        nodes: [...document.querySelectorAll(".vue-flow__node")].map((e) => {
          const r = e.getBoundingClientRect();
          return {
            id: e.dataset.id,
            left: r.left - box.left,
            right: r.right - box.left,
            top: r.top - box.top,
            bottom: r.bottom - box.top,
            visible: getComputedStyle(e).visibility === "visible",
          };
        }),
      };
    });
  const fitted = async (label) => {
    await sleep(300);
    const s = await state();
    assert.equal(s.loading, false, `${label}: still loading`);
    assert.equal(s.nodes.length, 7, `${label}: expected the full neighborhood`);
    for (const n of s.nodes)
      assert(
        n.visible && n.left >= 0 && n.right <= s.width && n.top >= 0 && n.bottom <= s.height,
        `${label}: clipped node ${JSON.stringify(n)} in ${s.width}x${s.height}`
      );
    const center =
      (Math.min(...s.nodes.map((n) => n.top)) + Math.max(...s.nodes.map((n) => n.bottom))) / 2;
    assert(
      Math.abs(center - s.height / 2) < 3,
      `${label}: graph is off-center by ${center - s.height / 2}px`
    );
    const left = Math.min(...s.nodes.map((n) => n.left));
    const right = Math.max(...s.nodes.map((n) => n.left));
    const upstream = s.nodes.filter((n) => Math.abs(n.left - left) < 1).sort((a, b) => a.top - b.top);
    const downstream = s.nodes.filter((n) => Math.abs(n.left - right) < 1).sort((a, b) => a.top - b.top);
    assert.equal(upstream.length, 3, `${label}: expected three upstream nodes`);
    assert.equal(downstream.length, 3, `${label}: expected three downstream nodes`);
    for (let row = 0; row < 3; row++)
      assert(
        Math.abs(upstream[row].top - downstream[row].top) < 3,
        `${label}: upstream/downstream row ${row} is misaligned`
      );
    results.push({ label, ...s });
    return s;
  };
  const resizePanel = async (fraction) => {
    const rect = await c.page.evaluate(() => {
      const r = [...document.querySelectorAll(".monaco-sash.horizontal:not(.disabled)")]
        .map((e) => e.getBoundingClientRect().toJSON())
        .find((r) => r.width > 500 && r.y > 50);
      return { ...r, windowHeight: innerHeight };
    });
    assert(rect.width, "Cannot find VS Code panel sash");
    const x = rect.x + rect.width / 2,
      y = rect.windowHeight * fraction;
    await c.page.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y: rect.y + 2,
      button: "left",
      clickCount: 1,
    });
    await c.page.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "left",
      buttons: 1,
    });
    await c.page.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      clickCount: 1,
    });
    await sleep(500);
  };
  try {
    await c.page.send("Page.bringToFront");
    await c.lineage.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await request({ command: "notifications.clearAll" });
    await request({
      file: "pipeline-100/assets/asset_0041.sql",
      command: "bruin.assetLineageView.focus",
    });
    await fitted("asset switch");
    await request({ command: "workbench.action.closePanel" });
    await request({ file: "pipeline-100/assets/asset_0042.sql" });
    await request({ command: "bruin.assetLineageView.focus" });
    await fitted("switch while hidden then reveal");
    await resizePanel(0.68);
    await fitted("shrink panel");
    await resizePanel(0.4);
    await fitted("grow panel");
    // Shared neighbors retain their DOM nodes while the focus asset changes.
    for (const i of [43, 44, 41]) {
      await request({ file: `pipeline-100/assets/asset_${String(i).padStart(4, "0")}.sql` });
      await fitted(`neighbor switch ${i}`);
    }
    await c.lineage.evaluate(() => {
      const pane = document.querySelector(".vue-flow__pane");
      pane.dispatchEvent(
        new MouseEvent("mousedown", {
          view: window,
          bubbles: true,
          button: 0,
          buttons: 1,
          clientX: 300,
          clientY: 100,
        })
      );
      window.dispatchEvent(
        new MouseEvent("mousemove", {
          view: window,
          bubbles: true,
          buttons: 1,
          clientX: 350,
          clientY: 130,
        })
      );
      window.dispatchEvent(
        new MouseEvent("mouseup", {
          view: window,
          bubbles: true,
          button: 0,
          clientX: 350,
          clientY: 130,
        })
      );
    });
    await sleep(150);
    const panned = await state();
    await resizePanel(0.48);
    assert.equal((await state()).transform, panned.transform, "Resize undid manual pan");
    await c.lineage.evaluate(() => document.querySelector(".vue-flow__controls-fitview").click());
    await fitted("manual fit");
    await c.lineage.evaluate(() => document.querySelector(".vue-flow__controls-zoomin").click());
    await sleep(150);
    const zoomed = await state();
    await resizePanel(0.4);
    assert.equal((await state()).transform, zoomed.transform, "Resize undid manual zoom");
    await request({ file: "pipeline-100/assets/asset_0042.sql" });
    await fitted("new asset resets manual viewport");
    await request({ file: "pipeline-100/assets/asset_0041.sql" });
    await fitted("final asset");
    const shot = await c.page.send("Page.captureScreenshot");
    await fs.writeFile(path.join(dir, "layout-verified.png"), Buffer.from(shot.data, "base64"));
    await fs.writeFile(path.join(dir, "layout-check.json"), JSON.stringify(results, null, 2));
    console.log(`Passed ${results.length} layout checks plus manual pan/zoom preservation`);
  } finally {
    c.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
