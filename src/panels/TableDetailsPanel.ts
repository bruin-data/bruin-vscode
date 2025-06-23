import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";

export class TableDetailsPanel {
  public static currentPanel: TableDetailsPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, extensionUri: Uri, tableName: string) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, tableName);
  }

  public static render(extensionUri: Uri, tableName: string) {
    if (TableDetailsPanel.currentPanel) {
        TableDetailsPanel.currentPanel._panel.dispose();
        TableDetailsPanel.currentPanel = undefined;
    }
    
    const panel = window.createWebviewPanel("tableDetails", tableName, ViewColumn.One, {
        enableScripts: true,
    });

    TableDetailsPanel.currentPanel = new TableDetailsPanel(panel, extensionUri, tableName);
    
  }

  public dispose() {
    TableDetailsPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _getWebviewContent(webview: Webview, extensionUri: Uri, tableName: string) {
    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Table Details</title>
          <style>
            body {
              color: var(--vscode-editor-foreground);
              background-color: var(--vscode-editor-background);
              font-family: var(--vscode-font-family);
            }
            textarea {
              width: 100%; 
              height: 300px;
              background-color: var(--vscode-editor-background);
              color: inherit;
              border: none;
              font-family: var(--vscode-editor-font-family);
              font-size: var(--vscode-editor-font-size);
              box-sizing: border-box;
              outline: none;
              resize: vertical;
            }
            textarea:focus {
              outline: none;
            }
          </style>
        </head>
        <body>
          
          <textarea>SELECT * FROM ${this._escapeTableName(tableName)}</textarea>
        </body>
      </html>
    `;
  }

  private _escapeTableName(tableName: string): string {
    return tableName.replace(/[^a-zA-Z0-9_]/g, '');
  }
} 