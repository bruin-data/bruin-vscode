import { commands, ExtensionContext, languages, window, workspace } from "vscode";
import { BruinPanel } from "../panels/BruinPanel";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { isFileExtensionSQL } from "../utilities/helperUtils";
import { getDefaultBruinExecutablePath } from "./configuration";
import { BruinRender } from "../bruin";

function applyFoldingStateBasedOnConfiguration() {
  const config = workspace.getConfiguration();
  const defaultFoldingState = config.get("bruin.defaultFoldingState", "folded");
  if (defaultFoldingState === "folded") {
    commands.executeCommand("editor.foldAllMarkerRegions");
  } else {
    commands.executeCommand("editor.unfoldAll");
  }
}

export function activate(context: ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    window.showErrorMessage("Bruin is not installed");
    return;
  }

  const foldingDisposable = languages.registerFoldingRangeProvider(["python", "sql"], {
    provideFoldingRanges: bruinFoldingRangeProvider,
  });

  // Immediately try to apply the folding state to the current document
  setTimeout(applyFoldingStateBasedOnConfiguration, 500);

  workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("bruin.defaultFoldingState")) {
      applyFoldingStateBasedOnConfiguration();
    }
  });

  context.subscriptions.push(
    commands.registerCommand("bruin.renderSQL", async () => {
      const activeEditor = window.activeTextEditor;

      if (
       activeEditor &&
        isFileExtensionSQL(activeEditor.document.fileName)
      ) {
        BruinPanel.render(context.extensionUri);

        const bruinSqlRenderer = new BruinRender(
          getDefaultBruinExecutablePath(),
          workspace.workspaceFolders?.[0].uri.fsPath!!
        );

        const filePath = activeEditor.document.fileName;
        await bruinSqlRenderer.render(filePath);
      }
    })
  );

  context.subscriptions.push(foldingDisposable);

  console.debug("Bruin activated successfully");
}
