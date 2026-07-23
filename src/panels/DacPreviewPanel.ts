import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { DacServe, DacServerManager, DacNotFoundError, DacStartError } from "../bruin/dacServe";
import {
  DacExecutableService,
  isDacVersionSupported,
  MIN_DAC_VERSION,
} from "../providers/DacExecutableService";
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
  // Block/folded scalar (`name: >`/`|`): value is on later lines, so treat as
  // unresolved and let the caller fall back to dac's listing.
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
 * Finds the main JS and CSS filenames from dac's built index.html.
 * Returns [jsFilename, cssFilename] or throws if not found.
 */
function findDacAssets(extensionPath: string): { js: string; css: string } {
  const indexPath = path.join(extensionPath, "webview-ui", "build", "dac-spa", "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  const jsMatch = html.match(/src="\.?\/assets\/(index-[^"]+\.js)"/);
  const cssMatch = html.match(/href="\.?\/assets\/(index-[^"]+\.css)"/);
  if (!jsMatch || !cssMatch) {
    throw new Error("Could not find dac assets in index.html");
  }
  return { js: jsMatch[1], css: cssMatch[1] };
}

/** Encodes a value as a safe JS string literal for inline-script injection (escapes `<` so `</script>` can't break out). */
function jsLiteral(value: string): string {
  return JSON.stringify(String(value)).replace(/</g, "\\u003c");
}

/**
 * Dashboard preview panel that embeds dac's React SPA directly in the webview.
 * The React app fetches data from the running `dac serve` process via injected
 * API base URL, providing full chart/table rendering without reimplementing
 * dac's components in Vue.
 */
export class DacPreviewPanel {
  public static readonly viewType = "bruin.dacPreview";
  private static output: vscode.OutputChannel | undefined;
  /** The most recently focused preview, so the title-bar command can target it. */
  private static active: DacPreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly server: DacServe;
  private readonly dashboardDir: string;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];
  private currentName: string | undefined;
  private disposed: boolean = false;

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

    DacPreviewPanel.active = this;
    this.disposables.push(
      this.panel.onDidChangeViewState((e) => {
        if (e.webviewPanel.active) {
          DacPreviewPanel.active = this;
        }
      })
    );

    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((msg) => {
        if (msg && msg.type === "openExternal") {
          this.openInBrowser();
        }
      })
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Switch dashboards when the user activates another dashboard YAML in the
    // same directory dac is serving. Navigate via hash change.
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
          DacPreviewPanel.getOutput().appendLine(`[dac] switching to dashboard: ${name}`);
          // Navigate the React app via hash
          void this.panel.webview.postMessage({
            type: "navigate",
            path: `/d/${encodeURIComponent(name)}`,
          });
        }
      })
    );

    // Follow renames: the webview navigates by name, so on save re-read `name:`
    // and re-navigate, else it stays pinned to the old name and 404s.
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (!this.isInDashboardDir(doc.uri.fsPath)) {
          return;
        }
        if (classifyYaml(doc.uri.fsPath) === "semantic-model") {
          return;
        }
        const name = readDashboardName(doc.uri.fsPath);
        if (name && name !== this.currentName) {
          this.currentName = name;
          DacPreviewPanel.getOutput().appendLine(`[dac] dashboard renamed to: ${name}`);
          void this.panel.webview.postMessage({
            type: "navigate",
            path: `/d/${encodeURIComponent(name)}`,
            name,
            smooth: true,
          });
        }
      })
    );
  }

  /** Opens this preview's dashboard in the system browser (full dac SPA). */
  private openInBrowser(): void {
    const base = this.server.url;
    const url = this.currentName
      ? `${base}/d/${encodeURIComponent(this.currentName)}`
      : base;
    void vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /** Title-bar command entry point: open the active preview in the browser. */
  public static openActiveInBrowser(): void {
    const panel = DacPreviewPanel.active;
    if (!panel) {
      void vscode.window.showInformationMessage("Bruin: no DAC dashboard preview is open.");
      return;
    }
    panel.openInBrowser();
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

    // dac serves the whole dir and rejects non-dashboard YAML, crashing on
    // startup — guard the common mistake of previewing a semantic model.
    if (classifyYaml(documentUri.fsPath) === "semantic-model") {
      output.appendLine(`[dac] ${path.basename(documentUri.fsPath)} looks like a semantic model, not a dashboard.`);
      vscode.window.showWarningMessage(
        "Bruin: this file looks like a semantic model, not a dashboard. " +
          "Open a dashboard file (one with a top-level `rows:`) and run Preview Dashboard again."
      );
      return;
    }

    // The embed needs the CORS middleware added in MIN_DAC_VERSION; older binaries
    // serve without it and the webview's cross-origin fetches fail silently.
    const version = await DacExecutableService.getInstance().getVersion();
    if (!isDacVersionSupported(version)) {
      output.appendLine(`[dac] version ${version} < required ${MIN_DAC_VERSION}`);
      const choice = await vscode.window.showErrorMessage(
        `Bruin: Dashboard Preview needs dac ${MIN_DAC_VERSION} or newer (found ${version}). Run \`dac upgrade\`.`,
        "Show Output"
      );
      if (choice === "Show Output") {
        output.show();
      }
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
      const server = await DacServerManager.acquire(dashboardDir, output, "bruin");
      const name = readDashboardName(documentUri.fsPath);
      const preview = new DacPreviewPanel(panel, server, dashboardDir, extensionUri, name);
      panel.webview.html = preview.renderHtml();
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

  private dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (DacPreviewPanel.active === this) {
      DacPreviewPanel.active = undefined;
    }
    DacServerManager.release(this.dashboardDir);
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private renderHtml(): string {
    const webview = this.panel.webview;
    const nonce = getNonce();
    const extensionPath = this.extensionUri.fsPath;

    // Find the hashed asset filenames from dac's build
    const assets = findDacAssets(extensionPath);

    // Get URIs for dac's React bundle
    const scriptUri = getUri(webview, this.extensionUri, [
      "webview-ui",
      "build",
      "dac-spa",
      "assets",
      assets.js,
    ]);
    const stylesUri = getUri(webview, this.extensionUri, [
      "webview-ui",
      "build",
      "dac-spa",
      "assets",
      assets.css,
    ]);

    // The API base URL for dac serve
    const apiBase = this.server.url;

    // Initial dashboard to navigate to
    const initialDashboard = this.currentName || "";

    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      img-src ${webview.cspSource} https: data:;
      script-src 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval';
      style-src ${webview.cspSource} 'unsafe-inline';
      font-src ${webview.cspSource} https: data:;
      connect-src ${apiBase} ${apiBase.replace('http:', 'ws:')};
  " />
  <link rel="stylesheet" href="${stylesUri}" />
  <style nonce="${nonce}">
    /* Map dac's theme tokens onto the editor's live --vscode-* variables so the
       dashboard tracks the VS Code theme (including light/dark switches). dac
       sets these tokens as an inline style on .dac-root; an !important rule
       here overrides that in the cascade without any dac-side code. */
    .dac-root {
      font-family: var(--vscode-font-family) !important;
      --dac-background: var(--vscode-editor-background) !important;
      --dac-surface: var(--vscode-sideBar-background) !important;
      --dac-surface-hover: var(--vscode-list-hoverBackground) !important;
      --dac-border: var(--vscode-panel-border) !important;
      --dac-text-primary: var(--vscode-editor-foreground) !important;
      --dac-text-secondary: var(--vscode-descriptionForeground) !important;
      --dac-text-muted: var(--vscode-disabledForeground) !important;
      --dac-accent: var(--vscode-textLink-foreground) !important;
      --dac-accent-hover: var(--vscode-textLink-activeForeground) !important;
      --dac-success: var(--vscode-charts-green) !important;
      --dac-warning: var(--vscode-charts-yellow) !important;
      --dac-error: var(--vscode-charts-red) !important;
      --dac-chart-1: var(--vscode-charts-blue) !important;
      --dac-chart-2: var(--vscode-charts-green) !important;
      --dac-chart-3: var(--vscode-charts-purple) !important;
      --dac-chart-4: var(--vscode-charts-red) !important;
      --dac-chart-5: var(--vscode-charts-yellow) !important;
      --dac-chart-6: var(--vscode-charts-orange) !important;
      --dac-chart-7: var(--vscode-charts-foreground) !important;
      --dac-chart-8: var(--vscode-charts-lines) !important;
    }
    /* Hide the "← Dashboards" back-link — there's no list to return to here. */
    .dac-root header a[href="#/"] { display: none !important; }
    /* Hide dac's header actions (Export + View YAML) — the header group is a
       <div>; scoped to div so the per-widget QueryInfo <button> (same attr,
       used to strip controls from exports) stays and shows the SQL on hover. */
    .dac-root div[data-dac-export-control] { display: none !important; }
    #dac-open-browser {
      position: fixed; top: 10px; right: 12px; z-index: 2147483646;
      display: inline-flex; align-items: center; gap: 5px;
      font: 11px/1 var(--vscode-font-family, system-ui, sans-serif);
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
      background: var(--vscode-button-secondaryBackground, rgba(127,127,127,0.15));
      border: 1px solid var(--vscode-widget-border, transparent);
      padding: 4px 8px; border-radius: 4px; cursor: pointer; opacity: 0.8;
    }
    #dac-open-browser:hover { opacity: 1; background: var(--vscode-button-secondaryHoverBackground, rgba(127,127,127,0.25)); }
  </style>
  <title>DAC Preview</title>
  <script nonce="${nonce}">
    // Register a pass-through Trusted Types policy before the bundle loads so
    // dac's Shiki HTML is accepted; done inline as ES imports evaluate too late.
    try {
      if (window.trustedTypes && !window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy("default", {
          createHTML: function (s) { return s; },
          createScript: function (s) { return s; },
          createScriptURL: function (s) { return s; },
        });
      }
    } catch (e) {
      console.error("DAC Preview: failed to register Trusted Types policy", e);
    }

    // Inject configuration for dac's React app
    window.__DAC_API_BASE__ = ${jsLiteral(apiBase)};
    window.__DAC_INITIAL_DASHBOARD__ = ${jsLiteral(initialDashboard)};

    // The dac SPA talks to its server over HTTP, not the VS Code message
    // channel, so we're free to acquire the API here for our own controls.
    var __vscodeApi;
    try { __vscodeApi = acquireVsCodeApi(); } catch (e) { /* not in a webview */ }
    window.addEventListener("DOMContentLoaded", function () {
      var btn = document.getElementById("dac-open-browser");
      if (btn && __vscodeApi) {
        btn.addEventListener("click", function () {
          __vscodeApi.postMessage({ type: "openExternal" });
        });
      }
    });

    // Handle navigation messages from extension.
    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "navigate" || !msg.path) return;
      if (msg.smooth && msg.name) {
        smoothNavigate(msg.path, msg.name);
      } else {
        window.location.hash = msg.path;
      }
    });

    // Hide the remount flash on rename: freeze a snapshot over the panel,
    // navigate underneath, fade out once the new title paints (or on timeout).
    function smoothNavigate(path, name) {
      const root = document.getElementById("root");
      const current = root && root.firstElementChild;
      if (!current) { window.location.hash = path; return; }

      const overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;overflow:hidden;" +
        "background:var(--vscode-editor-background,#1e1e1e);" +
        "transition:opacity .2s ease;opacity:1;pointer-events:none";
      overlay.appendChild(current.cloneNode(true));
      document.body.appendChild(overlay);

      window.location.hash = path;

      const start = Date.now();
      const timer = setInterval(() => {
        const h1 = document.querySelector("#root h1");
        const ready = h1 && (h1.textContent || "").trim() === name;
        if (ready || Date.now() - start > 2500) {
          clearInterval(timer);
          overlay.style.opacity = "0";
          setTimeout(() => overlay.remove(), 220);
        }
      }, 80);
    }
  </script>
</head>
<body>
  <button id="dac-open-browser" title="Open this dashboard in your browser">
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
      <path d="M10 2h4v4" />
      <path d="M14 2 7 9" />
    </svg>
    Open in browser
  </button>
  <div id="root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
