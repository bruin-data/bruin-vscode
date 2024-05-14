import { commands, ExtensionContext, languages, window, workspace } from "vscode";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { setupFoldingOnOpen, subscribeToConfigurationChanges } from "./configuration";

import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";

export function activate(context: ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    window.showErrorMessage("Bruin is not installed");
    return;
  }

  // Setup folding on open
  setupFoldingOnOpen();

  subscribeToConfigurationChanges();

  const lineageWebviewProvider = new LineagePanel(context.extensionUri);

  // Register the folding range provider for Python and SQL files
  const foldingDisposable = languages.registerFoldingRangeProvider(["python", "sql"], {
    provideFoldingRanges: bruinFoldingRangeProvider,
  });

  context.subscriptions.push(
    commands.registerCommand("bruin.renderSQL", () => {
      renderCommand(context.extensionUri);
    }),
    foldingDisposable,
    window.registerWebviewViewProvider(LineagePanel.viewId, lineageWebviewProvider)
  );

  console.debug("Bruin activated successfully");
}
