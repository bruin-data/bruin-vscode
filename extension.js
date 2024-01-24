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
	let bruinHelpDisposable = vscode.commands.registerCommand("bruin.help", async () => {
		const outputCommand = await commandExcution("bruin --help");
		vscode.window.showInformationMessage(outputCommand.stdout);
		vscode.window.showErrorMessage(outputCommand.stderr)
	})
	context.subscriptions.push(bruinHelpDisposable);
}

// This method is called when your extension is deactivated
function deactivate() { }


function commandExcution(cliCommand) {
	return new Promise((resolve) => {
		exec(cliCommand, (error, stdout) => {
			if (error) {
				return resolve({ stderr: error.message });
			}
			return resolve({ stdout });
		});
	})
}

module.exports = {
	activate,
	deactivate,
	commandExcution
}
