// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { bruinFoldingRangeProvider } from './providers/bruinFoldingRangeProvider';
import { commandExecution, isBruinBinaryAvailable, isFileExtensionSQL } from './utils/bruinUtils';
import { BRUIN_RENDER_SQL_ID, BRUIN_RENDER_SQL_COMMAND } from './constants';


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
	const renderDisposable = vscode.commands.registerCommand(BRUIN_RENDER_SQL_ID, async () => {
		// check if the active file is a SQL file

		if(vscode.window.activeTextEditor && isFileExtensionSQL(fileName)){
			const columnToShowIn = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : undefined;
			const sqlAssetPath = vscode.window.activeTextEditor.document.fileName;
			const outputCommand = await commandExecution(`${BRUIN_RENDER_SQL_COMMAND} ${sqlAssetPath}`);

			if(panel) {
				panel.reveal(columnToShowIn);
			} else {
				panel = vscode.window.createWebviewPanel(
					'bruinSQL',
					'Render single SQL asset', // Title of the panel 
					columnToShowIn || vscode.ViewColumn.Beside,
					{ // Webview options
						enableScripts: true
					}
				);
				panel.onDidDispose(
					() => {
					// When the panel is closed, cancel any future updates to the webview content
					panel = undefined;
					},
					null,
					context.subscriptions
				);
			}
			panel.webview.html = "<h1>SQL</h1>";
	}  else {
		vscode.window.showErrorMessage('Please trigger Bruin for SQL files');
	}
	});

	context.subscriptions.push(foldingDisposable, renderDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
