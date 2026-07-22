import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import * as vscode from "vscode";
import { DacServe, DacServerManager, DacNotFoundError, DacStartError } from "../bruin/dacServe";
import { fetchDashboard, fetchDashboardData, fetchDashboardList, DacDashboard } from "../bruin/dacApi";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";

/**
 * Reads the top-level `name:` field from a dashboard YAML file. Returns the
 * raw string (unquoted) or undefined if the file isn't readable / doesn't have
 * one. Deliberately regex-based — adding a full YAML parser dep is overkill and
 * dac's dashboard files put `name:` near the top.
 */
function readDashboardName(filePath: string): string | undefined {
  if (!/\.ya?ml$/i.test(filePath)) {
    return undefined;
  }
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
  const match = text.match(/^name:\s*(.+?)\s*$/m);
  if (!match) {
    return undefined;
  }
  let value = match[1].trim();
  // A block/folded scalar (`name: >` or `name: |`, with optional chomping) has
  // its value on following lines — the regex would capture just the indicator.
  // Treat these as unresolved so the caller can fall back to dac's listing.
  if (/^[|>][+\-0-9]*$/.test(value)) {
    return undefined;
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value || undefined;
}

/**
 * Classifies a YAML file so we can reject non-dashboards before spawning dac.
 * `dac serve` validates *every* YAML in the served directory as a dashboard and
 * exits if one isn't (e.g. a semantic-model file with top-level
 * `metrics`/`dimensions`/`source`). Catching that here gives a clear message
 * instead of a cryptic "additional properties not allowed" from dac.
 */
function classifyYaml(filePath: string): "dashboard" | "semantic-model" | "unknown" {
  if (!/\.ya?ml$/i.test(filePath)) {
    return "unknown";
  }
  let text: string;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return "unknown";
  }
  const hasTop = (key: string) => new RegExp(`^${key}:`, "m").test(text);
  if (hasTop("rows") || hasTop("widgets")) {
    return "dashboard";
  }
  // Semantic models declare these at the top level; dashboards nest them.
  if (hasTop("metrics") || hasTop("dimensions") || hasTop("source") || hasTop("segments")) {
    return "semantic-model";
  }
  return "unknown";
}

/**
 * Tier 2 native dashboard preview. Instead of embedding dac's SPA in an iframe,
 * this panel keeps `dac serve` running purely as a JSON API and renders the
 * dashboard with a native Vue view (webview-ui/dac-preview) themed with VS
 * Code's own color tokens. The full dac SPA is one click away via "Open in
 * Browser" as the full-fidelity escape hatch.
 */
