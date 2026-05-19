import * as path from "path";
import * as vscode from "vscode";
import { DacServe } from "../bruin/dacServe";
import { getNonce } from "../utilities/getNonce";

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
  private disposed: boolean = false;

  private constructor(panel: vscode.WebviewPanel, server: DacServe, dashboardDir: string) {
    this.panel = panel;
    this.server = server;
    this.dashboardDir = dashboardDir;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    // Live-reload is handled by dac's own websocket from inside the iframe so
    // that the current dashboard route is preserved. The webview parent does
    // not drive reloads — see commit history for the previous save-based path.
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

      const preview = new DacPreviewPanel(panel, server, dashboardDir);
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
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  private renderHtml(): string {
    const nonce = getNonce();
    const url = this.server.url;
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
