import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  window,
  workspace,
} from "vscode";
import * as vscode from "vscode";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { setupFoldingOnOpen, subscribeToConfigurationChanges } from "./configuration";
import * as os from "os";
import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";
import { BruinExplorerPanel } from "../panels/BruinExplorer";
import { installOrUpdateCli } from "./commands/updateBruinCLI";

export function activate(context: ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    window.showErrorMessage("Bruin is not installed");
    return;
  }

  const yamlSelector = [
    { language: "yaml", scheme: "file" },
    { language: "yaml", scheme: "untitled" },
  ];

  const config = workspace.getConfiguration("bruin");

  // Check the current platform
  const isWindows = os.platform() === "win32";
  const newPathSeparator = isWindows ? "\\" : "/";
  config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);

  // Setup folding on open
  setupFoldingOnOpen();

  subscribeToConfigurationChanges();

  const lineageWebviewProvider = new LineagePanel(context.extensionUri);
  const bruinExplorerWebviewProvider = new BruinExplorerPanel(context.extensionUri);

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
    window.registerWebviewViewProvider(BruinExplorerPanel.viewId, bruinExplorerWebviewProvider),
    window.registerWebviewViewProvider(LineagePanel.viewId, lineageWebviewProvider)
  );

  console.debug("Bruin activated successfully");
}
