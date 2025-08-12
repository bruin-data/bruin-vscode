import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { BruinTableDiff } from "../bruin/bruinTableDiff";
import { BruinConnections } from "../bruin/bruinConnections";
import { BruinDBTCommand } from "../bruin/bruinDBTCommand";
import { getUri } from "../utilities/getUri";

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

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    try {
      TableDiffPanel._view = webviewView;
      this.context = context;
      this.token = _token;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
      
      // Set up message listener for webview actions
      webviewView.webview.onDidReceiveMessage(
        async message => {
          switch (message.command) {
            case 'getConnections':
              await this.sendConnections();
              break;
            case 'getSchemas':
              await this.sendSchemas(message.connectionName, message.type);
              break;
            case 'getTables':
              await this.sendTables(message.connectionName, message.schemaName, message.type);
              break;
            case 'executeTableDiff':
              await this.executeDiff(
                message.sourceConnection, 
                message.sourceSchema, 
                message.sourceTable, 
                message.targetConnection, 
                message.targetSchema, 
                message.targetTable
              );
              break;
            case 'clearTableDiff':
              this.clearResults();
              break;
          }
        },
        undefined,
        this.disposables
      );
      
      // Load initial connections
      setTimeout(() => this.sendConnections(), 100);
      
    } catch (error) {
      console.error("Error loading Table Diff panel:", error);
    }
  }

  private async sendConnections() {
    if (!TableDiffPanel._view) return;

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) return;

      const bruinConnections = new BruinConnections("bruin", workspaceFolder);
      const connections = await bruinConnections.getConnectionsForActivityBar();
      
      console.log('Raw connections data:', connections);

      TableDiffPanel._view.webview.postMessage({
        command: 'updateConnections',
        connections
      });
      
      console.log('Connections sent to webview:', connections);
    } catch (error) {
      console.error('Error sending connections:', error);
    }
  }

  private async sendSchemas(connectionName: string, type: string) {
    if (!TableDiffPanel._view) return;

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) return;

      // Find the connection to get its environment
      const bruinConnections = new BruinConnections("bruin", workspaceFolder);
      const connections = await bruinConnections.getConnectionsForActivityBar();
      const connection = connections.find(conn => conn.name === connectionName);
      const environment = connection?.environment;

      const bruinDBTCommand = new BruinDBTCommand("bruin", workspaceFolder);
      const rawSchemas = await bruinDBTCommand.getFetchDatabases(connectionName, environment);
      
      console.log(`Raw schemas data for ${connectionName} (env: ${environment}):`, rawSchemas);

      // Parse the schemas similar to ActivityBarConnectionsProvider
      let schemasArray;
      if (Array.isArray(rawSchemas)) {
        schemasArray = rawSchemas;
      } else if (rawSchemas?.databases !== undefined) {
        schemasArray = rawSchemas.databases;
      } else {
        schemasArray = null;
      }

      let schemas: Array<{ name: string }> = [];
      if (schemasArray === null) {
        schemas = [];
      } else if (!Array.isArray(schemasArray)) {
        console.error("Invalid schemas format:", rawSchemas);
        schemas = [];
      } else {
        schemas = schemasArray.map((item: any) => {
          if (typeof item === "string") {
            return { name: item };
          }
          return { name: item.name || item.database_name || "Unknown Database" };
        });
      }

      console.log(`Parsed schemas for ${connectionName}:`, schemas);

      TableDiffPanel._view.webview.postMessage({
        command: 'updateSchemas',
        schemas,
        type
      });
    } catch (error) {
      console.error('Error sending schemas:', error);
      TableDiffPanel._view.webview.postMessage({
        command: 'updateSchemas',
        schemas: [],
        type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendTables(connectionName: string, schemaName: string, type: string) {
    if (!TableDiffPanel._view) return;

    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceFolder) return;

      // Find the connection to get its environment
      const bruinConnections = new BruinConnections("bruin", workspaceFolder);
      const connections = await bruinConnections.getConnectionsForActivityBar();
      const connection = connections.find(conn => conn.name === connectionName);
      const environment = connection?.environment;

      const bruinDBTCommand = new BruinDBTCommand("bruin", workspaceFolder);
      const rawTables = await bruinDBTCommand.getFetchTables(connectionName, schemaName, environment);
      
      console.log(`Raw tables data for ${connectionName}.${schemaName} (env: ${environment}):`, rawTables);

      // Parse the tables similar to ActivityBarConnectionsProvider
      const tablesArray = Array.isArray(rawTables) ? rawTables : rawTables?.tables;
      
      let tables: Array<{ name: string }> = [];
      if (!Array.isArray(tablesArray)) {
        console.error("Invalid tables format:", rawTables);
        tables = [];
      } else {
        tables = tablesArray.map((item: any) => {
          if (typeof item === "string") {
            return { name: item };
          }
          return { name: item.name || "Unknown Table" };
        });
      }

      console.log(`Parsed tables for ${connectionName}.${schemaName}:`, tables);

      TableDiffPanel._view.webview.postMessage({
        command: 'updateTables',
        tables,
        type
      });
    } catch (error) {
      console.error('Error sending tables:', error);
      TableDiffPanel._view.webview.postMessage({
        command: 'updateTables',
        tables: [],
        type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async executeDiff(
    sourceConnection: string,
    sourceSchema: string,
    sourceTable: string,
    targetConnection: string,
    targetSchema: string,
    targetTable: string
  ) {
    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Comparing Tables",
        cancellable: false
      }, async (progress) => {
        progress.report({ 
          message: `Comparing ${sourceSchema}.${sourceTable} with ${targetSchema}.${targetTable}` 
        });

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
          throw new Error("Workspace folder not found");
        }

        // Find the connection to get its environment
        const bruinConnections = new BruinConnections("bruin", workspaceFolder);
        const connections = await bruinConnections.getConnectionsForActivityBar();
        const connection = connections.find(conn => conn.name === sourceConnection);
        const environment = connection?.environment;

        const tableDiff = new BruinTableDiff("bruin", workspaceFolder);
        const sourceTableRef = `${sourceSchema}.${sourceTable}`;
        const targetTableRef = `${targetSchema}.${targetTable}`;

        const result = await tableDiff.compareTables(
          sourceConnection,
          sourceTableRef,
          targetTableRef,
          environment
        );

        const sourceInfo = `${sourceConnection}.${sourceSchema}.${sourceTable}`;
        const targetInfo = `${targetConnection}.${targetSchema}.${targetTable}`;
        
        this.showResults(sourceInfo, targetInfo, result);
      });

    } catch (error) {
      console.error('Error executing table diff:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Send error to webview
      if (TableDiffPanel._view) {
        TableDiffPanel._view.webview.postMessage({
          command: 'showResults',
          error: errorMessage,
          source: '',
          target: '',
          results: ''
        });
      }
      
      vscode.window.showErrorMessage(`Table comparison failed: ${errorMessage}`);
    }
  }

  private showResults(source: string, target: string, results: string): void {
    if (TableDiffPanel._view) {
      TableDiffPanel._view.webview.postMessage({
        command: 'showResults',
        source,
        target,
        results
      });
    }
  }

  private clearResults(): void {
    if (TableDiffPanel._view) {
      TableDiffPanel._view.webview.postMessage({
        command: 'clearResults'
      });
    }
  }

    private _getWebviewContent(webview: vscode.Webview) {
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "codicon.css")
    );
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
    const stylesUri = vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "tableDiff.css");
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
            script-src 'nonce-${nonce}' ${webview.cspSource};
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
         ">
        <link rel="stylesheet" href="${codiconsUri}">
        <link rel="stylesheet" href="${stylesUri}">
        <link rel="stylesheet" href="${stylesUriCustomElt}">
        <link rel="stylesheet" href="${stylesUriIndex}">
        <title>Table Diff</title>
      </head>
      <body>
        <div id="app"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}">
          window.onerror = function(message, source, lineno, colno, error) {
            console.error('Webview error:', message, 'at line:', lineno, 'source:', source, 'error:', error);
          };
        </script>
        <script type="module" nonce="${nonce}" src="${scriptUriCustomElt}"></script>
      </body>
      </html>
    `;
  }

  // Safe method to focus the TableDiff panel
  public static async focusSafely(): Promise<void> {
    try {
      await vscode.commands.executeCommand(`${this.viewId}.focus`);
    } catch (error) {
      console.error("Error focusing table diff panel:", error);
    }
  }

  // Legacy methods for compatibility - now just proxy to the new implementation
  public static showResults(source: string, target: string, results: string): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'showResults',
        source,
        target,
        results
      });
    }
  }

  public static clearResults(): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'clearResults'
      });
    }
  }
}