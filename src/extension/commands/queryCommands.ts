import { Uri, window, workspace } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinQueryOutput } from "../../bruin/queryOutput";
import * as vscode from "vscode";
import { BruinExportQueryOutput } from "../../bruin/exportQueryOutput";
import { QueryPreviewPanel } from "../../panels/QueryPreviewPanel";

export const getQueryOutput = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined, tabId?: string) => {
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

  // Store the query in the preview panel for the specific tab
  QueryPreviewPanel.setTabQuery(tabId || 'tab-1', selectedQuery);

  const output = new BruinQueryOutput(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(workspaceFolder.uri.fsPath) as string
  );

  // Pass the query only if there is a valid selection, otherwise leave it empty.
  await output.getOutput(environment, lastRenderedDocumentUri.fsPath, limit, { query: selectedQuery });
};

export const exportQueryResults = async (lastRenderedDocumentUri: Uri | undefined, tabId?: string) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  try {
    const workspaceFolder = workspace.getWorkspaceFolder(lastRenderedDocumentUri);
    if (!workspaceFolder) {
      window.showErrorMessage('No workspace folder found');
      return;
    }
    
    // Get the query for the specific tab
    const tabQuery = QueryPreviewPanel.getTabQuery(tabId || 'tab-1');

    const output = new BruinExportQueryOutput(
      getDefaultBruinExecutablePath(),
      await bruinWorkspaceDirectory(workspaceFolder.uri.fsPath) as string
    );
    
    // Use the stored query for the specific tab
    await output.exportResults(lastRenderedDocumentUri.fsPath, { query: tabQuery });
  } catch (error) {
    console.error("Error exporting query data:", error);
  }
};