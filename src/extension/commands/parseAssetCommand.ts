import { Uri } from "vscode";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";
import { BruinInternalParse } from "../../bruin/bruinInternalParse";
import { BruinInternalPatch } from "../../bruin/bruinInternalPatch";
import { BruinLineageInternalParse } from "../../bruin/bruinFlowLineage";
import { EnhancedPipelineData, PipelineColumnInfo } from "../../types";

export const parseAssetCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const bruinExec = getBruinExecutablePath();
  const parsed = new BruinInternalParse(
    bruinExec, ""
  );
  await parsed.parseAsset(lastRenderedDocumentUri.fsPath);
};

export const patchAssetCommand = async (body: object, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const patched = new BruinInternalPatch(
    getBruinExecutablePath(),
     ""
  );
  const success = await patched.patchAsset(body, lastRenderedDocumentUri.fsPath);
  
  // After successful patch, re-parse the asset to update the webview
  if (success) {
    await parseAssetCommand(lastRenderedDocumentUri);
  }
};



/**
 * Parse asset lineage with column-level information.
 * This command extends the standard asset lineage parsing to include column lineage data using the -c flag.
 * 
 * @param lastRenderedDocumentUri - URI of the current document
 * @param panel - Optional panel name for messaging
 * @param includeColumns - Whether to include column-level information (default: true)
 * @returns Promise that resolves when parsing is complete
 */
export const parseAssetLineageWithColumnsCommand = async (
  lastRenderedDocumentUri: Uri | undefined,
  panel?: string,
  includeColumns: boolean = true
) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  
  const bruinExec = getBruinExecutablePath();
  const parser = new BruinLineageInternalParse(bruinExec, "");
  
  try {
    await parser.parseAssetLineageWithColumns(
      lastRenderedDocumentUri.fsPath,
      panel,
      {},
      includeColumns
    );
  } catch (error) {
    console.error("Error parsing asset lineage with columns:", error);
    throw error;
  }
};




export const convertFileToAssetCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const patched = new BruinInternalPatch(
    getBruinExecutablePath(),
     ""
  );
  await patched.convertFileToAsset(lastRenderedDocumentUri.fsPath);
};
