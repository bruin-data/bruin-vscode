import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { flowLineageCommand } from "../extension/commands/FlowLineageCommand";

export class LineagePanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "bruin.lineageView";
  public static _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: vscode.Uri | undefined =
    vscode.window.activeTextEditor?.document.uri;
  private context: vscode.WebviewViewResolveContext<unknown> | undefined;
  private token: vscode.CancellationToken | undefined;

  private disposables: vscode.Disposable[] = [];
  private isRefreshing = false;

  private async loadAndSendLineageData() {
    if (this._lastRenderedDocumentUri) {
      try {
        await flowLineageCommand(this._lastRenderedDocumentUri);
      } catch (error) {
        console.error("Error loading lineage data:", error);
      }
    }
  }

  private refresh = (event: vscode.TextEditor) => {
    if (event.document.uri === this._lastRenderedDocumentUri && !this.isRefreshing) {
      this.isRefreshing = true;
      this.initPanel(event).then(() => {
        this.isRefreshing = false;
      });
    }
  };

  constructor(private readonly _extensionUri: vscode.Uri) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
        if (event && event.document.uri.scheme !== "vscodebruin:panel") {
          this._lastRenderedDocumentUri = event?.document.uri;
          flowLineageCommand(this._lastRenderedDocumentUri);
          this.initPanel(event);
        }
      })
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
    if (!LineagePanel._view) {
      console.log("View is not initialized yet");
      return;
    }
    await this.resolveWebviewView(LineagePanel._view, this.context!, this.token!);
  };

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      LineagePanel._view = webviewView;
      this.context = context;
      this.token = _token;

      if (!webviewView.webview) {
        throw new Error("Webview is undefined");
      }

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      this._setWebviewMessageListener(LineagePanel._view!.webview);
      this.loadAndSendLineageData(); // Load lineage data when view is resolved

      setTimeout(() => {
        if (LineagePanel._view && LineagePanel._view.visible) {
          LineagePanel._view.webview.postMessage({ command: "init", panelType: "Lineage" });
          this.loadAndSendLineageData(); // Ensure lineage data is reloaded when the panel becomes visible
        }
      }, 100);

      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        if (editors.some((editor) => editor.viewColumn === vscode.ViewColumn.Active)) {
          webviewView.webview.postMessage({ command: "init", panelType: "Lineage" });
          this.loadAndSendLineageData(); // Load lineage data when panel becomes visible
        }
      });
      // Reload lineage data when webview becomes visible
      webviewView.onDidChangeVisibility(() => {
        if (LineagePanel._view!.visible) {
          LineagePanel._view!.webview.postMessage({ command: "init", panelType: "Lineage" });
          this.loadAndSendLineageData(); // Load lineage data when visible
        }
      });

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
    } catch (error) {
      console.error("Error loading lineage data:", error);
    }
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const stylesUri = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "lineage.css",
    ]);
    const stylesUriCustomElt = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "custom-elements.css",
    ]);
    const stylesUriIndex = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "index.css",
    ]);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "lineage.js")
    );
    const scriptUriCustomElt = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "custom-elements.js")
    );

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="
            default-src 'none';
            img-src ${webview.cspSource} https:;
            script-src 'nonce-${nonce}' ${webview.cspSource} https://cdn.rudderlabs.com/ https://cdn.rudderstack.com/ https://api.rudderstack.com;
            connect-src https://api.rudderstack.com https://getbruinbumlky.dataplane.rudderstack.com;
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
         ">      
        <link rel="stylesheet" href="${stylesUri}">
        <link rel="stylesheet" href="${stylesUriCustomElt}">
        <link rel="stylesheet" href="${stylesUriIndex}">
        <title>Bruin Lineage</title>
      </head>
  
      <body>
        <div id="app"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}">
                window.onerror = function(message, source, lineno, colno, error) {
                console.error('Webview error:', message, 'at line:', lineno, 'source:', source, 'error:', error);
              };
          </script>
          <script type="module" nonce="${nonce}" src="${scriptUriCustomElt}">
                window.onerror = function(message, source, lineno, colno, error) {
                console.error('Webview error:', message, 'at line:', lineno, 'source:', source, 'error:', error);
              };
          </script>
        </body>
      </html>
    `;
  }
  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "bruin.openAssetDetails":
          const assetFilePath = message.payload;
          vscode.workspace.openTextDocument(vscode.Uri.file(assetFilePath)).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
          break;
        case "bruin.assetGraphLineage":
          this._lastRenderedDocumentUri = vscode.window.activeTextEditor?.document.uri;
          if (!this._lastRenderedDocumentUri) {
            console.debug("No active document found.");
            return;
          }
          this.refresh(vscode.window.activeTextEditor!!);
          break;
      }
    });
  }

  public static postMessage(
    name: string,
    data: string | { status: string; message: string | any }
  ) {
    if (this._view) {

      this._view.webview.postMessage({
        command: name,
        payload: data,
      });
    }
  }

  public async initPanel(event: vscode.TextEditor | vscode.TextDocumentChangeEvent | undefined) {
    if (event) {
      this._lastRenderedDocumentUri = event.document.uri;
      await this.init();
    }
  }
}
