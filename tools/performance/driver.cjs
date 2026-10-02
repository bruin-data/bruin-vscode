// VS Code --extensionTestsPath entry point; only use in an isolated profile.
// Records CLI calls/messages and accepts file/command requests from benchmark.cjs.
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const perfDir = process.env.PERF_DIR || path.join(root, ".context/perf");
const log = (kind, data = {}) =>
  fs.appendFileSync(
    path.join(perfDir, "extension-events.jsonl"),
    JSON.stringify({ time: Date.now(), kind, ...data }) + "\n"
  );
exports.run = async () => {
  const { BruinCommand } = require(path.join(root, "out/bruin/bruinCommand.js"));
  const original = BruinCommand.prototype.run;
  let call = 0;
  BruinCommand.prototype.run = async function (query, ...args) {
    const id = ++call,
      start = Date.now();
    log("cli-start", { id, command: this.bruinCommand(), query });
    try {
      const r = await original.call(this, query, ...args);
      log("cli-end", { id, ms: Date.now() - start, bytes: Buffer.byteLength(r || "") });
      return r;
    } catch (e) {
      log("cli-error", { id, ms: Date.now() - start, error: String(e) });
      throw e;
    }
  };
  const { BruinPanel } = require(path.join(root, "out/panels/BruinPanel.js"));
  const post = BruinPanel.postMessage;
  BruinPanel.postMessage = function (name, data, ...args) {
    log("right-message", { name, bytes: Buffer.byteLength(JSON.stringify(data)) });
    return post.call(this, name, data, ...args);
  };
  const { LineagePanel } = require(path.join(root, "out/panels/LineagePanel.js"));
  LineagePanel.getInstance().addListener((d) =>
    log("lineage-message", { bytes: Buffer.byteLength(JSON.stringify(d)), file: d.filePath })
  );
  await vscode.extensions.getExtension("bruin.bruin").activate();
  const initialDoc = await vscode.workspace.openTextDocument(
    path.join(perfDir, "pipeline-100/assets/asset_0050.sql")
  );
  await vscode.window.showTextDocument(initialDoc, {
    viewColumn: vscode.ViewColumn.One,
    preview: false,
  });
  BruinPanel.render(vscode.Uri.file(root));
  await vscode.commands.executeCommand("bruin.assetLineageView.focus");
  await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
  log("ready");
  let last = "";
  try {
    last = JSON.parse(fs.readFileSync(path.join(perfDir, "request.json"), "utf8")).id;
  } catch {}
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    let request;
    try {
      request = JSON.parse(fs.readFileSync(path.join(perfDir, "request.json"), "utf8"));
    } catch {
      return;
    }
    if (request.id === last) return;
    last = request.id;
    busy = true;
    log("request", request);
    try {
      if (request.clearCache)
        require(path.join(root, "out/providers/PipelineLineageCacheService.js"))
          .getPipelineLineageCache()
          .invalidateAll();
      if (request.file) {
        const doc = await vscode.workspace.openTextDocument(path.join(perfDir, request.file));
        await vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.One,
          preview: false,
        });
      }
      if (request.command)
        await vscode.commands.executeCommand(request.command, ...(request.args || []));
      if (request.refreshLineage)
        await require(path.join(root, "out/extension/commands/FlowLineageCommand.js"))
          .flowLineageCommand(vscode.window.activeTextEditor?.document.uri);
      if (request.right) BruinPanel.render(vscode.Uri.file(root));
      log("request-done", { id: request.id });
    } catch (e) {
      log("request-error", { id: request.id, error: String(e) });
    } finally {
      busy = false;
    }
  }, 100);
  return new Promise(() => {});
};
