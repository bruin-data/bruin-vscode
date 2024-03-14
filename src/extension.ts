// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { bruinFoldingRangeProvider } from "./providers/bruinFoldingRangeProvider";
import {
  isBruinBinaryAvailable,
} from "./utils/bruinUtils";

import { BruinMainPanel } from './panels/BruinMainPanel';

export function activate(context: vscode.ExtensionContext) {
    if (!isBruinBinaryAvailable()) {
        vscode.window.showErrorMessage("Bruin is not installed");
        return;
    }
    const foldingDisposable = vscode.languages.registerFoldingRangeProvider(
      ["python", "sql"],
      {
        provideFoldingRanges: bruinFoldingRangeProvider,
      }
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('bruin.renderSQL', () => {
            BruinMainPanel.createOrShow(context.extensionUri, context);
        }),
        foldingDisposable
    );
}


// This method is called when your extension is deactivated
export function deactivate() {}
