import path = require("path");
import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";

/**
 * Gets the path to the Bruin executable specified by the workspace
 * configuration, if present.
 *
 * @returns The path to the Bruin executable specified in the workspace
 * configuration, or just "bruin" if not present (in which case the system path
 * will be searched).
 */
export function getDefaultBruinExecutablePath(): string {
  let bruinExecutable = "";
  //const useBruinFromPath = vscode.workspace.getConfiguration("bruin").get<boolean>("useBruinFromPath") || false;
  const bruinConfig = vscode.workspace.getConfiguration("bruin");
  bruinExecutable = bruinConfig.get<string>("executable") || "";

  if (bruinExecutable.length > 0) {
    // If a path is provided, use it
    console.log(`Using custom Bruin executable at ${bruinExecutable}`);
    return bruinExecutable;
  } else {
    // Attempt to find 'bruin' in the system's PATH (works for Git Bash)
    const paths = (process.env.PATH || "").split(path.delimiter);
    for (const p of paths) {
      const executablePath = path.join(p, process.platform === "win32" ? "bruin.exe" : "bruin");
      try {
        // Test if the file exists and is executable
        fs.accessSync(executablePath, fs.constants.X_OK);
        console.log(`Found 'bruin' at ${executablePath}`);
        bruinExecutable = executablePath;
        return bruinExecutable;
      } catch (err) {
        // Continue searching if not found or not executable
        continue;
      }
    }
    // If all else fails, check in ~/.local/bin for Windows (Git Bash)
    if (process.platform === "win32") {
      const homePath = os.homedir();
      const localBinPath = path.join(homePath, ".local", "bin");
      const executablePathLocal = path.join(localBinPath, "bruin.exe");
      try {
        fs.accessSync(executablePathLocal, fs.constants.X_OK);
        bruinExecutable = executablePathLocal;
        return bruinExecutable;
      } catch (err) {
        // Continue searching if not found or not executable
      }
    }
    // If all else fails, provide a meaningful message or default
    console.log("Could not find 'bruin' in PATH. Using 'bruin' as the default executable.");
    // look for bruin in the PATH
    const homePath = os.homedir();
    const localBinPath = path.join(homePath, ".local", "bin");
    bruinExecutable = path.join(localBinPath, "bruin");
    console.log(`Using 'bruin' by joining the path: ${localBinPath}`);
    return bruinExecutable;
  }
}
export function getPathSeparator(): string {
  const bruinConfig = vscode.workspace.getConfiguration("bruin");
  const pathSeparator = bruinConfig.get<string>("pathSeparator") || "/";
  return pathSeparator;
}

let documentInitState = new Map();

export async function toggleFoldingsCommand(toggled: boolean): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  
  const docUri = editor.document.uri.toString();
  
  // Get the Bruin-specific folding ranges using the provider
  const bruinRanges = bruinFoldingRangeProvider(editor.document);
  
  if (toggled) {
    // Fold only Bruin regions
    if (bruinRanges.length > 0) {
      await vscode.commands.executeCommand("editor.fold", {
        selectionLines: bruinRanges.map(range => range.start),
        levels: 1
      });
      console.log(`Folded ${bruinRanges.length} Bruin regions in ${editor.document.uri}`);
    }
  } else {
    // Unfold only Bruin regions
    if (bruinRanges.length > 0) {
      const selections: vscode.Selection[] = bruinRanges.map(range => 
        new vscode.Selection(range.start, 0, range.start, 0)
      );
      
      editor.selections = selections;
      await vscode.commands.executeCommand("editor.unfold");
      
      // Restore original selection
      const originalSelection = editor.selection;
      editor.selection = originalSelection;
      
      console.log(`Unfolded ${bruinRanges.length} Bruin regions in ${editor.document.uri}`);
    }
  }

  // Mark this document as initialized
  documentInitState.set(docUri, true);
}


/**
 * Applies the initial folding state to a document based on the user's configuration settings.
 * It affects the document only when it is first focused to ensure that user's manual adjustments are maintained.
 *
 * @param {vscode.TextEditor} editor - The active text editor where the folding commands will be executed.
 * @returns {void}
 */

export function applyFoldingStateBasedOnConfiguration(editor: vscode.TextEditor | undefined): void {
  if (editor) {
    const docUri = editor.document.uri.toString();
    const config = vscode.workspace.getConfiguration();
    const defaultFoldingState = config.get("bruin.FoldingState", "folded");

    // Check if the document has already been initialized
    if (!documentInitState.has(docUri)) {
      if (defaultFoldingState === "folded") {
        vscode.commands.executeCommand("editor.foldAllMarkerRegions", { uri: editor.document.uri });
        console.log("Folding all regions", editor.document.uri);
      } else {
        vscode.commands.executeCommand("editor.unfoldAll", { uri: editor.document.uri });
        console.log("Unfolding all regions", editor.document.uri);
      }
      // Mark this document as initialized
      documentInitState.set(docUri, true);
    }
  }
}

/**
 * Sets up an event listener that triggers the `applyFoldingStateBasedOnConfiguration` function whenever the active text editor changes.
 * This ensures that the folding state is applied the first time any document is opened or focused.
 *
 * @returns {void}
 */
export function setupFoldingOnOpen(): void {
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    applyFoldingStateBasedOnConfiguration(editor);
  });
}

/**
 * Clears the document initialization state tracking map. Called when the folding configuration changes,
 * allowing the new settings to be applied the next time any document is opened.
 *
 * @returns {void}
 */
function resetDocumentStates(): void {
  documentInitState.clear();
}

/** Subscribe to configuration changes and reset the document states when the
 * default folding state is changed.
 @returns void
*/
export function subscribeToConfigurationChanges() {
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("bruin.FoldingState")) {
      resetDocumentStates();
    }
  });
}
