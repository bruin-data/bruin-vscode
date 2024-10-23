import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  window,
  workspace,
} from "vscode";
import * as vscode from "vscode";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { setupFoldingOnOpen, subscribeToConfigurationChanges } from "./configuration";
import * as os from "os";
import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";
import { installOrUpdateCli } from "./commands/updateBruinCLI";

export function activate(context: ExtensionContext) {
  // Automatically focus editor when extension starts

  const config = workspace.getConfiguration("bruin");

  // Check the current platform
  const isWindows = os.platform() === "win32";
  const newPathSeparator = isWindows ? "\\" : "/";
  config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);
  
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    // Focus the active editor if it exists
    vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  } else {
    // If no active editor, try to focus the editor group
    vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
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
    commands.registerCommand("bruin.installCli", () => {
      installOrUpdateCli();
    }),
    foldingDisposable,
    window.registerWebviewViewProvider(LineagePanel.viewId, lineageWebviewProvider)
  );

  console.debug("Bruin activated successfully");
}
