import { commands, ExtensionContext, languages, window, workspace } from "vscode";
import { BruinPanel } from "../panels/BruinPanel";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { applyFoldingStateBasedOnConfiguration, getDefaultBruinExecutablePath, setupFoldingOnOpen, subscribeToConfigurationChanges } from "./configuration";
import { BruinRender } from "../bruin";
import { isBruinAsset } from "../utilities/helperUtils";
import { subscribe } from "diagnostics_channel";



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

  // Immediately try to apply the folding state to the current document


  context.subscriptions.push(
    commands.registerCommand("bruin.renderSQL", async () => {
      const activeEditor = window.activeTextEditor;
      const bruinAsset = await isBruinAsset(activeEditor?.document.fileName || "", ["py", "sql"]);
      console.debug("Bruin asset: ", bruinAsset, activeEditor?.document.fileName);
      if (
       activeEditor 
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

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor(() => {
    commands.executeCommand("bruin.renderSQL");
  }
  ),
  workspace.onDidChangeTextDocument( () => {
     commands.executeCommand("bruin.renderSQL");
   }
 )
);


  context.subscriptions.push(foldingDisposable);

  console.debug("Bruin activated successfully");
}


