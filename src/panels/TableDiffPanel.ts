import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";

export class TableDiffPanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "bruin.tableDiffView";
  public static _view?: vscode.WebviewView | undefined;
  private _lastRenderedDocumentUri: vscode.Uri | undefined =
    vscode.window.activeTextEditor?.document.uri;
  private context: vscode.WebviewViewResolveContext<unknown> | undefined;
  private token: vscode.CancellationToken | undefined;
  private _extensionContext: vscode.ExtensionContext | undefined;
  private disposables: vscode.Disposable[] = [];
  private currentResults: string = "";
  private currentSource: string = "";
  private currentTarget: string = "";

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

      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
      
      // Show current results if any
      this.updateResults();
    } catch (error) {
      console.error("Error loading Table Diff panel:", error);
    }
  }

  private _getWebviewContent(webview: vscode.Webview) {
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
            script-src 'nonce-${nonce}';
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
         ">      
        <title>Table Diff Results</title>
        <style>
          body {
            padding: 16px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          .header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .header h2 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
          }
          .header p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
          }
          .no-results {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
          }
          .no-results .icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
          }
          .results-container {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 16px;
          }
          .comparison-info {
            background: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 16px;
          }
          .comparison-info h3 {
            margin: 0 0 8px 0;
            color: var(--vscode-inputValidation-infoForeground);
            font-size: 14px;
          }
          .comparison-info .tables {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-inputValidation-infoForeground);
          }
          .results-content {
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            padding: 16px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            white-space: pre-wrap;
            overflow-x: auto;
          }
          .instruction {
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 16px;
          }
          .instruction h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
          }
          .instruction ol {
            margin: 8px 0 0 16px;
            padding: 0;
            font-size: 13px;
          }
          .instruction li {
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Table Diff Results</h2>
          <p>View comparison results from selected tables</p>
        </div>
        
        <div id="content">
          <div class="no-results">
            <div class="icon">📊</div>
            <h3>No comparison results yet</h3>
            <p>Select tables in the Table Diff section and execute a comparison to see results here.</p>
          </div>
          
          <div class="instruction">
            <h3>How to use Table Diff:</h3>
            <ol>
              <li>Right-click on a table in the Databases view</li>
              <li>Select "Select for Table Diff"</li>
              <li>Repeat for a second table (max 2 tables)</li>
              <li>In the Table Diff section, right-click and select "Execute Table Diff"</li>
              <li>Results will appear here</li>
            </ol>
          </div>
        </div>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          
          function updateContent(source, target, results) {
            const content = document.getElementById('content');
            if (results && results.trim()) {
              content.innerHTML = \`
                <div class="results-container">
                  <div class="comparison-info">
                    <h3>Table Comparison</h3>
                    <div class="tables">
                      Source: \${source}<br>
                      Target: \${target}
                    </div>
                  </div>
                  <div class="results-content">\${results}</div>
                </div>
              \`;
            } else {
              content.innerHTML = \`
                <div class="no-results">
                  <div class="icon">📊</div>
                  <h3>No comparison results yet</h3>
                  <p>Select tables in the Table Diff section and execute a comparison to see results here.</p>
                </div>
                
                <div class="instruction">
                  <h3>How to use Table Diff:</h3>
                  <ol>
                    <li>Right-click on a table in the Databases view</li>
                    <li>Select "Select for Table Diff"</li>
                    <li>Repeat for a second table (max 2 tables)</li>
                    <li>In the Table Diff section, right-click and select "Execute Table Diff"</li>
                    <li>Results will appear here</li>
                  </ol>
                </div>
              \`;
            }
          }
          
          // Listen for messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'showResults':
                updateContent(message.source, message.target, message.results);
                break;
              case 'clearResults':
                updateContent('', '', '');
                break;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Display diff results in the panel
   */
  public static showResults(source: string, target: string, results: string): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'showResults',
        source: source,
        target: target,
        results: results
      });
    }
  }

  /**
   * Clear the results display
   */
  public static clearResults(): void {
    if (this._view) {
      this._view.webview.postMessage({
        command: 'clearResults'
      });
    }
  }

  /**
   * Update the display with current results
   */
  private updateResults(): void {
    if (this.currentResults && this.currentSource && this.currentTarget) {
      TableDiffPanel.showResults(this.currentSource, this.currentTarget, this.currentResults);
    }
  }

  // Safe method to focus the TableDiff panel
  public static async focusSafely(): Promise<void> {
    try {
      await vscode.commands.executeCommand(`${this.viewId}.focus`);
    } catch (error) {
      console.error("Error focusing table diff panel:", error);
    }
  }

  public async initPanel(event: vscode.TextEditor | vscode.TextDocumentChangeEvent | undefined) {
    if (event) {
      this._lastRenderedDocumentUri = event.document.uri;
      await this.init();
    }
  }
}