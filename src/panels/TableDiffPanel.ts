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
      console.log('TableDiffPanel: webviewView:', !!webviewView);
      console.log('TableDiffPanel: webviewView.webview:', !!webviewView.webview);
      
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

      console.log('TableDiffPanel: Setting webview HTML');
      webviewView.webview.html = this._getWebviewContent(webviewView.webview);
      console.log('TableDiffPanel: Webview HTML set');
      
      // Set up message listener for webview actions
      webviewView.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case 'executeTableDiff':
              vscode.commands.executeCommand('bruin.executeDiff');
              break;
            case 'clearTableDiff':
              vscode.commands.executeCommand('bruin.clearDiffSelection');
              break;
          }
        },
        undefined,
        this.disposables
      );
      
      // Show current results if any
      console.log('TableDiffPanel: Calling updateResults');
      this.updateResults();
      console.log('TableDiffPanel: resolveWebviewView completed successfully');
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
          .actions {
            margin-top: 12px;
            display: flex;
            gap: 8px;
          }
          .compare-again-btn, .new-comparison-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            font-family: var(--vscode-font-family);
          }
          .compare-again-btn:hover, .new-comparison-btn:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .new-comparison-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          .new-comparison-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
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
          
          let currentSource = '';
          let currentTarget = '';
          
          function compareAgain() {
            console.log('TableDiffPanel webview: Compare again clicked');
            vscode.postMessage({
              command: 'executeTableDiff'
            });
          }
          
          function newComparison() {
            console.log('TableDiffPanel webview: New comparison clicked');
            vscode.postMessage({
              command: 'clearTableDiff'
            });
            updateContent('', '', '');
          }
          
          function updateContent(source, target, results) {
            console.log('TableDiffPanel webview: updateContent called with:', {
              source,
              target,
              results: results?.substring(0, 200) + '...'
            });
            
            const content = document.getElementById('content');
            console.log('TableDiffPanel webview: Content element found:', !!content);
            
            // Store current source and target for "Compare Again" functionality
            currentSource = source;
            currentTarget = target;
            
            if (results && results.trim()) {
              console.log('TableDiffPanel webview: Updating with results');
              content.innerHTML = \`
                <div class="results-container">
                  <div class="comparison-info">
                    <h3>✅ Table Comparison Complete</h3>
                    <div class="tables">
                      Source: \${source}<br>
                      Target: \${target}
                    </div>
                    <div class="actions">
                      <button class="compare-again-btn" onclick="compareAgain()">🔄 Compare Again</button>
                      <button class="new-comparison-btn" onclick="newComparison()">🆕 New Comparison</button>
                    </div>
                  </div>
                  <div class="results-content">\${results}</div>
                </div>
              \`;
              console.log('TableDiffPanel webview: Results content set');
            } else {
              console.log('TableDiffPanel webview: No results, showing default content');
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
              console.log('TableDiffPanel webview: Default content set');
            }
          }
          
          // Listen for messages from the extension
          window.addEventListener('message', event => {
            console.log('TableDiffPanel webview: Message received:', event.data);
            const message = event.data;
            switch (message.command) {
              case 'showResults':
                console.log('TableDiffPanel webview: Processing showResults command');
                console.log('TableDiffPanel webview: Source:', message.source);
                console.log('TableDiffPanel webview: Target:', message.target);
                console.log('TableDiffPanel webview: Results length:', message.results?.length);
                updateContent(message.source, message.target, message.results);
                console.log('TableDiffPanel webview: Content updated');
                break;
              case 'clearResults':
                console.log('TableDiffPanel webview: Processing clearResults command');
                updateContent('', '', '');
                break;
              default:
                console.log('TableDiffPanel webview: Unknown command:', message.command);
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
    console.log('TableDiffPanel: showResults called with:', {
      source,
      target,
      results: results?.substring(0, 200) + '...' // Log first 200 chars
    });
    
    if (this._view) {
      console.log('TableDiffPanel: _view exists, posting message to webview');
      
      this._view.webview.postMessage({
        command: 'showResults',
        source: source,
        target: target,
        results: results
      });
      
      console.log('TableDiffPanel: Message posted to webview');
    } else {
      console.log('TableDiffPanel: _view is undefined, cannot show results');
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
    console.log('TableDiffPanel: updateResults called');
    console.log('TableDiffPanel: Current results:', {
      hasResults: !!this.currentResults,
      hasSource: !!this.currentSource,
      hasTarget: !!this.currentTarget,
      resultsLength: this.currentResults?.length
    });
    
    if (this.currentResults && this.currentSource && this.currentTarget) {
      console.log('TableDiffPanel: Calling showResults from updateResults');
      TableDiffPanel.showResults(this.currentSource, this.currentTarget, this.currentResults);
    } else {
      console.log('TableDiffPanel: No current results to show');
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