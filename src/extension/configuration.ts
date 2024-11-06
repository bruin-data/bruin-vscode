import path = require("path");
import * as vscode from "vscode";
import * as fs from "fs";

/**
 * Gets the path to the Bruin executable specified by the workspace
 * configuration, if present.
 *
 * @returns The path to the Bruin executable specified in the workspace
 * configuration, or just "bruin" if not present (in which case the system path
 * will be searched).
 */
export function getDefaultBruinExecutablePath(): string {
  const bruinConfig = vscode.workspace.getConfiguration("bruin");
  const bruinExecutable = bruinConfig.get<string>("executable") || "";

  if (bruinExecutable.length > 0) {
    // If a path is provided, use it
    return bruinExecutable;
  } else {
    // Attempt to find 'bruin' in the system's PATH
    const paths = (process.env.PATH || "").split(path.delimiter);
    for (const p of paths) {
      const executablePath = path.join(p, process.platform === 'win32'? 'bruin.exe' : 'bruin');
      try {
        // Test if the file exists and is executable
        fs.accessSync(executablePath, fs.constants.X_OK);
        return executablePath;
      } catch (err) {
        // Continue searching if not found or not executable
        continue;
      }
    }
    // If all else fails, provide a meaningful message or default
    throw new Error(`Unable to find 'bruin' executable in system's PATH. Please set the 'bruin.executable' setting in VS Code.`);
  }
}
export function getPathSeparator(): string {
  const bruinConfig = vscode.workspace.getConfiguration("bruin");
  const pathSeparator = bruinConfig.get<string>("pathSeparator") || "/";
  return pathSeparator;
}

let documentInitState = new Map();

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
    const defaultFoldingState = config.get("bruin.defaultFoldingState", "folded");

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
    if (e.affectsConfiguration("bruin.defaultFoldingState")) {
      resetDocumentStates();
    }
  });
}
