import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { TableDiffDataProvider } from "../providers/TableDiffDataProvider";
import { BruinTableDiff } from "../bruin/bruinTableDiff";

export class TableDiffPanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "bruin.tableDiffView";
  public static _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: vscode.Uri | undefined =
    vscode.window.activeTextEditor?.document.uri;
  private context: vscode.WebviewViewResolveContext<unknown> | undefined;
  private token: vscode.CancellationToken | undefined;
  private _extensionContext: vscode.ExtensionContext | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    private readonly dataProvider?: TableDiffDataProvider
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
    if (!TableDiffPanel._view) {
      return;
    }
    await this.resolveWebviewView(TableDiffPanel._view, this.context!, this.token!);
  };

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      console.log('TableDiffPanel: resolveWebviewView called');
      
      TableDiffPanel._view = webviewView;
      this.context = context;
      this.token = _token;

      if (!webviewView.webview) {
        throw new Error("Webview is undefined");
      }

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      console.log('TableDiffPanel: Setting up message listener');
      this._setWebviewMessageListener(TableDiffPanel._view!.webview);

      // Reload data when webview becomes visible
      webviewView.onDidChangeVisibility(() => {
        if (TableDiffPanel._view!.visible) {
          TableDiffPanel._view!.webview.postMessage({
            command: "init",
            panelType: "Table Diff",
          });
        }
      });

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
      
      // Send initial init message
      setTimeout(() => {
        if (TableDiffPanel._view && TableDiffPanel._view.visible) {
          TableDiffPanel._view.webview.postMessage({
            command: "init",
            panelType: "Table Diff",
          });
        }
      }, 100);
    } catch (error) {
      console.error("Error loading Table Diff data:", error);
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
      "tableDiff.css",
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
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "tableDiff.js")
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
        <title>Bruin Table Diff</title>
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
      console.log('TableDiffPanel: Received message:', message);
      
      switch (message.command) {
        case "bruin.compareTables":
          // Handle table comparison request
          console.log('TableDiffPanel: Handling bruin.compareTables');
          await this.handleCompareTables(message.payload);
          break;
        case "bruin.clearDiff":
          // Handle clearing diff results
          TableDiffPanel.postMessage("table-diff-clear", {
            status: "success",
            message: "Diff cleared",
          });
          break;
        case "bruin.getConnections":
          // Handle request for connections list
          console.log('TableDiffPanel: Handling bruin.getConnections');
          await this.handleGetConnections();
          break;
        case "bruin.getSchemas":
          // Handle request for schemas list
          console.log('TableDiffPanel: Handling bruin.getSchemas');
          await this.handleGetSchemas(message.payload);
          break;
        case "bruin.getTables":
          // Handle request for tables list
          console.log('TableDiffPanel: Handling bruin.getTables');
          await this.handleGetTables(message.payload);
          break;
        default:
          console.log('TableDiffPanel: Unknown command:', message.command);
      }
    });
  }

  public static postMessage(
    name: string,
    data: string | { status: string; message: string | any; [key: string]: any }
  ) {
    if (this._view) {
      // Ensure the data is serializable
      const serializedData = JSON.parse(JSON.stringify(data));

      this._view.webview.postMessage({
        command: name,
        payload: serializedData,
      });
    }
  }

  // Safe method to focus the TableDiff panel without recreating it
  public static async focusSafely(): Promise<void> {
    try {
      // Use the proper VSCode command to focus the webview view
      await vscode.commands.executeCommand(`${this.viewId}.focus`);
    } catch (error) {
      try {
        await vscode.commands.executeCommand('workbench.panel.tableDiff.focus');
      } catch (fallbackError) {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          await vscode.commands.executeCommand(`${this.viewId}.focus`);
        } catch (finalError) {
          console.error("All focus methods failed:", finalError);
        }
      }
    }
  }

  public async initPanel(event: vscode.TextEditor | vscode.TextDocumentChangeEvent | undefined) {
    if (event) {
      this._lastRenderedDocumentUri = event.document.uri;
      await this.init();
    }
  }

  private async handleGetConnections() {
    try {
      console.log('TableDiffPanel: handleGetConnections called');
      
      if (!this.dataProvider) {
        throw new Error("Data provider not available");
      }
      
      console.log('TableDiffPanel: calling dataProvider.getConnectionsList()');
      const connections = await this.dataProvider.getConnectionsList();
      console.log('TableDiffPanel: connections retrieved:', connections);
      
      const response = {
        status: "success",
        message: "Connections loaded successfully",
        connections: connections.map(conn => ({
          name: conn.name,
          type: conn.type,
          environment: conn.environment
        }))
      };
      
      console.log('TableDiffPanel: sending connections-data response:', response);
      TableDiffPanel.postMessage("connections-data", response);
    } catch (error) {
      console.error('TableDiffPanel: Error in handleGetConnections:', error);
      TableDiffPanel.postMessage("connections-data", {
        status: "error",
        message: `Failed to load connections: ${error}`
      });
    }
  }

  private async handleGetSchemas(payload: { connectionName: string, environment?: string }) {
    try {
      console.log('TableDiffPanel: handleGetSchemas called with payload:', payload);
      
      if (!this.dataProvider) {
        throw new Error("Data provider not available");
      }
      
      const schemas = await this.dataProvider.getSchemasList(payload.connectionName, payload.environment);
      console.log('TableDiffPanel: schemas retrieved:', schemas);
      
      TableDiffPanel.postMessage("schemas-data", {
        status: "success",
        message: "Schemas loaded successfully",
        connectionName: payload.connectionName,
        schemas: schemas
      });
    } catch (error) {
      console.error('TableDiffPanel: Error in handleGetSchemas:', error);
      TableDiffPanel.postMessage("schemas-data", {
        status: "error",
        message: `Failed to load schemas: ${error}`,
        connectionName: payload.connectionName
      });
    }
  }

  private async handleGetTables(payload: { connectionName: string, schemaName: string, environment?: string }) {
    try {
      console.log('TableDiffPanel: handleGetTables called with payload:', payload);
      
      if (!this.dataProvider) {
        throw new Error("Data provider not available");
      }
      
      const tables = await this.dataProvider.getTablesList(payload.connectionName, payload.schemaName, payload.environment);
      console.log('TableDiffPanel: tables retrieved:', tables);
      
      TableDiffPanel.postMessage("tables-data", {
        status: "success",
        message: "Tables loaded successfully",
        connectionName: payload.connectionName,
        schemaName: payload.schemaName,
        tables: tables
      });
    } catch (error) {
      console.error('TableDiffPanel: Error in handleGetTables:', error);
      TableDiffPanel.postMessage("tables-data", {
        status: "error",
        message: `Failed to load tables: ${error}`,
        connectionName: payload.connectionName,
        schemaName: payload.schemaName
      });
    }
  }

  private async handleCompareTables(payload: {
    source: { connection: string, schema: string, table: string },
    target: { connection: string, schema: string, table: string }
  }) {
    try {
      console.log('TableDiffPanel: handleCompareTables called with payload:', payload);
      
      // Send loading state to UI
      TableDiffPanel.postMessage("table-diff-result", {
        status: "loading",
        message: "Comparing tables..."
      });

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) {
        throw new Error("Workspace folder not found");
      }

      // Create BruinTableDiff instance
      const tableDiff = new BruinTableDiff("bruin", workspaceFolder);

      // Format table references as schema.table
      const sourceTable = `${payload.source.schema}.${payload.source.table}`;
      const targetTable = `${payload.target.schema}.${payload.target.table}`;

      // Use source connection for now (could be enhanced to support cross-connection diffs)
      const connectionName = payload.source.connection;

      // Get environment from source connection
      const sourceConnection = await this.getConnectionEnvironment(payload.source.connection);

      console.log(`TableDiffPanel: Executing table diff: ${sourceTable} vs ${targetTable} on connection ${connectionName}`);

      // Execute the table diff command
      const result = await tableDiff.compareTables(
        connectionName,
        sourceTable,
        targetTable,
        sourceConnection?.environment
      );

      console.log('TableDiffPanel: Table diff completed successfully');

      // Send results to UI
      TableDiffPanel.postMessage("table-diff-result", {
        status: "success",
        message: "Table comparison completed",
        result: result
      });

    } catch (error) {
      console.error('TableDiffPanel: Error in handleCompareTables:', error);
      TableDiffPanel.postMessage("table-diff-result", {
        status: "error",
        message: `Table comparison failed: ${error}`
      });
    }
  }

  private async getConnectionEnvironment(connectionName: string) {
    if (!this.dataProvider) {
      return null;
    }
    
    const connections = await this.dataProvider.getConnectionsList();
    return connections.find(conn => conn.name === connectionName);
  }
}