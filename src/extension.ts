// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { bruinFoldingRangeProvider } from './providers/bruinFoldingRangeProvider';
import { isBruinBinaryAvailable, isFileExtensionSQL } from './utils/bruinUtils';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
	// if bruin is not installed, prompt a message to install and quit
	if(!isBruinBinaryAvailable()){
		vscode.window.showErrorMessage('Bruin is not installed');
		return;
	}
	// register the folding range provider
	const foldingDisposable = vscode.languages.registerFoldingRangeProvider(['python', 'sql'],
	{
		provideFoldingRanges: bruinFoldingRangeProvider,
	});

	// create a webview panel to render the SQL

	let panel: vscode.WebviewPanel | undefined = undefined;
	let fileName : string = vscode.window.activeTextEditor?.document.fileName.toLocaleLowerCase() || '';

	
	// register the command to render SQL
	const renderDisposable = vscode.commands.registerCommand('bruin.renderSQL', () => {
		// check if the active file is a SQL file
		if(isFileExtensionSQL(fileName)){
			panel = vscode.window.createWebviewPanel(
				'bruinSQL',
				'Render single SQL asset',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true
				}
			);
			panel.webview.html = "<h1>SQL</h1>";
	}
		vscode.window.showInformationMessage('Render SQL');
	});

	context.subscriptions.push(foldingDisposable);
	context.subscriptions.push(renderDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
