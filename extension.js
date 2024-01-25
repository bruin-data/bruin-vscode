// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const child_process = require('child_process');
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const BRUIN_WHICH_COMMAND = "which bruin"
const BRUIN_HELP_COMMAND_ID = "bruin.help"
const BRUIN_HELP_COMMAND = "bruin --help"
const BRUIN_RENDER_COMMAND = "bruin render"
const BRUIN_RENDER_COMMAND_ID = "bruin.renderSql"

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	if (checkBruinBinary()) {
		vscode.window.showErrorMessage('Bruin executable not found');
		return;
	}



	let bruinHelpDisposable = vscode.commands.registerCommand(BRUIN_HELP_COMMAND_ID, async () => {

		if (isEditorActive() && isFileExtensionSQL()) {
			const outputCommand = await commandExcution(BRUIN_HELP_COMMAND);
			vscode.window.showInformationMessage(outputCommand.stdout);
			vscode.window.showErrorMessage(outputCommand.stderr)
		} else {
			vscode.window.showErrorMessage('Please trigger Bruin for SQL files');
		}
	})

	let bruinRenderDisposable = vscode.commands.registerCommand(BRUIN_RENDER_COMMAND_ID, async () => {

		if (isEditorActive() && isFileExtensionSQL()) {
			const sqlAssetPath = vscode.window.activeTextEditor.document.fileName;
			const outputCommand = await commandExcution(`${BRUIN_RENDER_COMMAND} ${sqlAssetPath}`);
			const panel = vscode.window.createWebviewPanel(
				'bruin', // Identifies the type of the webview. Used internally
				'Render single SQL assset', // Title of the panel displayed to the user
				vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
				{} // Webview options. More on these later.
			);
			panel.webview.html = getWebviewContent(outputCommand.stdout, sqlAssetPath);

			vscode.window.showErrorMessage(outputCommand.stderr)
		} else {
			vscode.window.showErrorMessage('Please trigger Bruin for SQL files');
		}
	});

	context.subscriptions.push(bruinHelpDisposable);
	context.subscriptions.push(bruinRenderDisposable);
	console.log("Bruin extension successfully activated")
}

// This method is called when your extension is deactivated
function deactivate() { }

function isEditorActive() {
	return vscode.window.activeTextEditor
}

function isFileExtensionSQL() {
	let fileName = vscode.window.activeTextEditor.document.fileName.toLocaleLowerCase();
	let fileExtension = fileName.substring(fileName.lastIndexOf(".") + 1, fileName.length)
	if (fileExtension === 'sql') return true
}
function commandExcution(cliCommand) {
	return new Promise((resolve) => {
		child_process.exec(cliCommand, (error, stdout) => {
			if (error) {
				return resolve({ stderr: error.message });
			}
			return resolve({ stdout });
		});
	})
}

function getWebviewContent(renderedSql, filePath) {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Render SQL File</title>
		<style>
			pre {
				border: solid 1px;
				padding: 10px;
			}
			.sql-header {
				text-align: center;
				font-weight: bold;
				margin-top: 20px;
				margin-bottom: 10px;
			}
	  </style>
  </head>
  <body>
	  <pre class="sql-header">SQL File: ${filePath}</pre>
	  <pre>${renderedSql}</pre>
  </body>
  </html>`;
}

/**
 * Checks if the Bruin executable is available.
 * @returns {Promise<boolean>}
 */
function checkBruinBinary() {
	try {
		let output = child_process.execSync(BRUIN_WHICH_COMMAND);
		if (!output) {
			throw new Error("Bruin does not exists")
		}
	} catch (error) {
		console.error(error);
		return;
	}
}

module.exports = {
	activate,
	deactivate,
	commandExcution,
	checkBruinBinary
}

