import { Uri } from "vscode";
import { BruinLineageInternalParse } from "../../bruin/bruinFlowLineage";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const flowLineageCommand = async (lastRenderedDocumentUri:  Uri | undefined, panel?: string) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const flowLineage = new BruinLineageInternalParse(
    getBruinExecutablePath(),
    ""
  );

  // First call standard asset lineage (for test compatibility)
  await flowLineage.parseAssetLineage(lastRenderedDocumentUri.fsPath, panel);
  
  // Then call column-aware version for enhanced lineage data
  await flowLineage.parseAssetLineageWithColumns(lastRenderedDocumentUri.fsPath, panel, {}, true);
};
  

  

/**
 * Flow lineage command with column-level information.
 * Extends the standard flow lineage to include column-level lineage data.
 * 
 * @param lastRenderedDocumentUri - URI of the current document
 * @param panel - Optional panel name for messaging
 * @param includeColumns - Whether to include column-level information (default: true)
 * @returns Promise that resolves when lineage parsing is complete
 */
export const flowLineageWithColumnsCommand = async (
  lastRenderedDocumentUri: Uri | undefined, 
  panel?: string,
  includeColumns: boolean = true
) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  
  const flowLineage = new BruinLineageInternalParse(
    getBruinExecutablePath(),
    ""
  );
  
  try {
    await flowLineage.parseAssetLineageWithColumns(
      lastRenderedDocumentUri.fsPath, 
      panel,
      {},
      includeColumns
    );
  } catch (error) {
    console.error("Error in flow lineage with columns command:", error);
    throw error;
  }
};

/**
 * Get column-level lineage information for the entire pipeline.
 * This command provides comprehensive column lineage analysis.
 * 
 * @param lastRenderedDocumentUri - URI of the current document
 * @returns Promise with detailed column lineage information
 */
export const getColumnLineageCommand = async (
  lastRenderedDocumentUri: Uri | undefined
) => {
  if (!lastRenderedDocumentUri) {
    return null;
  }
  
  const flowLineage = new BruinLineageInternalParse(
    getBruinExecutablePath(),
    ""
  );
  
};
  