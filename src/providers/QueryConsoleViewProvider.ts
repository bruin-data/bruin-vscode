import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { BruinConnections } from "../bruin/bruinConnections";
import { BruinQueryOutput } from "../bruin/queryOutput";
import { getEnvListCommand } from "../extension/commands/getEnvListCommand";
import { getBruinExecutablePath } from "./BruinExecutableService";
import { ActivityBarConnectionsProvider } from "./ActivityBarConnectionsProvider";
import { trackEvent } from "../extension/extension";
import { getQueryTimeout } from "../extension/configuration";
import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";

export class QueryConsoleViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "bruin.queryConsoleView";
  public static _view?: vscode.WebviewView | undefined;
  private _extensionContext: vscode.ExtensionContext | undefined;
  private disposables: vscode.Disposable[] = [];
  private bruinConnections: BruinConnections;
  private currentQuery: string = "";
  private currentConnection: string = "";
  private currentEnvironment: string = "";

  constructor(
    private readonly _extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    private activityBarConnectionsProvider: ActivityBarConnectionsProvider
  ) {
    this._extensionContext = context;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    this.bruinConnections = new BruinConnections(getBruinExecutablePath(), workspaceFolder);
  }

  dispose() {
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      QueryConsoleViewProvider._view = webviewView;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);

      // Set up message listener for webview actions
      webviewView.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "getConnections":
              trackEvent("Command Executed", { command: "queryConsole.getConnections", source: "extension" });
              await this.sendConnections();
              break;
            case "getEnvironments":
              trackEvent("Command Executed", { command: "queryConsole.getEnvironments", source: "extension" });
              await this.sendEnvironments();
              break;
            case "executeQuery":
              trackEvent("Command Executed", { command: "queryConsole.executeQuery", source: "extension" });
              await this.executeQuery(
                message.query,
                message.connectionName,
                message.environment,
                message.limit
              );
              break;
            case "cancelQuery":
              trackEvent("Command Executed", { command: "queryConsole.cancelQuery", source: "extension" });
              BruinQueryOutput.cancelQuery("query-console");
              this.postMessage("query-cancelled", { status: "cancelled" });
              break;
            case "insertTable":
              // Handle table insertion from drag-and-drop
              trackEvent("Command Executed", { command: "queryConsole.insertTable", source: "extension" });
              break;
            case "saveState":
              await this.persistState(message.payload);
              break;
            case "getState":
              await this.restoreState();
              break;
          }
        },
        undefined,
        this.disposables
      );

      // Restore state when view becomes visible
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) {
          this.restoreState();
        }
      });

    } catch (error) {
      console.error("Error resolving webview view:", error);
    }
  }

  private async sendConnections() {
    try {
      const connections = await this.bruinConnections.getConnectionsForActivityBar();
      this.postMessage("connections-loaded", {
        status: "success",
        connections: connections || [],
      });
    } catch (error) {
      console.error("Error loading connections:", error);
      this.postMessage("connections-loaded", {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load connections",
        connections: [],
      });
    }
  }

  private async sendEnvironments() {
    try {
      const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!workspaceUri) {
        this.postMessage("environments-loaded", {
          status: "error",
          message: "No workspace folder found",
          environments: [],
        });
        return;
      }

      const envList = await getEnvListCommand(workspaceUri);
      this.postMessage("environments-loaded", {
        status: "success",
        environments: envList,
      });
    } catch (error) {
      console.error("Error loading environments:", error);
      this.postMessage("environments-loaded", {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to load environments",
        environments: [],
      });
    }
  }

  private async executeQuery(
    query: string,
    connectionName: string,
    environment: string,
    limit: string
  ) {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) {
        this.postMessage("query-result", {
          status: "error",
          message: "No workspace folder found",
        });
        return;
      }

      // Generate a unique tab ID for console queries
      const tabId = `console-${Date.now()}`;

      // Store the query in QueryPreviewPanel for this tab
      QueryPreviewPanel.setTabQuery(tabId, query);
      QueryPreviewPanel.setActiveTabId(tabId);

      // Focus the Query Preview panel first
      await QueryPreviewPanel.focusSafely();

      // Small delay to ensure panel is ready to receive messages
      await new Promise(resolve => setTimeout(resolve, 150));

      // Send message to create new tab and execute query
      QueryPreviewPanel.postMessage("console-query-execute", {
        status: "loading",
        message: {
          tabId: tabId,
          query: query,
          connectionName: connectionName,
          environment: environment,
          limit: limit,
        },
        tabId: tabId,
      });

      // Notify webview that query is being sent to preview panel
      this.postMessage("query-sent", {
        status: "success",
        message: "Query sent to Query Preview panel",
        tabId: tabId,
      });

      // Execute the query using BruinQueryOutput which will send results to QueryPreviewPanel
      const timeout = getQueryTimeout();
      const queryOutput = new BruinQueryOutput(getBruinExecutablePath(), workspaceFolder);

      // Use getOutput which posts to QueryPreviewPanel
      await queryOutput.getOutput(
        environment,
        "", // No asset path for console queries
        limit,
        tabId,
        connectionName,
        undefined, // startDate
        undefined, // endDate
        { query: query, isAsset: false }
      );

    } catch (error) {
      console.error("Error executing query:", error);
      this.postMessage("query-result", {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to execute query",
      });
    }
  }

  private async persistState(state: any) {
    if (this._extensionContext) {
      await this._extensionContext.workspaceState.update("queryConsoleState", state);
    }
  }

  private async restoreState() {
    if (this._extensionContext) {
      const state = this._extensionContext.workspaceState.get("queryConsoleState");
      if (state) {
        this.postMessage("restore-state", { state });
      }
    }
  }

  public static postMessage(command: string, payload: any) {
    if (QueryConsoleViewProvider._view) {
      QueryConsoleViewProvider._view.webview.postMessage({ command, payload });
    }
  }

  private postMessage(command: string, payload: any) {
    QueryConsoleViewProvider.postMessage(command, payload);
  }

  // Method to insert table reference from drag-and-drop
  public static insertTableReference(tableName: string, schemaName: string, connectionName: string) {
    const fullTableName = schemaName ? `${schemaName}.${tableName}` : tableName;
    QueryConsoleViewProvider.postMessage("insert-table", {
      tableName: fullTableName,
      connectionName: connectionName,
    });
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const stylesUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "queryConsole.css"]);
    const scriptUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "queryConsole.js"]);
    const codiconUri = getUri(webview, this._extensionUri, ["webview-ui", "build", "assets", "codicon.css"]);

    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <link rel="stylesheet" type="text/css" href="${codiconUri}">
          <title>Query Console</title>
        </head>
        <body>
          <div id="app"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }
}
