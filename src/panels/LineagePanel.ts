import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { flowLineageCommand } from "../extension/commands/FlowLineageCommand";

export class LineagePanel implements vscode.WebviewViewProvider, vscode.Disposable {
  private static instance: LineagePanel;
  private _lineageData: any = null;
  private _listeners: Array<(data: any) => void> = [];

  private constructor() {}

  public static getInstance(): LineagePanel {
    if (!LineagePanel.instance) {
      LineagePanel.instance = new LineagePanel();
    }
    return LineagePanel.instance;
  }

  public setLineageData(data: any) {
    this._lineageData = data;
    this._notifyListeners();
  }

  public getLineageData(): any {
    return this._lineageData;
  }

  public addListener(listener: (data: any) => void) {
    this._listeners.push(listener);
  }

  public removeListener(listener: (data: any) => void) {

    this._listeners = this._listeners.filter(l => l !== listener);
  }

  private _notifyListeners() {
    for (const listener of this._listeners) {
      listener(this._lineageData);
    }
  }
  // Satisfy WebviewViewProvider interface
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<any>,
    token: vscode.CancellationToken
  ): void {
    // No-op: This singleton does not provide a webview
  }

  // Satisfy Disposable interface
  public dispose(): void {
    // No-op: No resources to dispose
  }
}

// Base abstract class for lineage panels
export abstract class BaseLineagePanel implements vscode.WebviewViewProvider, vscode.Disposable {
  protected _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: vscode.Uri | undefined =
    vscode.window.activeTextEditor?.document.uri;
  private context: vscode.WebviewViewResolveContext<unknown> | undefined;
  private token: vscode.CancellationToken | undefined;
  protected dataStore = LineagePanel.getInstance();
  protected panelType: string;

  private disposables: vscode.Disposable[] = [];
  private isRefreshing = false;

  constructor(
    protected readonly _extensionUri: vscode.Uri, 
    panelType: string
  ) {
    this.panelType = panelType;
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
        if (event && event.document.uri.scheme !== "vscodebruin:panel") {
          this._lastRenderedDocumentUri = event?.document.uri;
          this.loadLineageData();
          this.initPanel(event);
        }
      })
    );

    // Listen for data updates
    this.dataStore.addListener((data) => {
      this.onDataUpdated(data);
    });
  }

  dispose() {
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  protected loadLineageData = async () => {
    if (this._lastRenderedDocumentUri) {
      try {
        await flowLineageCommand(this._lastRenderedDocumentUri);
      } catch (error) {
        console.error("Error loading lineage data:", error);
      }
    }
  };

  private refresh = (event: vscode.TextEditor) => {
    if (event.document.uri === this._lastRenderedDocumentUri && !this.isRefreshing) {
      this.isRefreshing = true;
      this.initPanel(event).then(() => {
        this.isRefreshing = false;
      });
    }
  };

  private init = async () => {
    if (!this._view) {
      console.log("View is not initialized yet");
      return;
    }
    await this.resolveWebviewView(this._view, this.context!, this.token!);
  };

  protected onDataUpdated(data: any) {
    if (this._view && this._view.visible) {
      this._view.webview.postMessage({
        command: "flow-lineage-message",
        payload: data,
        panelType: this.panelType
      });
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      this._view = webviewView;
      this.context = context;
      this.token = _token;

      if (!webviewView.webview) {
        throw new Error("Webview is undefined");
      }

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      this._setWebviewMessageListener(webviewView.webview);

      setTimeout(() => {
        if (this._view && this._view.visible) {
          this._view.webview.postMessage({ command: "init", panelType: this.panelType });
          this.loadLineageData(); // Ensure lineage data is reloaded when the panel becomes visible
        }
      }, 100);

      // Reload lineage data when webview becomes visible
      webviewView.onDidChangeVisibility(() => {
        if (this._view!.visible) {
          this._view!.webview.postMessage({ command: "init", panelType: this.panelType });
          this.loadLineageData(); // Load lineage data when visible
        }
      });

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
    } catch (error) {
      console.error("Error loading lineage data:", error);
    }
  }

  protected abstract getComponentName(): string;

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
    const componentName = this.getComponentName();

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
        <title>Bruin Lineage - ${this.panelType}</title>
      </head>
  
      <body>
        <div id="app" data-component="${componentName}"></div>
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
    webview.postMessage({
      command: "init",
      panelType: this.panelType
    });
  }

  public postMessage(
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

// Asset Lineage Panel
export class AssetLineagePanel extends BaseLineagePanel {
  public static readonly viewId = "bruin.assetLineageView";

  constructor(extensionUri: vscode.Uri) {
    super(extensionUri, "AssetLineage");
  }

  protected getComponentName(): string {
    return "AssetLineageFlow";
  }
}

// This function is called from the extension command to update lineage data
export function updateLineageData(data: any) {
  const dataStore = LineagePanel.getInstance();
  dataStore.setLineageData(data);
}
