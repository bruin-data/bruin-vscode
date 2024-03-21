import * as vscode from "vscode";
import {
  commandExecution,
  encodeHTML,
  isFileExtensionSQL,
} from "../utils/bruinUtils";
import {
  BRUIN_RENDER_SQL_COMMAND,
  BRUIN_RUN_SQL_COMMAND,
  BRUIN_VALIDATE_SQL_COMMAND,
} from "../constants";

export class BruinMainPanel {
  private static currentPanel: BruinMainPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private lastRenderedDocumentUri: vscode.Uri | undefined;

  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    const columnToShowIn = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : undefined;

    if (BruinMainPanel.currentPanel) {
      BruinMainPanel.currentPanel.panel.reveal(columnToShowIn );
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "bruinSQL",
      "Render single SQL asset",
      columnToShowIn || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "img"),
          vscode.Uri.joinPath(extensionUri, "src", "styles"),
        ],
        retainContextWhenHidden: true,
      }
    );

    BruinMainPanel.currentPanel = new BruinMainPanel(
      panel,
      extensionUri,
      context
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    const uri = vscode.Uri.joinPath(extensionUri);
    vscode.workspace.openTextDocument(uri).then((doc) => {
      vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
    });

    // Set the icon path
    const iconPath = vscode.Uri.joinPath(
      extensionUri,
      "img",
      "bruin-logo-sm128.png"
    );
    this.panel.iconPath = { light: iconPath, dark: iconPath };

    // Update content when the panel is initially displayed
    this.update();

    // Listen for when the panel is disposed

    // React to content changes
    const changeDocumentDisposable = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (
          event.document.uri.toString() ===
          vscode.window.activeTextEditor?.document.uri.toString()
        ) {
          this.update();
        }
      }
    );
    // React to file changes

    const changeFileDisposable = vscode.window.onDidChangeActiveTextEditor(
      async (event) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (panel && activeEditor) {
          this.update();
        }
      }
    );

    // React to theme changes
    const changeThemeDisposable = vscode.window.onDidChangeActiveColorTheme(
      () => {
        this.update();
      }
    );

    

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "bruin.validate":
            if (!this.lastRenderedDocumentUri) {
              return;
            }
            const filePath = this.lastRenderedDocumentUri.fsPath;
            commandExecution(
              `${BRUIN_VALIDATE_SQL_COMMAND} -o json ${filePath}`,
              vscode.workspace.workspaceFolders?.[0].uri.fsPath
            )
              .then(({ stdout, stderr }) => {
                if (stderr) {
                  this.panel.webview.postMessage({
                    command: "showToast",
                    message: `Validation failed: ${stdout}`,
                  });
                  return;
                }
                //this.panel.webview.postMessage({ command: 'showToast', message: `Validation failed: ${stdout}` });

                this.panel.webview.postMessage({
                  command: "validateSuccess",
                  message: `Validation successful: ${stdout}`,
                });
              })
              .catch((err) =>
                vscode.window.showErrorMessage(
                  "Failed to execute Bruin CLI command: " + err
                )
              );
            break;
          case "bruin.run":
            if (!this.lastRenderedDocumentUri) {
              return;
            }
            const command = message.text;
            this.runInIntegratedTerminal(this.lastRenderedDocumentUri?.fsPath || "", command);
            break;
        }
      },
      undefined,
      context.subscriptions
    );

    this.disposables.push(
      changeDocumentDisposable,
      changeThemeDisposable,
      changeFileDisposable
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  // Run the RUN SQL command in the integrated terminal
  private runInIntegratedTerminal= (assetPath: string, flags?: string) =>{
    const terminalName = "Bruin Terminal";
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    if (!terminal) {
        terminal = vscode.window.createTerminal(terminalName);
    }
    terminal.show(true); 
    terminal.sendText(`${BRUIN_RUN_SQL_COMMAND} ${flags} ${assetPath}`, true); 
    
  };


  private update() {
    const activeEditor = vscode.window.activeTextEditor;
    const themeKind = vscode.window.activeColorTheme.kind;
    this.lastRenderedDocumentUri = activeEditor?.document.uri;
    if (activeEditor && isFileExtensionSQL(activeEditor.document.fileName)) {
      commandExecution(
        `${BRUIN_RENDER_SQL_COMMAND} ${activeEditor.document.fileName}`
      )
        .then(({ stdout, stderr }) => {
          this.panel.webview.html = stderr
            ? this.getErrorContent(stderr)
            : this.getWebviewContent(
                stdout as string,
                this.getCurrentThemeCssUrl(themeKind)
              );
        })
        .catch((err) => {
          console.error(err);
          this.panel.webview.html = this.getErrorContent(
            "Failed to execute Bruin CLI command."
          );
        });
    }
  }

  private dispose() {
    BruinMainPanel.currentPanel = undefined;

    // Dispose all disposables
    while (this.disposables.length) {
      const x = this.disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
  private getCurrentThemeCssUrl = (themeKind: vscode.ColorThemeKind) => {
    let themeCssUrl;

    switch (themeKind) {
      case vscode.ColorThemeKind.Light:
        themeCssUrl =
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/default.min.css";
        break;
      case vscode.ColorThemeKind.Dark:
        themeCssUrl =
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/monokai.min.css";
        break;
      case vscode.ColorThemeKind.HighContrast:
        themeCssUrl =
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/darcula.min.css";
        break;
      default:
        themeCssUrl =
          "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/default.min.css";
        break;
    }
    return themeCssUrl;
  };

  private getWebviewContent = (renderedSql: string, themeCssUrl: string) => {
    const cssUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "src", "styles", "style.css")
    );

    return /*html*/ ` 
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>SQL Content</title>
    <link rel="stylesheet" href="${themeCssUrl}">
    <link rel="stylesheet" type="text/css" href="${cssUri}">
		<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/highlight.min.js"></script>
		<script>hljs.highlightAll();</script>
		
	</head>
	<body>
    <div class="header">
        <div id="toast" class="toast"></div>
        <div class="runOptions">
            <div class="dates">
                   <div class="startDate">
                      <label for="start">Start date:</label>
                      <input
                          type="datetime-local"
                          id="start"
                          name="start-date"
                          />
                    </div>
                    <div class="endDate">
                      <label for="end">End date:</label>
                      <input
                          type="datetime-local"
                          id="end"
                          name="end-date"
                          />
                      </div>
              </div>
              <div class="flags">
                  <div class="downstream">
                      <label for="downstream">Downstream:</label>
                      <input
                          type="checkbox"
                          id="downstream"
                          name="downstream"
                          />
                  </div>
                  <div class="fullRefresh">
                      <label for="fullRefresh">Full Refresh:</label>
                      <input
                          type="checkbox"
                          id="fullRefresh"
                          name="fullRefresh"
                          />
                  </div>
                  <div class="dateExclusive">
                      <label for="dateExclusive">End Date Exclusive:</label>
                      <input
                          type="checkbox"
                          id="dateExclusive"
                          name="dateExclusive"
                          />
                  </div>
              </div>
          <div>
      </div>
      <div id="actionButtons">
                <div id="copyFeedback">Copied!</div>
                <div id="copyIcon" onclick="copyToClipboard()" style="cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </div>
                <div class="commandButtons"> 
                  <div id="validateButton" class="actionButton" onclick="validateSql()">
                      Validate
                  </div>
                  <div id="runButton" class="actionButton" onclick="runSql()">
                    Run
                  </div>
                </div> 
      </div>
    </div>
		<pre><code class="sql">${encodeHTML(renderedSql)}</code></pre>
     
		<script>
      const vscode = acquireVsCodeApi();

        window.addEventListener('DOMContentLoaded', (event) => {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0));
          const endOfYesterday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

          const toLocalDateTimeFormat = (date) => {
              return date.toISOString().slice(0, 23);
          };

          document.getElementById('start').value = toLocalDateTimeFormat(startOfYesterday);
          document.getElementById('end').value = toLocalDateTimeFormat(endOfYesterday);
        });

      function validateSql() {
        //document.getElementById('validateButton').innerHTML = 'Loading...';
        vscode.postMessage({
            command: 'bruin.validate',
            text: 'Validate SQL command executed.'
        });
      }
      function runSql() {
        const runButton = document.getElementById('runButton');
        const isDownstreamChecked = document.getElementById('downstream').checked;
        const isFullRefreshChecked = document.getElementById('fullRefresh').checked;
        const isDateExclusiveChecked = document.getElementById('dateExclusive').checked;
        const isStartDateDefined = document.getElementById('start').value;
        const isEndDateDefined = document.getElementById('end').value;
        let endDate = new Date(isEndDateDefined);
        endDate.setUTCHours(23, 59, 59, 999);
        let endDateString = endDate.toISOString().slice(0, 19) + '.999999999Z';

        let command = '';
        if(isStartDateDefined){
          command += ' -start-date ' + isStartDateDefined.toString();
        }
        if(isDateExclusiveChecked){
          command += ' -end-date ' + endDateString;
        }
        else if(isEndDateDefined){
          command += ' -end-date ' + isEndDateDefined.toString();
        }

        if(isDownstreamChecked){
          command += ' --downstream';
        }
        if(isFullRefreshChecked){  
          command += ' --full-refresh';
        }
        //runButton.innerHTML = 'Running...';
        vscode.postMessage({
            command: 'bruin.run',
            text: command
        });
      }


      const validateButton = document.getElementById('validateButton');
      validateButton.addEventListener('click', validateSql);

      function validateSuccess(){
        document.getElementById('validateButton').innerHTML = 'Validate ✅';
        vscode.postMessage({
          command: 'validateSuccess',
        });
      }
      function showToast(message) {
        document.getElementById('validateButton').innerHTML = 'Validate ❌';
        const prefix = "Validation failed:";
        let jsonContent = "";
        if (message.startsWith(prefix)) {
            try {
                jsonContent = message.substring(prefix.length).trim();
                const parsed = JSON.parse(jsonContent);
                const pipeline = parsed[0]?.pipeline || "N/A";
                const issues = JSON.stringify(parsed[0]?.issues || {}, null, 2); // Beautify the JSON
                const htmlContent = '<div class="toastContent">' +
                                        '<div class="toastTitle">Validation failed : <span class="pipelineName">' + pipeline + ' </span></div>' +
                                        '<div class="toastDetails">Issues: <pre class="issues">' + issues + '</pre></div>' +
                                    '</div>';
                                message = htmlContent;
            } catch (e) {
                console.error("Error parsing JSON content:", e);
                // Fallback to showing the original message
            }
        }

        const toastElement = document.getElementById('toast');
        toastElement.innerHTML = message; 
        toastElement.classList.add('show');
        setTimeout(() => { toastElement.classList.remove('show'); }, 3000);
      }
      window.addEventListener('message', event => {
          const message = event.data;
          if (message.command === 'showToast') {
              showToast(message.message);
          }
      });
      window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'validateSuccess') {
          validateSuccess(message.message);
        }
    });
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'bruin.run') {
        runSql(message.message);
      }
  });
  
  function copyToClipboard() {
				navigator.clipboard.writeText(\`${encodeHTML(renderedSql)}\`).then(function() {
					document.getElementById('copyIcon').style.display = 'none';
					const copyFeedback = document.getElementById('copyFeedback');
					copyFeedback.style.display = 'block';
					
					// Revert back to the icon after 2 seconds
					setTimeout(() => {
						copyFeedback.style.display = 'none';
						document.getElementById('copyIcon').style.display = 'block';
					}, 2000);
				}, function(err) {
					console.error('Could not copy text: ', err);
				});
			}

		</script>
	</body>
	</html>
	
`;
  };

  private getErrorContent(errorMessage: string): string {
    // Use encodeHTML for safe rendering
    return `<!DOCTYPE html>...${encodeHTML(errorMessage)}`;
  }
}
