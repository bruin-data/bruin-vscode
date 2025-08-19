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
              console.log('Received getTables message:', message);
              await this.sendTables(message.connectionName, message.schemaName, message.type);
              break;
            case 'executeTableDiff':
              await this.executeDiff(
                message.sourceConnection, 
                message.sourceTable, 
                message.targetConnection, 
                message.targetTable,
                message.schemaOnly
              );
              break;
            case 'cancelTableDiff':
              BruinTableDiff.cancelDiff();
              webviewView.webview.postMessage({
                command: 'showResults',
                status: 'cancelled'
              });
              break;
            case 'clearTableDiff':
              this.clearResults();
              break;
            case 'saveState':
              await this.persistState(message.payload);
              break;
            case 'requestState':
              const state = await this.restoreState();
              webviewView.webview.postMessage({
                command: 'restoreState',
                payload: state
              });
              break;
            case 'getSchemasAndTables':
              console.log('Received getSchemasAndTables message:', message);
              await this.sendSchemasAndTables(message.connectionName, message.type);
              break;
          }
        },
        undefined,
        this.disposables
      );
      
      // Handle webview visibility changes
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) {
          // When webview becomes visible, request the frontend to restore state
          webviewView.webview.postMessage({
            command: 'init',
            panelType: 'Table Diff'
          });
        } else {
          // When webview becomes hidden, notify frontend to save state
          webviewView.webview.postMessage({
            command: 'panelHidden'
          });
        }
      });

      // Load initial connections
      setTimeout(() => this.sendConnections(), 100);
      
    } catch (error) {
      console.error("Error loading Table Diff panel:", error);
    }
  }

  private async getWorkspaceSetup() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      throw new Error("Workspace folder not found");
    }

    const bruinConnections = new BruinConnections("bruin", workspaceFolder);
    const bruinDBTCommand = new BruinDBTCommand("bruin", workspaceFolder);
    const connections = await bruinConnections.getConnectionsForActivityBar();

    return { workspaceFolder, bruinConnections, bruinDBTCommand, connections };
  }



  private parseSchemas(rawSchemas: any): string[] {
    let schemasArray;
    if (Array.isArray(rawSchemas)) {
      schemasArray = rawSchemas;
    } else if (rawSchemas?.databases !== undefined) {
      schemasArray = rawSchemas.databases;
    } else {
      schemasArray = [];
    }

    return Array.isArray(schemasArray) ? schemasArray.map((item: any) => {
      if (typeof item === "string") {
        return item;
      }
      return item.name || item.database_name || "Unknown Database";
    }) : [];
  }

  private parseTables(rawTables: any): Array<{ name: string }> {
    const tablesArray = Array.isArray(rawTables) ? rawTables : rawTables?.tables;
    
    if (!Array.isArray(tablesArray)) {
      console.error("Invalid tables format:", rawTables);
      return [];
    }

    return tablesArray.map((item: any) => {
      if (typeof item === "string") {
        return { name: item };
      }
      return { name: item.name || "Unknown Table" };
    });
  }

  private async sendConnections() {
    if (!TableDiffPanel._view) return;

    try {
      const { connections } = await this.getWorkspaceSetup();

      TableDiffPanel._view.webview.postMessage({
        command: 'updateConnections',
        connections
      });
    } catch (error) {
      console.error('Error sending connections:', error);
    }
  }

  private async sendSchemas(connectionName: string, type: string) {
    if (!TableDiffPanel._view) return;

    try {
      const { bruinDBTCommand } = await this.getWorkspaceSetup();
      
      console.log(`Fetching schemas for ${connectionName}`);
      const rawSchemas = await bruinDBTCommand.getFetchDatabases(connectionName);
      const schemaNames = this.parseSchemas(rawSchemas);
      
      const schemas = schemaNames.map(name => ({ name }));

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
      console.log(`sendTables called: connection=${connectionName}, schema=${schemaName}, type=${type}`);
      
      const { bruinDBTCommand } = await this.getWorkspaceSetup();
      
      console.log(`Fetching tables for ${connectionName}.${schemaName}`);
      const rawTables = await bruinDBTCommand.getFetchTables(connectionName, schemaName);
      console.log('Raw tables response:', rawTables);
      
      const tables = this.parseTables(rawTables);
      console.log('Parsed tables:', tables);

      console.log(`Sending updateTables message with ${tables.length} tables:`, tables);
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

  private async sendSchemasAndTables(connectionName: string, type: string) {
    if (!TableDiffPanel._view) return;
    
    console.log(`sendSchemasAndTables called with connectionName: ${connectionName}, type: ${type}`);

    try {
      const { bruinDBTCommand } = await this.getWorkspaceSetup();
      
      // Get only schemas first - this is much faster
      const rawSchemas = await bruinDBTCommand.getFetchDatabases(connectionName);
      const schemas = this.parseSchemas(rawSchemas);

      // Instead of fetching all tables, just send schema names as suggestions
      // Users can type "schema.table" format
      const schemaNames = schemas.map(schema => `${schema}.`);

      console.log(`Sending ${schemaNames.length} schema names for ${connectionName}:`, schemaNames);
      
      TableDiffPanel._view.webview.postMessage({
        command: 'updateSchemasAndTables',
        connectionName,
        tables: schemaNames,
        type
      });
    } catch (error) {
      console.error('Error sending schemas and tables:', error);
      TableDiffPanel._view.webview.postMessage({
        command: 'updateSchemasAndTables',
        connectionName,
        tables: [],
        type,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async executeDiff(
    sourceConnection: string,
    sourceTable: string,
    targetConnection: string,
    targetTable: string,
    schemaOnly: boolean
  ) {
    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Comparing Tables",
        cancellable: true
      }, async (progress, token) => {
        progress.report({ 
          message: `Comparing ${sourceTable} with ${targetTable}` 
        });

        const cancelListener = token.onCancellationRequested(() => {
          BruinTableDiff.cancelDiff();
          if (TableDiffPanel._view) {
            TableDiffPanel._view.webview.postMessage({
              command: 'showResults',
              status: 'cancelled'
            });
          }
        });

        const { workspaceFolder, connections } = await this.getWorkspaceSetup();
        const tableDiff = new BruinTableDiff("bruin", workspaceFolder);
        
        // Use explicit connection mode: connection_name:table_name format
        const result = await tableDiff.compareTables(
          sourceConnection,
          sourceTable,
          targetConnection,
          targetTable,
          schemaOnly
        );

        const sourceInfo = `${sourceConnection}:${sourceTable}`;
        const targetInfo = `${targetConnection}:${targetTable}`;
        
        this.showResults(sourceInfo, targetInfo, result);

        cancelListener.dispose();
      });

    } catch (error) {
      console.error('Error executing table diff:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Distinguish cancellation vs genuine error
      if (TableDiffPanel._view) {
        if (errorMessage.includes('Command was cancelled') || errorMessage.includes('context canceled')) {
          TableDiffPanel._view.webview.postMessage({
            command: 'showResults',
            status: 'cancelled'
          });
        } else {
          TableDiffPanel._view.webview.postMessage({
            command: 'showResults',
            error: errorMessage,
            source: '',
            target: '',
            results: ''
          });
        }
      }
      
      if (!errorMessage.includes('Command was cancelled')) {
        vscode.window.showErrorMessage(`Table comparison failed: ${errorMessage}`);
      }
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
    const stylesUriTableDiff = getUri(webview, this._extensionUri, [
      "webview-ui",
      "build", 
      "assets",
      "tableDiff.css",
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
            script-src 'nonce-${nonce}' ${webview.cspSource};
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
         ">
        <link rel="stylesheet" href="${codiconsUri}">
        <link rel="stylesheet" href="${stylesUriTableDiff}">
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

  private async persistState(state: any) {
    if (!this._extensionContext) {
      throw new Error("Extension context not found");
    }
    try {
      const sanitizedState = JSON.parse(JSON.stringify(state));
      await this._extensionContext.globalState.update("tableDiffState", sanitizedState);
    } catch (error) {
      console.error("Error persisting table diff state:", error);
    }
  }

  private async restoreState(): Promise<any> {
    if (!this._extensionContext) {
      throw new Error("Extension context not found");
    }
    try {
      const state: any = this._extensionContext.globalState.get("tableDiffState") || null;
      return state;
    } catch (error) {
      console.error("Error restoring table diff state:", error);
      return null;
    }
  }
}