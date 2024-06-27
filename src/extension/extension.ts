import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  window,
  workspace,
} from "vscode";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { setupFoldingOnOpen, subscribeToConfigurationChanges } from "./configuration";
import * as os from "os";

import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";

export function activate(context: ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    window.showErrorMessage("Bruin is not installed");
    return;
  }

  const config = workspace.getConfiguration("bruin");

  // Check the current platform
  const isWindows = os.platform() === "win32";
  const newPathSeparator = isWindows ? "\\" : "/";
  config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);

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
