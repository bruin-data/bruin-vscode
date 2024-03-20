import * as vscode from "vscode";
import {
  commandExecution,
  encodeHTML,
  isFileExtensionSQL,
} from "../utils/bruinUtils";
import {
  BRUIN_RENDER_SQL_COMMAND,
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
      BruinMainPanel.currentPanel.panel.reveal(columnToShowIn);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "bruinSQL",
      "Render single SQL asset",
      columnToShowIn || vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "img"), vscode.Uri.joinPath(extensionUri, 'src', 'styles')],     
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
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

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
            if (!this.lastRenderedDocumentUri) {return;};
            const filePath = this.lastRenderedDocumentUri.fsPath;
            commandExecution(
              `${BRUIN_VALIDATE_SQL_COMMAND} -o json ${filePath}`,
              vscode.workspace.workspaceFolders?.[0].uri.fsPath
            )
              .then(({ stdout, stderr }) => {
                const message = stderr
                  ? `Validation failed: ${stderr}`
                  : `Validation successful: ${stdout}`;
                this.panel.webview.postMessage({ command: 'showToast', message: message });
              })
              .catch((err) =>
                vscode.window.showErrorMessage(
                  "Failed to execute Bruin CLI command: " + err
                )
              );
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
  }

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
            : this.getWebviewContent(stdout as string, this.getCurrentThemeCssUrl(themeKind));
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
    const cssUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'styles', 'style.css'));
    return `
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
		<pre><code class="sql">${encodeHTML(renderedSql)}</code></pre>
      <div id="toast" class="toast"></div>
      <div id="actionButtons">
                <div id="copyFeedback">Copied!</div>
                <div id="copyIcon" onclick="copyToClipboard()" style="cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </div>
                <div id="validateButton" onclick="validateSql()" style="cursor: pointer; margin-left: 10px;">
                    Validate
                </div>
      </div>
		<script>
      const vscode = acquireVsCodeApi();
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

      function validateSql() {
        document.getElementById('validateButton').innerHTML = 'Loading...';
        vscode.postMessage({
            command: 'bruin.validate',
            text: 'Validate SQL command executed.'
        });
      }
      const validateButton = document.getElementById('validateButton');
      validateButton.addEventListener('click', validateSql);

      function showToast(message) {
        document.getElementById('validateButton').innerHTML = 'Validate';
        const prefix = "Validation successful:";
        let jsonContent = "";
        if (message.startsWith(prefix)) {
            try {
                jsonContent = message.substring(prefix.length).trim();
                const parsed = JSON.parse(jsonContent);
                const pipeline = parsed[0]?.pipeline || "N/A";
                const issues = JSON.stringify(parsed[0]?.issues || {}, null, 2); // Beautify the JSON

                // Generate formatted HTML content
                // Generate formatted HTML content using string concatenation
                const htmlContent = '<div class="toastContent">' +
                                        '<div class="toastTitle">Validation Successful</div>' +
                                        '<div>Pipeline: <span class="pipelineName">' + pipeline + '</span></div>' +
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
