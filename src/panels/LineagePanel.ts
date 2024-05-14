import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { lineageCommand } from "../extension/commands/lineageCommand";
import { Uri } from "vscode";

export class LineagePanel implements vscode.WebviewViewProvider {
  public static readonly viewId = "lineageView";
  public static currentPanel: LineagePanel | undefined;
  private _view?: vscode.WebviewView;
  private _lastRenderedDocumentUri: Uri | undefined;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._setWebviewMessageListener(this._view!.webview);
    setTimeout(() => {
      this.postMessage({ command: "init", panelType: "lineage" });
    }, 100);

    webviewView.onDidDispose(() => {
      this._view = undefined;
    });
    webviewView.onDidChangeVisibility(() => {
      if (this._view!.visible) {
        this.postMessage({ command: "init", panelType: "lineage" });
      }
    });

    webviewView.webview.html = this._getWebviewContent(webviewView.webview);
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const stylesUri = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "index.js")
    );

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};">
        <link rel="stylesheet" href="${stylesUri}">
        <title>Bruin Lineage</title>
      </head>
      <body>
        <div id="app"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }
  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "bruin.pipelineLineage":
          console.log("Pipeline Lineage from webview in the Lineage panel, well received");
          break;
        case "bruin.assetLineage":
          console.log("Asset Lineage from webview in the Lineage panel, well received");
          this._lastRenderedDocumentUri = vscode.window.activeTextEditor?.document.uri;
          if (!this._lastRenderedDocumentUri) {
            console.debug("No active document found.");
            return;
          }
          /*  lineageCommand(this._lastRenderedDocumentUri).catch((error) => {
            console.error("Error displaying lineage", error);          }); */
          this.postMessage({
            command: "lineage-message",
            status: "error",
            message: "Error displaying lineage",
          });
      }
    });
  }

  public postMessage(message: any) {
    if (this._view && this._view.webview) {
      this._view.webview.postMessage(message);
    } else {
      console.error("Webview is not initialized when trying to post message");
    }
  }
}
