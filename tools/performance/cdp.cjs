// Read the isolated extension host webviews through its local DevTools port.
// Requires Node.js 22+ (native WebSocket). No browser automation dependency.
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (e) => {
      const d = JSON.parse(e.data);
      if (d.id) {
        const p = this.pending.get(d.id);
        this.pending.delete(d.id);
        d.error ? p.reject(new Error(JSON.stringify(d.error))) : p.resolve(d.result);
      } else this.events.push(d);
    });
  }
  static async open(url) {
    const ws = new WebSocket(url);
    await new Promise((r, j) => {
      ws.addEventListener("open", r, { once: true });
      ws.addEventListener("error", j, { once: true });
    });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(fn, arg) {
    const expression = `(${fn.toString()})(${JSON.stringify(arg) ?? ""})`;
    const r = await this.send("Runtime.evaluate", {
      expression,
      contextId: this.contextId,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  close() {
    this.ws.close();
  }
}
exports.connect = async () => {
  const targets = await (
    await fetch(`http://127.0.0.1:${process.env.PERF_PORT || 9333}/json/list`)
  ).json();
  const all = [];
  let right, lineage, page;
  for (const t of targets.filter((t) => ["page", "iframe"].includes(t.type))) {
    const c = await CDP.open(t.webSocketDebuggerUrl);
    all.push(c);
    await c.send("Runtime.enable");
    if (t.type === "page") page = c;
    for (const e of c.events.filter(
      (e) => e.method === "Runtime.executionContextCreated" && e.params.context.auxData?.isDefault
    )) {
      c.contextId = e.params.context.id;
      const kind = await c.evaluate(() =>
        document.querySelector("#input-name")
          ? "right"
          : document.querySelector(".flow")
            ? "lineage"
            : null
      );
      if (kind === "right") {
        right = c;
        break;
      }
      if (kind === "lineage") {
        lineage = c;
        break;
      }
    }
  }
  return { right, lineage, page, close: () => all.forEach((c) => c.close()) };
};
