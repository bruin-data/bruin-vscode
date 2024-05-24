import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { flowLineageCommand } from "../extension/commands/FlowLineageCommand";


export class LineagePanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "lineageView";
  public static _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: vscode.Uri | undefined;

  private context: vscode.WebviewViewResolveContext<unknown> | undefined;
  private token: vscode.CancellationToken | undefined;

  private disposables: vscode.Disposable[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
        this._lastRenderedDocumentUri = event?.document.uri;
        flowLineageCommand(this._lastRenderedDocumentUri);
        this.initPanel(event);
      }),
    );
  }

  dispose() {
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private init = async () => {
    await this.resolveWebviewView(LineagePanel._view!, this.context!, this.token!);
  };

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    LineagePanel._view = webviewView;
    this.context = context;
    this.token = _token;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._setWebviewMessageListener(LineagePanel._view!.webview);

    setTimeout(() => {
      LineagePanel._view?.webview.postMessage({ command: "init", panelType: "Lineage" });
    }, 100);

    webviewView.onDidChangeVisibility(() => {
      if (LineagePanel._view!.visible) {
        LineagePanel._view?.webview.postMessage({ command: "init", panelType: "Lineage" });
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
        case "bruin.assetGraphLineage":
          console.log("Asset Lineage from webview in the Lineage panel, well received");
          this._lastRenderedDocumentUri = vscode.window.activeTextEditor?.document.uri;
          if (!this._lastRenderedDocumentUri) {
            console.debug("No active document found.");
            return;
          }
          flowLineageCommand(this._lastRenderedDocumentUri);

          break;
        case "bruin.refreshGraphLineage":
            flowLineageCommand(this._lastRenderedDocumentUri);
            this.initPanel(vscode.window.activeTextEditor);
          break;
      }
    });
  }

  public static postMessage(
    name: string,
    data: string | { status: string; message: string | any }
  ) {
    if (this._view) {
      console.log("Posting message to webview in the Lineage panel", name, data);
      this._view.webview.postMessage({
        command: name,
        payload: data,
      });
    }
  }

  public initPanel(event: vscode.TextEditor | vscode.TextDocumentChangeEvent | undefined) {
    if (event === undefined) {
      return;
    }
    if (!LineagePanel._view?.visible) {
      return;
    }

    this.init();
  }
}
