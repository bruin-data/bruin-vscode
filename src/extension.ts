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
    ["python", "sql"],

    {
      provideFoldingRanges: bruinFoldingRangeProvider,
    }
  );

  applyFoldingStateBasedOnConfiguration();

  // Listen for configuration changes to apply folding state

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("bruin.defaultFoldingState")) {
      applyFoldingStateBasedOnConfiguration();
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("bruin.renderSQL", () => {
      BruinMainPanel.createOrShow(context.extensionUri, context);
    }),

    foldingDisposable,

    vscode.window.onDidChangeActiveTextEditor(() => {
      applyFoldingStateBasedOnConfiguration();
    })
  );
}

// This method is called when your extension is deactivated

export function deactivate() {}

function applyFoldingStateBasedOnConfiguration() {
  const config = vscode.workspace.getConfiguration();

  const defaultFoldingState = config.get("bruin.defaultFoldingState", "folded");

  if (defaultFoldingState === "folded" && vscode.window.activeTextEditor) {
    vscode.commands.executeCommand("editor.foldAllMarkerRegions");
  }
}
