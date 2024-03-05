// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { bruinFoldingRangeProvider } from './providers/bruinFoldingRangeProvider';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.languages.registerFoldingRangeProvider(['python', 'sql'],
	{
		provideFoldingRanges: bruinFoldingRangeProvider,
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
