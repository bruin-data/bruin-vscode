import { Uri, window, workspace } from "vscode";
import { BruinQueryOutput } from "../../bruin/queryOutput";
import * as vscode from "vscode";
import { BruinExportQueryOutput } from "../../bruin/exportQueryOutput";
import { QueryPreviewPanel } from "../../panels/QueryPreviewPanel";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";
import { isBruinSqlAsset, isYamlBruinAsset } from "../../utilities/helperUtils";

export const getQueryOutput = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined, tabId?: string, startDate?: string, endDate?: string, connectionName?: string) => {
  let editor = window.activeTextEditor;
  if (!editor) {
    editor = lastRenderedDocumentUri && await window.showTextDocument(lastRenderedDocumentUri);
  }
  if (!editor) {
    window.showErrorMessage('No active editor found');
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
  
  const currentTabId = tabId || 'tab-1';
  
  // Check if this is an asset file (SQL or YAML)
  const isSqlAsset = await isBruinSqlAsset(lastRenderedDocumentUri.fsPath);
  const isYamlAsset = await isYamlBruinAsset(lastRenderedDocumentUri.fsPath);
  const isAsset = isSqlAsset || isYamlAsset;
  
  // Check if we already have a stored query for this tab (from CodeLens)
  let selectedQuery = QueryPreviewPanel.getTabQuery(currentTabId);
  console.log("Stored query from tab:", selectedQuery ? "exists" : "none");
  
  // If no stored query, check for text selection
  if (!selectedQuery) {
    // Get the selected text (if any)
    const selection = editor.selection;
    selectedQuery = selection && !selection.isEmpty 
      ? editor.document.getText(new vscode.Range(selection.start, selection.end))
      : "";
    console.log("Text selection:", selectedQuery ? `"${selectedQuery.substring(0, 50)}..."` : "none");
  }

  // Read file content once for non-asset files (to avoid duplicate reads)
  let fileContentString = "";
  if (!isAsset && (!selectedQuery || !connectionName)) {
    try {
      const fileContent = await workspace.fs.readFile(lastRenderedDocumentUri);
      fileContentString = Buffer.from(fileContent).toString('utf-8');
    } catch (error) {
      console.error("Error reading file:", error);
      fileContentString = "";
    }
  }
  
  // If still no query and it's not an asset file, use the entire file content
  if (!selectedQuery && !isAsset && fileContentString) {
    // Remove connection comment lines from the query content
    selectedQuery = fileContentString
      .split('\n')
      .filter((line: string) => !line.trim().match(/^--\s*connection:\s*/i))
      .join('\n')
      .trim();
  }
  
  // Detect connection name from file content if not provided
  let detectedConnectionName = connectionName;
  if (!isAsset && !detectedConnectionName && fileContentString) {
    // Look for connection comment pattern: -- connection: connection-name
    const connectionMatch = fileContentString.match(/--\s*connection:\s*([^\n\r]+)/i);
    if (connectionMatch) {
      detectedConnectionName = connectionMatch[1].trim();
    }
  }

  // Store the query in the preview panel for the specific tab
  QueryPreviewPanel.setTabQuery(currentTabId, selectedQuery);
  QueryPreviewPanel.setTabAssetPath(currentTabId, lastRenderedDocumentUri.fsPath);

  const output = new BruinQueryOutput(
    getBruinExecutablePath(),
    workspaceFolder.uri.fsPath
  );
  
  // For asset files: if we have a selected query, use the -q flag; otherwise use the asset path
  // For non-asset files: always use the query content
  const queryToPass = selectedQuery;
  
  await output.getOutput(environment, lastRenderedDocumentUri.fsPath, limit, tabId, detectedConnectionName, startDate, endDate, { query: queryToPass, isAsset });
};

export const exportQueryResults = async (lastRenderedDocumentUri: Uri | undefined, tabId?: string, connectionName?: string) => {
  const currentTabId = tabId || 'tab-1';
  
  // Try to get the asset path associated with this tab
  let assetPath = QueryPreviewPanel.getTabAssetPath(currentTabId);
  
  // If no asset path is found for this tab, use the lastRenderedDocumentUri if available
  if (!assetPath && lastRenderedDocumentUri) {
    assetPath = lastRenderedDocumentUri.fsPath;
  }
  
  if (!assetPath) {
    window.showErrorMessage('No file is associated with this tab');
    return;
  }
  
  try {
    const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(assetPath));
    if (!workspaceFolder) {
      window.showErrorMessage('No workspace folder found');
      return;
    }
    
    // Get the query for the specific tab
    const tabQuery = QueryPreviewPanel.getTabQuery(currentTabId);

    const output = new BruinExportQueryOutput(
      getBruinExecutablePath(),
      workspaceFolder.uri.fsPath
    );
    
    // Use the stored query for the specific tab
    await output.exportResults(assetPath, connectionName, { query: tabQuery });
  } catch (error) {
    console.error("Error exporting query data:", error);
  }
};