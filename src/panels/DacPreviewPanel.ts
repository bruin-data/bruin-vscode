import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { DacServe } from "../bruin/dacServe";
import { getNonce } from "../utilities/getNonce";

/**
 * Reads the top-level `name:` field from a dashboard YAML file. Returns the
 * raw string (unquoted) or undefined if the file isn't readable / doesn't have
 * one. Deliberately regex-based — adding a full YAML parser dep for a POC is
 * overkill, and dac's dashboard files put `name:` near the top.
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
  // Top-level (no indentation) `name:` mapping. Match the first occurrence so
  // we don't pick up `name:` fields nested under filters/widgets/etc.
  const match = text.match(/^name:\s*(.+?)\s*$/m);
  if (!match) {
    return undefined;
  }
  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value || undefined;
}

/**
 * Proof-of-concept panel that spawns `dac serve` and embeds the resulting web
 * UI in a VS Code webview iframe. Modeled after QueryPreviewPanel, but uses a
 * standalone WebviewPanel (not a sidebar view) and owns the lifecycle of the
 * child dac process.
 */
export class DacPreviewPanel {
  public static readonly viewType = "bruin.dacPreview";
  private static output: vscode.OutputChannel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly server: DacServe;
  private readonly dashboardDir: string;
  private readonly disposables: vscode.Disposable[] = [];
  private currentUrl: string;
  private disposed: boolean = false;

  private constructor(
    panel: vscode.WebviewPanel,
    server: DacServe,
    initialUrl: string,
    dashboardDir: string
  ) {
    this.panel = panel;
    this.server = server;
    this.currentUrl = initialUrl;
    this.dashboardDir = dashboardDir;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Switch the iframe when the user activates a different dashboard YAML
    // inside the dashboard directory. dac is already serving that directory,
    // so we just re-point the iframe at the new /d/<name>.
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor) {
          return;
        }
        const fsPath = editor.document.uri.fsPath;
        if (!this.isInDashboardDir(fsPath)) {
          return;
        }
        const name = readDashboardName(fsPath);
        if (!name) {
          return;
        }
        const newUrl = `${this.server.url}/d/${encodeURIComponent(name)}`;
        if (newUrl === this.currentUrl) {
          return;
        }
        this.currentUrl = newUrl;
        DacPreviewPanel.getOutput().appendLine(`[dac] navigating preview to: ${name}`);
        this.panel.webview.postMessage({ type: "navigate", url: newUrl });
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

  private static templateForCurrentTheme(): string {
    const kind = vscode.window.activeColorTheme.kind;
    const isDark =
      kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
    return isDark ? "bruin-dark" : "bruin";
  }

  /**
   * Opens (or focuses) the preview panel for the given dashboard file.
   */
  public static async open(documentUri: vscode.Uri): Promise<void> {
    const dashboardDir = path.dirname(documentUri.fsPath);
    const output = DacPreviewPanel.getOutput();

    const panel = vscode.window.createWebviewPanel(
      DacPreviewPanel.viewType,
      `DAC Preview: ${path.basename(documentUri.fsPath)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = DacPreviewPanel.loadingHtml(panel.webview, "Starting dac serve…");

    try {
      const port = await DacServe.findFreePort();
      const template = DacPreviewPanel.templateForCurrentTheme();
      const server = new DacServe(dashboardDir, port, output, template);
      await server.start();

      const dashboardName = readDashboardName(documentUri.fsPath);
      const initialUrl = dashboardName
        ? `${server.url}/d/${encodeURIComponent(dashboardName)}`
        : server.url;
      if (dashboardName) {
        output.appendLine(`[dac] deep-linking to dashboard: ${dashboardName}`);
      }

      const preview = new DacPreviewPanel(panel, server, initialUrl, dashboardDir);
      panel.webview.html = preview.renderHtml();
      void preview;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      output.appendLine(`[dac] failed to start: ${message}`);
      panel.webview.html = DacPreviewPanel.loadingHtml(
        panel.webview,
        `Failed to start dac serve: ${escapeHtml(message)}`
      );
      vscode.window.showErrorMessage(`Bruin: Failed to start dac serve — ${message}`);
    }
  }

  private dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.server.stop();
  }

  private renderHtml(): string {
    const nonce = getNonce();
    const url = this.currentUrl;
    const cspSource = this.panel.webview.cspSource;
    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      style-src ${cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}';
      frame-src http://localhost:* http://127.0.0.1:*;
  " />
  <style nonce="${nonce}">
    html, body {
      margin: 0; padding: 0; height: 100%;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    iframe {
      width: 100%; height: 100vh; border: 0;
      background: var(--vscode-editor-background);
    }
  </style>
  <title>DAC Preview</title>
</head>
<body>
  <iframe id="dac" src="${escapeHtml(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
  <script nonce="${nonce}">
    const iframe = document.getElementById("dac");
    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (msg && msg.type === "navigate" && typeof msg.url === "string") {
        iframe.src = msg.url;
      }
    });
  </script>
</body>
</html>`;
  }

  private static loadingHtml(webview: vscode.Webview, message: string): string {
    const nonce = getNonce();
    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      style-src ${webview.cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}';
  " />
  <style nonce="${nonce}">
    body {
      font: 13px var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
    }
  </style>
</head>
<body>
  <p>${escapeHtml(message)}</p>
</body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}
