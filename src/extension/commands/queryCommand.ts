import { Uri, window, workspace } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinQueryOutput } from "../../bruin/queryCommand";
import * as vscode from "vscode";

export const getQueryOutput = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined) => {
  const editor = window.activeTextEditor;
  if (!editor) {
    window.showErrorMessage('No active editor found');
    return;
  }

  // Get the selected text (if any)
  const selection = editor.selection;
  const selectedQuery = selection && !selection.isEmpty 
    ? editor.document.getText(new vscode.Range(selection.start, selection.end))
    : "";

  const workspaceFolder = workspace.getWorkspaceFolder(editor.document.uri);
  if (!workspaceFolder) {
    window.showErrorMessage('No workspace folder found');
    return;
  }
  if (!lastRenderedDocumentUri) {
    return;
  }

  const output = new BruinQueryOutput(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(workspaceFolder.uri.fsPath) as string
  );

  // Pass the query only if there is a valid selection, otherwise leave it empty.
  await output.getOutput(environment, lastRenderedDocumentUri.fsPath, limit, { query: selectedQuery });
};

