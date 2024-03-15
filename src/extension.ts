import * as vscode from "vscode";
import { bruinFoldingRangeProvider } from "./providers/bruinFoldingRangeProvider";
import { isBruinBinaryAvailable } from "./utils/bruinUtils";
import { BruinMainPanel } from "./panels/BruinMainPanel";

export function activate(context: vscode.ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    vscode.window.showErrorMessage("Bruin is not installed");
    return;
  }

  const foldingDisposable = vscode.languages.registerFoldingRangeProvider(
    ["python", "sql"], { provideFoldingRanges: bruinFoldingRangeProvider }
  );

  // Immediately try to apply the folding state to the current document
  setTimeout(applyFoldingStateBasedOnConfiguration, 500);

  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration("bruin.defaultFoldingState")) {
      applyFoldingStateBasedOnConfiguration();
    }
  });
  

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && ['python', 'sql'].includes(editor.document.languageId)) {
      console.log("From onDidChangeActiveTextEditor", editor.document.languageId);
      setTimeout(applyFoldingStateBasedOnConfiguration, 500);
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("bruin.renderSQL", () => {
      BruinMainPanel.createOrShow(context.extensionUri, context);
    }),
    foldingDisposable
  );
}

export function deactivate() {}

function applyFoldingStateBasedOnConfiguration() {
    const config = vscode.workspace.getConfiguration();
    const defaultFoldingState = config.get("bruin.defaultFoldingState", "folded");
    if (defaultFoldingState === "folded") {
      vscode.commands.executeCommand("editor.foldAllMarkerRegions");
    } else {
      vscode.commands.executeCommand("editor.unfoldAll");
    }
}
