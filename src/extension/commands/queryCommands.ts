import { Uri, window, workspace } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinQueryOutput } from "../../bruin/queryOutput";
import * as vscode from "vscode";
import { BruinExportQueryOutput } from "../../bruin/exportQueryOutput";

export const getQueryOutput = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined) => {
  let editor = window.activeTextEditor;
  if (!editor) {
    editor = lastRenderedDocumentUri && await window.showTextDocument(lastRenderedDocumentUri);
  }
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

export const exportQueryResults = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  try {
    const workspaceFolder = workspace.getWorkspaceFolder(lastRenderedDocumentUri);
    if (!workspaceFolder) {
      window.showErrorMessage('No workspace folder found');
      return;
    }
    const output = new BruinExportQueryOutput(
      getDefaultBruinExecutablePath(),
      await bruinWorkspaceDirectory(workspaceFolder.uri.fsPath) as string
    );
    await output.exportResults(lastRenderedDocumentUri.fsPath);
  } catch (error) {
    console.error("Error exporting query data:", error);
  }
};