export class DacPreviewPanel {
  public static readonly viewType = "bruin.dacPreview";
  private static output: vscode.OutputChannel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly server: DacServe;
  private readonly dashboardDir: string;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];
  private currentName: string | undefined;
  private currentDashboardJson: string = "";
  private disposed: boolean = false;
  private sseReq: http.ClientRequest | undefined;
  private reloadTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSeq: number = 0;

  private constructor(
    panel: vscode.WebviewPanel,
    server: DacServe,
    dashboardDir: string,
    extensionUri: vscode.Uri,
    initialName: string | undefined
  ) {
    this.panel = panel;
    this.server = server;
    this.dashboardDir = dashboardDir;
    this.extensionUri = extensionUri;
    this.currentName = initialName;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.setMessageListener();

    // Live update: dac watches the served files and emits an SSE `full_reload`
    // *after* it has re-read them, so refetching on that event is race-free
    // (fetching on the raw save event returns stale data — dac hasn't reloaded
    // yet). This drives edit-to-preview updates without a manual refresh.
    this.startReloadStream();

    // Switch dashboards when the user activates another dashboard YAML in the
    // same directory dac is serving.
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor || !this.isInDashboardDir(editor.document.uri.fsPath)) {
          return;
        }
        if (classifyYaml(editor.document.uri.fsPath) === "semantic-model") {
          return;
        }
        const name = readDashboardName(editor.document.uri.fsPath);
        if (name && name !== this.currentName) {
          this.currentName = name;
          DacPreviewPanel.getOutput().appendLine(`[dac] previewing dashboard: ${name}`);
          void this.load({ dataOnlyIfUnchanged: false });
        }
      })
    );
  }

  private isInDashboardDir(filePath: string): boolean {
    const rel = path.relative(this.dashboardDir, filePath);
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
  }

  private static getOutput(): vscode.OutputChannel {
    if (!DacPreviewPanel.output) {
      DacPreviewPanel.output = vscode.window.createOutputChannel("Bruin DAC");
    }
    return DacPreviewPanel.output;
  }

  public static async open(documentUri: vscode.Uri, extensionUri: vscode.Uri): Promise<void> {
    const dashboardDir = path.dirname(documentUri.fsPath);
    const output = DacPreviewPanel.getOutput();

    // dac serves the whole directory and rejects non-dashboard YAML. Guard the
    // common mistake of previewing a semantic-model (or other non-dashboard)
    // file, which would otherwise crash `dac serve` on startup.
    if (classifyYaml(documentUri.fsPath) === "semantic-model") {
      output.appendLine(`[dac] ${path.basename(documentUri.fsPath)} looks like a semantic model, not a dashboard.`);
      vscode.window.showWarningMessage(
        "Bruin: this file looks like a semantic model, not a dashboard. " +
          "Open a dashboard file (one with a top-level `rows:`) and run Preview Dashboard again."
      );
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      DacPreviewPanel.viewType,
      `DAC Preview: ${path.basename(documentUri.fsPath)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );
    const iconPath = vscode.Uri.joinPath(extensionUri, "img", "bruin-logo-sm128.png");
    panel.iconPath = { light: iconPath, dark: iconPath };

    try {
      // dac's template only matters for its own SPA; the native view themes
      // itself from VS Code, so the value here is cosmetic (browser fallback).
      const server = await DacServerManager.acquire(dashboardDir, output, "bruin");
      const name = readDashboardName(documentUri.fsPath);
      const preview = new DacPreviewPanel(panel, server, dashboardDir, extensionUri, name);
      panel.webview.html = preview.renderHtml();
      // Data is fetched once the webview posts "ready".
    } catch (err) {
      if (err instanceof DacNotFoundError) {
        output.appendLine(`[dac] ${err.message}`);
        const choice = await vscode.window.showErrorMessage(
          "Bruin: the 'dac' executable was not found.",
          "Open Settings"
        );
        if (choice === "Open Settings") {
          await vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "bruin.dac.executable"
          );
        }
        panel.dispose();
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      output.appendLine(`[dac] failed to start: ${message}`);
      panel.dispose();
      const detail =
        err instanceof DacStartError && err.details ? err.details.split("\n").pop() : "";
      const summary = detail
        ? `Bruin: dac serve failed — ${detail}`
        : `Bruin: Failed to start dac serve — ${message}`;
      const choice = await vscode.window.showErrorMessage(summary, "Show Output");
      if (choice === "Show Output") {
        output.show();
      }
    }
  }

  private setMessageListener(): void {
    this.panel.webview.onDidReceiveMessage(
      async (message: { command: string }) => {
        switch (message.command) {
          case "ready":
            await this.load({ dataOnlyIfUnchanged: false });
            break;
          case "refresh":
            await this.load({ dataOnlyIfUnchanged: false });
            break;
          case "openExternal":
            await this.openExternal();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private post(command: string, payload?: unknown): void {
    if (!this.disposed) {
      void this.panel.webview.postMessage({ command, payload });
    }
  }

  /** Subscribes to dac's SSE reload stream and refetches when it fires. */
  private startReloadStream(): void {
    if (this.disposed) {
      return;
    }
    const url = new URL("/api/v1/events", this.server.url);
    const req = http.get(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: { Accept: "text/event-stream" },
      },
      (res) => {
        res.setEncoding("utf8");
        let buffer = "";
        res.on("data", (chunk: string) => {
          buffer += chunk;
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data:")) {
              continue;
            }
            try {
              const evt = JSON.parse(line.slice(5).trim());
              if (evt && (evt.type === "full_reload" || evt.type === "draft_reload")) {
                this.scheduleReload();
              }
            } catch {
              /* keepalive / non-JSON line */
            }
          }
        });
        res.on("end", () => this.retryReloadStream());
        res.on("error", () => this.retryReloadStream());
      }
    );
    req.on("error", () => this.retryReloadStream());
    this.sseReq = req;
  }

  private retryReloadStream(): void {
    this.sseReq = undefined;
    if (this.disposed) {
      return;
    }
    setTimeout(() => {
      if (!this.disposed) {
        this.startReloadStream();
      }
    }, 1000);
  }

  /** Coalesces bursts of reload events into a single refetch. */
  private scheduleReload(): void {
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    this.reloadTimer = setTimeout(() => {
      void this.load({ dataOnlyIfUnchanged: true });
    }, 150);
  }

  /**
   * Fetches the current dashboard definition + query results from dac's JSON
   * API and posts them to the webview. When `dataOnlyIfUnchanged` is set and the
   * definition is byte-identical to what's already shown, only the data is
   * pushed — so a save that changed values (not layout) refreshes widgets in
   * place without a re-render.
   */
  private async load(opts: { dataOnlyIfUnchanged: boolean }): Promise<void> {
    // Tag this load; if a newer load starts (e.g. fast editor switch) we drop
    // this one's results so a slow response can't overwrite the current view.
    const seq = ++this.loadSeq;
    const stale = () => seq !== this.loadSeq || this.disposed;
    try {
      const name = await this.resolveName();
      if (stale()) {
        return;
      }
      if (!name) {
        this.post("error", {
          message:
            "Couldn't determine which dashboard to preview. Open a dashboard file (one with a top-level `rows:`).",
        });
        return;
      }
      const dashboard = await fetchDashboard(this.server.url, name);
      if (stale()) {
        return;
      }
      const json = JSON.stringify(dashboard);
      const structureChanged = json !== this.currentDashboardJson;
      if (structureChanged || !opts.dataOnlyIfUnchanged) {
        this.currentDashboardJson = json;
        this.applyPanelTitle(dashboard);
        this.post("dashboard", { dashboard });
      }
      const data = await fetchDashboardData(this.server.url, name);
      if (stale()) {
        return;
      }
      this.post("data", { data });
    } catch (err) {
      if (stale()) {
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      DacPreviewPanel.getOutput().appendLine(`[dac] load failed: ${message}`);
      this.post("error", { message });
    }
  }

  /**
   * The dashboard name for the current file. YAML resolves via its top-level
   * `name:`; TSX (and folded/edge YAML the regex can't read) fall back to dac's
   * dashboard listing so the preview still works instead of erroring out.
   */
  private async resolveName(): Promise<string | undefined> {
    if (this.currentName) {
      return this.currentName;
    }
    try {
      const list = await fetchDashboardList(this.server.url);
      if (list.length) {
        this.currentName = list[0].name;
        return this.currentName;
      }
    } catch {
      /* fall through to undefined */
    }
    return undefined;
  }

  private applyPanelTitle(dashboard: DacDashboard): void {
    if (dashboard.name) {
      this.panel.title = `DAC: ${dashboard.name}`;
    }
  }

  private async openExternal(): Promise<void> {
    const url = this.currentName
      ? `${this.server.url}/d/${encodeURIComponent(this.currentName)}`
      : this.server.url;
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  private dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
    }
    this.sseReq?.destroy();
    DacServerManager.release(this.dashboardDir);
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private renderHtml(): string {
    const webview = this.panel.webview;
    const nonce = getNonce();
    const scriptUri = getUri(webview, this.extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "dacPreview.js",
    ]);
    const stylesUri = getUri(webview, this.extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "dacPreview.css",
    ]);
    const codiconsUri = getUri(webview, this.extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "codicon.css",
    ]);
    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      img-src ${webview.cspSource} https: data:;
      script-src 'nonce-${nonce}' ${webview.cspSource};
      style-src ${webview.cspSource} 'unsafe-inline';
      font-src ${webview.cspSource};
  " />
  <link rel="stylesheet" href="${stylesUri}" />
  <link rel="stylesheet" href="${codiconsUri}" />
  <title>DAC Preview</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
