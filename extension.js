// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const child_process = require('child_process');
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
const BRUIN_HELP_COMMAND_ID = "bruin.help"
const BRUIN_WHICH_COMMAND = "which bruin"
const BRUIN_HELP_COMMAND = "bruin --help"
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	if (checkBruinBinary()) {
		vscode.window.showErrorMessage('Bruin executable not found');
		return;
	}

	let bruinHelpDisposable = vscode.commands.registerCommand(BRUIN_HELP_COMMAND_ID, async () => {
		let editor = vscode.window.activeTextEditor
		let fileName = editor.document.fileName.toLocaleLowerCase();
		let isFileExtensionSQL = fileName.substring(fileName.lastIndexOf(".") + 1, fileName.length)

		if (editor && isFileExtensionSQL === "sql") {
			const outputCommand = await commandExcution(BRUIN_HELP_COMMAND);
			vscode.window.showInformationMessage(outputCommand.stdout);
			vscode.window.showErrorMessage(outputCommand.stderr)
		} else {
			vscode.window.showErrorMessage('Please trigger Bruin for SQL files');
		}
	})

	context.subscriptions.push(bruinHelpDisposable);
	console.log("Bruin extension successfully activated")
}

// This method is called when your extension is deactivated
function deactivate() { }


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
