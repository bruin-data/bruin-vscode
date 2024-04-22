import { commands, ExtensionContext, languages, window, workspace } from "vscode";
import { BruinPanel } from "../panels/BruinPanel";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import {
  applyFoldingStateBasedOnConfiguration,
  getDefaultBruinExecutablePath,
  setupFoldingOnOpen,
  subscribeToConfigurationChanges,
} from "./configuration";
import { BruinRender } from "../bruin";
import { isBruinAsset } from "../utilities/helperUtils";
import * as vscode from "vscode";
import { renderCommand } from "./commands/renderCommand";

export function activate(context: ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    window.showErrorMessage("Bruin is not installed");
    return;
  }
  // Setup folding on open
  setupFoldingOnOpen();

  subscribeToConfigurationChanges();
  // Register the folding range provider for Python and SQL files
  const foldingDisposable = languages.registerFoldingRangeProvider(["python", "sql"], {
    provideFoldingRanges: bruinFoldingRangeProvider,
  });

  context.subscriptions.push(
    commands.registerCommand("bruin.renderSQL", () => {
      renderCommand(context.extensionUri);
    }
  ),
    window.onDidChangeActiveTextEditor(() => {
      commands.executeCommand("bruin.renderSQL");
    }),
    workspace.onDidChangeTextDocument(() => {
      commands.executeCommand("bruin.renderSQL");
    }),
    foldingDisposable
  );


  
  console.debug("Bruin activated successfully");
}
