// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const { exec } = require('child_process');
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	//
	let bruinHelpDisposable = vscode.commands.registerCommand("bruin.help", () => {
		exec("bruin --help", (error, stdout, stderr) => {
			if (error) {
				console.error(`exec error ${error}`);
				return;
			}
			vscode.window.showInformationMessage(stdout);
			vscode.window.showInformationMessage(stderr)
		})
	})
	context.subscriptions.push(bruinHelpDisposable);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
