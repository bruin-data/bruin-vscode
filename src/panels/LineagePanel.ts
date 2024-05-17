import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { lineageCommand } from "../extension/commands/lineageCommand";
import { Uri } from "vscode";
import { flowLineageCommand } from "../extension/commands/FlowLineageCommand";

export class LineagePanel implements vscode.WebviewViewProvider {
  public static readonly viewId = "lineageView";
  public static _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: Uri | undefined;

  constructor(private readonly _extensionUri: vscode.Uri) {
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {

    LineagePanel._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._setWebviewMessageListener(LineagePanel._view!.webview);
    setTimeout(() => {
      LineagePanel._view?.webview.postMessage({command: "init", panelType: "Lineage" });
    }, 100);

    webviewView.onDidDispose(() => {
      console.log("Lineage panel disposed");
      LineagePanel._view = undefined;
    });
    webviewView.onDidChangeVisibility(() => {
      if (LineagePanel._view!.visible) {
        LineagePanel._view?.webview.postMessage({command: "init", panelType: "Lineage" });
      }
    });

    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && LineagePanel._view!.visible ) {
        this._lastRenderedDocumentUri = editor.document.uri;
          flowLineageCommand(this._lastRenderedDocumentUri);
      }
    });

    vscode.workspace.onDidChangeTextDocument((event) => {
      if (this._lastRenderedDocumentUri?.toString() === event.document.uri.toString() && LineagePanel._view!.visible) {
          flowLineageCommand(this._lastRenderedDocumentUri);
      }
    }
    );

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
        case "bruin.assetGraphLineage":
          console.log("Asset Lineage from webview in the Lineage panel, well received");
          this._lastRenderedDocumentUri = vscode.window.activeTextEditor?.document.uri;
          if (!this._lastRenderedDocumentUri) {
            console.debug("No active document found.");
            return;
          }
          flowLineageCommand(this._lastRenderedDocumentUri);
          break;
      }
    });
  }

  public static postMessage(
    name: string,
    data: string | { status: string; message: string | any },
  ) {
    if (this._view) {
      console.log("Posting message to webview in the Lineage panel", name, data);
      this._view.webview.postMessage({
          command: name,
          payload: data,
        });
    }
  }

}
