// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { bruinFoldingRangeProvider } from "./providers/bruinFoldingRangeProvider";
import {
  commandExecution,
  isBruinBinaryAvailable,
  isFileExtensionSQL,
} from "./utils/bruinUtils";
import { BRUIN_RENDER_SQL_ID, BRUIN_RENDER_SQL_COMMAND } from "./constants";
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
  // if bruin is not installed, prompt a message to install and quit
  if (!isBruinBinaryAvailable()) {
    vscode.window.showErrorMessage("Bruin is not installed");
    return;
  }
  // register the folding range provider
  const foldingDisposable = vscode.languages.registerFoldingRangeProvider(
    ["python", "sql"],
    {
      provideFoldingRanges: bruinFoldingRangeProvider,
    }
  );

  // create a webview panel to render the SQL

  let panel: vscode.WebviewPanel | undefined = undefined;

  // register the command to render SQL
  const renderDisposable = vscode.commands.registerCommand(
    BRUIN_RENDER_SQL_ID,
    async () => {
      // check if the active file is a SQL file
      const activeEditor = vscode.window.activeTextEditor;

      if (activeEditor) {
        let fileName: string =
          activeEditor.document.fileName.toLocaleLowerCase();

        if (isFileExtensionSQL(fileName)) {
          const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : undefined;
          const sqlAssetPath = activeEditor.document.fileName;
          const outputCommand = await commandExecution(
            `${BRUIN_RENDER_SQL_COMMAND} ${sqlAssetPath}`
          );

          const iconPath = vscode.Uri.file(
            path.join(context.extensionPath, "img", "bruin-logo-sm128.png")
          );

          if (panel) {
            panel.reveal(columnToShowIn);
          } else {
            panel = vscode.window.createWebviewPanel(
              "bruinSQL",
              "Render single SQL asset", // Title of the panel
              columnToShowIn || vscode.ViewColumn.Beside,
              {
                // Webview options
                enableScripts: true,
              }
            );
            panel.iconPath = {
              light: iconPath,
              dark: iconPath,
            };
            panel.onDidDispose(
              () => {
                // When the panel is closed, cancel any future updates to the webview content
                panel = undefined;
              },
              null,
              context.subscriptions
            );
          }
          panel.webview.html = getWebviewContent(outputCommand.stdout || "Something wrong", sqlAssetPath);
		   // Listen for changes to the active editor's document
		   const changeDocumentDisposable = vscode.workspace.onDidChangeTextDocument(async event => {
			if (event.document.uri.toString() === activeEditor.document.uri.toString()) {
				// Reload the webview content when the SQL document is modified
				const modifiedOutputCommand =  await commandExecution(`${BRUIN_RENDER_SQL_COMMAND} ${sqlAssetPath}`);
				panel && (panel.webview.html = getWebviewContent( modifiedOutputCommand.stdout || "Something wrong", sqlAssetPath));
				vscode.window.showInformationMessage("SQL content has been modified");
			}
		});
		context.subscriptions.push(changeDocumentDisposable);
        }
      } else {
        vscode.window.showErrorMessage("Please trigger Bruin for SQL files");
      }
    }
  );

  context.subscriptions.push(foldingDisposable, renderDisposable);
}

const getWebviewContent = (renderedSql: string, filePath: string) => { 
	const themeKind = vscode.window.activeColorTheme.kind;
    let themeCssUrl;

	switch (themeKind) {
        case vscode.ColorThemeKind.Light:
            themeCssUrl = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/default.min.css";
            break;
        case vscode.ColorThemeKind.Dark:
            themeCssUrl = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/monokai.min.css";
            break;
        case vscode.ColorThemeKind.HighContrast:
            themeCssUrl = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/darcula.min.css";
            break;
        default:
            themeCssUrl = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/default.min.css";
            break;
    }

	return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>SQL Content</title>
		<link rel="stylesheet" href="${themeCssUrl}">
		<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/highlight.min.js"></script>
		<script>hljs.highlightAll();</script>
		<style>
			.copy-button {
				cursor: pointer;
				padding: 5px;
				border: 1px solid #ccc;
				background-color: #f9f9f9;
			}
			#copyFeedback {
				display: none;
				color: var(--vscode-editor-foreground);
			}
		</style>
	</head>
	<body>
		<pre><code class="sql">${renderedSql /* Make sure this is safely encoded to prevent XSS */}</code></pre>
			<div id="copyIcon" onclick="copyToClipboard()" style="cursor: pointer;">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
					<path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
				</svg>
			</div>
			<div id="copyFeedback">Copied!</div>
		<script>
			function copyToClipboard() {
				navigator.clipboard.writeText(\`${renderedSql /* Make sure this is safely encoded to prevent XSS */}\`).then(function() {
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

// This method is called when your extension is deactivated
export function deactivate() {}
