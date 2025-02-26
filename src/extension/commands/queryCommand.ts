import { Uri, window, workspace } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinQueryOutput } from "../../bruin/queryCommand";
import * as vscode from "vscode";

export const executeDirectQuery = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined) => {
  const editor = window.activeTextEditor;
  if (!editor) {
    window.showErrorMessage('No active editor found');
    return;
  }

  let query: string;
  const selection = editor.selection;
  if (selection && !selection.isEmpty) {
    const selectionRange = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
    query = editor.document.getText(selectionRange);
  } else {
    query = "";
  }

  if (!query.trim()) {
    return;
  }

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
    await bruinWorkspaceDirectory(workspaceFolder.uri.fsPath)!! as string
  );

  await output.getOutput(environment, lastRenderedDocumentUri.fsPath, limit, { query });
};

export const getQueryOutput = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const output = new BruinQueryOutput(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  const queryResult = await output.getOutput(environment, lastRenderedDocumentUri.fsPath, limit);
  return queryResult;
};

