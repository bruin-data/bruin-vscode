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
import {
  getDefaultBruinExecutablePath,
  setupFoldingOnOpen,
  subscribeToConfigurationChanges,
} from "./configuration";
import * as os from "os";
import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";
import { checkBruinCliVersion, installOrUpdateCli } from "./commands/updateBruinCLI";
import { get } from "http";

export async function activate(context: ExtensionContext) {
  // Automatically focus editor when extension starts

  const config = workspace.getConfiguration("bruin");

  // Check the current platform
  const isWindows = os.platform() === "win32";
  const newPathSeparator = isWindows ? "\\" : "/";
  config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);
  const bruinExecutable = getDefaultBruinExecutablePath();
   /* if (bruinExecutable) {
    await checkBruinCliVersion();
  }  */
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
    commands.registerCommand("bruin.renderSQL", async () => {
      try {
        await renderCommand(context.extensionUri);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error rendering SQL: ${errorMessage}`);
      }
      /* if (bruinExecutable) {
        try {
          await checkBruinCliVersion();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Error checking Bruin CLI version: ${errorMessage}`);
        }
      } */
    }),
    commands.registerCommand("bruin.installCli", async () => {
      try {
        await installOrUpdateCli();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error installing/updating Bruin CLI: ${errorMessage}`);
      }
    }),
    foldingDisposable,
    window.registerWebviewViewProvider(LineagePanel.viewId, lineageWebviewProvider)
  );

  console.debug("Bruin activated successfully");
}
