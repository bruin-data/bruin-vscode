import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { exportQueryResults, getQueryOutput } from "../extension/commands/queryCommands";
import { getEnvListCommand } from "../extension/commands/getEnvListCommand";
import { BruinQueryOutput } from "../bruin/queryOutput";

export class QueryPreviewPanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "bruin.QueryPreviewView";
  public static _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: vscode.Uri | undefined =
    vscode.window.activeTextEditor?.document.uri;
  private environment: string = "";
  private limit: string = "";
  private context: vscode.WebviewViewResolveContext<unknown> | undefined;
  private token: vscode.CancellationToken | undefined;
  private _extensionContext: vscode.ExtensionContext | undefined;
  private disposables: vscode.Disposable[] = [];
  private static currentDates: { start?: string; end?: string } = {};

  // Maps to store queries by tab ID
  private static tabQueries: Map<string, string> = new Map();
  private static tabAssetPaths: Map<string, string> = new Map();

  // For backward compatibility
  private static lastExecutedQuery: string = "";
  private static lastAssetPath: string = "";
  private static activeTab: string = "tab-1";
  // Getter and setter for lastExecutedQuery (for backward compatibility)
  public static setLastExecutedQuery(query: string): void {
    this.lastExecutedQuery = query;
    // Also store in the default tab
    this.setTabQuery("tab-1", query);
  }

  public static getLastExecutedQuery(): string {
    return this.lastExecutedQuery;
  }
  public static setActiveTabId(tabId: string): void {
    this.activeTab = tabId;
  }
  public static getActiveTabId(): string {
    return this.activeTab;
  }

  // Methods to manage per-tab queries
  public static setTabQuery(tabId: string, query: string): void {
    this.tabQueries.set(tabId, query);
  }

  public static getTabQuery(tabId: string): string {
    return this.tabQueries.get(tabId) || this.lastExecutedQuery || "";
  }

  // Methods to manage per-tab asset paths
  public static setTabAssetPath(tabId: string, assetPath: string): void {
    this.tabAssetPaths.set(tabId, assetPath);
    if (tabId === "tab-1") {
      this.lastAssetPath = assetPath;
    }
  }

  public static getTabAssetPath(tabId: string): string {
    return this.tabAssetPaths.get(tabId) || this.lastAssetPath || "";
  }
  private async loadAndSendQueryOutput(
    environment: string,
    limit: string,
    tabId: string,
    startDate?: string,
    endDate?: string
  ) {
    startDate = startDate || QueryPreviewPanel.currentDates.start;
    endDate = endDate || QueryPreviewPanel.currentDates.end;
    console.log(
      `QueryPreviewPanel: Loading query with dates - start: ${startDate}, end: ${endDate}`
    );

    if (!this._lastRenderedDocumentUri) {
      return;
    }

    try {
      if (!this._lastRenderedDocumentUri.fsPath) {
        console.warn("No valid query was returned");
        return;
      }

      // First, set loading state for the specific tab
      QueryPreviewPanel.postMessage("query-output-message", {
        status: "loading",
        message: true,
        tabId: tabId, // Include the tab ID with the loading message
      });

      // Call getQueryOutput which now handles connection detection internally
      await getQueryOutput(
        environment,
        limit,
        this._lastRenderedDocumentUri,
        tabId,
        startDate,
        endDate
      );

      // Store the asset path for this tab
      QueryPreviewPanel.setTabAssetPath(tabId, this._lastRenderedDocumentUri.fsPath);
    } catch (error) {
      console.error("Error loading query data:", error);

      // If there's an error, explicitly send an error message with the tab ID
      QueryPreviewPanel.postMessage("query-output-message", {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to execute query",
        tabId: tabId,
      });
    }
  }
  constructor(
    private readonly _extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this._extensionContext = context;
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((event: vscode.TextEditor | undefined) => {
        if (event && event.document.uri.scheme !== "vscodebruin:panel") {
          this._lastRenderedDocumentUri = event?.document.uri;
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
    if (!QueryPreviewPanel._view) {
      console.log("View is not initialized yet");
      return;
    }
    await this.resolveWebviewView(QueryPreviewPanel._view, this.context!, this.token!);
  };

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      QueryPreviewPanel._view = webviewView;
      this.context = context;
      this.token = _token;

      if (!webviewView.webview) {
        throw new Error("Webview is undefined");
      }

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      this._setWebviewMessageListener(QueryPreviewPanel._view!.webview);

      // Reload Query data when webview becomes visible
      webviewView.onDidChangeVisibility(() => {
        if (QueryPreviewPanel._view!.visible) {
          QueryPreviewPanel._view!.webview.postMessage({
            command: "init",
            panelType: "Query Preview",
          });
          // Load environments list when panel becomes visible
          if (this._lastRenderedDocumentUri) {
            getEnvListCommand(this._lastRenderedDocumentUri);
          }
        }
      });

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
      
      // Load environments list on initial load
      if (this._lastRenderedDocumentUri) {
        getEnvListCommand(this._lastRenderedDocumentUri);
      }
    } catch (error) {
      console.error("Error loading Query Preview data:", error);
    }
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "codicon.css")
    );

    const stylesUri = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "queryPreview.css",
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
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "queryPreview.js")
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
        <link rel="stylesheet" href="${codiconsUri}">
        <title>Bruin Query Preview</title>
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
    webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "bruin.saveState":
          await this._persistState(message.payload);
          break;
        case "bruin.setActiveTabId":
          QueryPreviewPanel.setActiveTabId(message.payload.tabId);
          break;
        case "bruin.requestState":
          const state = await this._restoreState();
          webview.postMessage({
            command: "bruin.restoreState",
            payload: state,
          });
          break;

        case "bruin.getQueryOutput":
          this.environment = message.payload.environment;
          this.limit = message.payload.limit;
          const tabId = message.payload.tabId || "tab-1";
          const startDate = message.payload.startDate || "";
          const endDate = message.payload.endDate || "";
          let extractedQuery = message.payload.query || "";

          // Check if the file is an asset
          let isAsset = false;
          if (this._lastRenderedDocumentUri) {
            // Dynamically import the helper to avoid circular deps
            const { isBruinSqlAsset } = await import("../utilities/helperUtils");
            isAsset = await isBruinSqlAsset(this._lastRenderedDocumentUri.fsPath);
          }

          if (!isAsset) {
            // If no query is provided, try to get the selection or full document text
            if (!extractedQuery) {
              const editor = vscode.window.activeTextEditor;
              if (editor && editor.document.uri.fsPath === this._lastRenderedDocumentUri?.fsPath) {
                const selection = editor.selection;
                if (!selection.isEmpty) {
                  extractedQuery = editor.document.getText(selection).trim();
                } else {
                  extractedQuery = editor.document.getText().trim();
                }
              } else if (this._lastRenderedDocumentUri) {
                const doc = await vscode.workspace.openTextDocument(this._lastRenderedDocumentUri);
                extractedQuery = doc.getText().trim();
              }
            }
            if (extractedQuery) {
              QueryPreviewPanel.setTabQuery(tabId, extractedQuery);
            }
          } else {
            // For asset files, do not set or send a query, let the CLI handle it
            extractedQuery = "";
          }

          this.loadAndSendQueryOutput(this.environment, this.limit, tabId, startDate, endDate);
          console.log(
            "Received limit, tabId, and query from webview in the Query Preview panel",
            message.payload
          );
          break;
        case "bruin.clearQueryOutput":
          const tabId2 = message.payload?.tabId || null;
          // Send a clear message back to the webview with the specific tab ID
          QueryPreviewPanel.postMessage("query-output-clear", {
            status: "success",
            message: { tabId: tabId2 },
          });
          break;
        case "bruin.exportQueryOutput":
          const exportTabId = message.payload?.tabId || "tab-1";
          const connectionName = message.payload?.connectionName || null;
          const assetPath = QueryPreviewPanel.getTabAssetPath(exportTabId);
          if (assetPath) {
            exportQueryResults(vscode.Uri.file(assetPath), exportTabId, connectionName);
          } else if (this._lastRenderedDocumentUri) {
            exportQueryResults(this._lastRenderedDocumentUri, exportTabId, connectionName);
          }
          break;
        case "bruin.cancelQuery":
          const cancelTabId = message.payload?.tabId;
          BruinQueryOutput.cancelQuery(cancelTabId);
          break;
      }
    });
  }

  public static postMessage(
    name: string,
    data: string | { status: string; message: string | any; tabId?: string; [key: string]: any }
  ) {
    if (this._view) {
      console.log("Posting message to webview in the Query Preview panel", name, data);

      // Store dates when receiving date updates
      if (name === "update-query-dates" && typeof data === "object" && data.message) {
        const { startDate, endDate } = data.message;
        this.currentDates = {
          start: startDate || "",
          end: endDate || "",
        };
        console.log(`QueryPreviewPanel: Received dates - start: ${startDate}, end: ${endDate}`);
      }

      // Ensure the data is serializable
      const serializedData = JSON.parse(JSON.stringify(data));

      this._view.webview.postMessage({
        command: name,
        payload: serializedData,
      });
    }
  }

  // Safe method to focus the QueryPreview panel without recreating it
  public static async focusSafely(): Promise<void> {
    try {
      // Use the proper VSCode command to focus the webview view
      await vscode.commands.executeCommand(`${this.viewId}.focus`);
    } catch (error) {
      console.log("Panel not yet created, revealing panel container first");
      try {
        await vscode.commands.executeCommand('workbench.panel.QueryPreview.focus');
        console.log("Panel container focused successfully");
      } catch (fallbackError) {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          await vscode.commands.executeCommand(`${this.viewId}.focus`);
          console.log("Direct view focus successful");
        } catch (finalError) {
          console.warn("All focus methods failed:", finalError);
        }
      }
    }
  }
  private async _persistState(state: any) {
    if (!this._extensionContext) {
      throw new Error("Extension context not found");
    }
    try {
      const sanitizedState = JSON.parse(JSON.stringify(state));

      // Store query for each tab as part of the state
      if (sanitizedState.tabs && Array.isArray(sanitizedState.tabs)) {
        sanitizedState.tabs.forEach((tab: { id: string; query: string; assetPath: string }) => {
          // Add the current query from our static map to each tab's state
          tab.query = QueryPreviewPanel.getTabQuery(tab.id);
          tab.assetPath = QueryPreviewPanel.getTabAssetPath(tab.id);
        });
      }

      await this._extensionContext.globalState.update("queryPreviewState", sanitizedState);
    } catch (error) {
      console.error("Error persisting state:", error);
    }
  }

  private async _restoreState(): Promise<any> {
    if (!this._extensionContext) {
      throw new Error("Extension context not found");
    }
    try {
      const state: any = this._extensionContext.globalState.get("queryPreviewState") || null;

      // Restore queries for each tab from the state
      if (state && state.tabs && Array.isArray(state.tabs)) {
        state.tabs.forEach((tab: { id: string; query: string; assetPath: string }) => {
          if (tab.id && tab.query) {
            QueryPreviewPanel.setTabQuery(tab.id, tab.query);
          } else {
            QueryPreviewPanel.setTabQuery(tab.id, state.lastExecutedQuery || "");
          }
          if (tab.id && tab.assetPath) {
            QueryPreviewPanel.setTabAssetPath(tab.id, tab.assetPath);
          } else {
            QueryPreviewPanel.setTabAssetPath(tab.id, state.lastAssetPath || "");
          }
        });
      }

      return state;
    } catch (error) {
      console.error("Error restoring state:", error);
    }
  }

  public async initPanel(event: vscode.TextEditor | vscode.TextDocumentChangeEvent | undefined) {
    if (event) {
      this._lastRenderedDocumentUri = event.document.uri;
      await this.init();
    }
  }
}
