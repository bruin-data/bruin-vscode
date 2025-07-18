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
  await patched.patchAsset(body, lastRenderedDocumentUri.fsPath);
};

/**
 * Parse pipeline with column-level information.
 * This command extends the standard pipeline parsing to include column lineage data using the -c flag.
 * 
 * @param lastRenderedDocumentUri - URI of the current document
 * @param includeColumns - Whether to include column-level information (default: true)
 * @returns Promise that resolves when parsing is complete
 */
export const parsePipelineWithColumnsCommand = async (
  lastRenderedDocumentUri: Uri | undefined,
  includeColumns: boolean = true
): Promise<EnhancedPipelineData | undefined> => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  
  const bruinExec = getBruinExecutablePath();
  const parser = new BruinLineageInternalParse(bruinExec, "");
  
  try {
    if (includeColumns) {
      return await parser.parsePipelineWithColumns(lastRenderedDocumentUri.fsPath);
    } else {
      return await parser.parsePipelineConfig(lastRenderedDocumentUri.fsPath);
    }
  } catch (error) {
    console.error("Error parsing pipeline with columns:", error);
    throw error;
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

/**
 * Get comprehensive column information for all assets in a pipeline.
 * This command provides detailed column metadata and lineage information.
 * 
 * @param lastRenderedDocumentUri - URI of the current document
 * @returns Promise with detailed column information for all assets
 */
export const getPipelineColumnsInfoCommand = async (
  lastRenderedDocumentUri: Uri | undefined
): Promise<PipelineColumnInfo | null> => {
  if (!lastRenderedDocumentUri) {
    return null;
  }
  
  const bruinExec = getBruinExecutablePath();
  const parser = new BruinLineageInternalParse(bruinExec, "");
  
  try {
    return await parser.getPipelineColumnsInfo(lastRenderedDocumentUri.fsPath);
  } catch (error) {
    console.error("Error getting pipeline columns info:", error);
    throw error;
  }
};

/**
 * Parse pipeline with schema information using the --with-schema flag.
 * This provides an alternative way to get column information.
 * 
 * @param lastRenderedDocumentUri - URI of the current document
 * @returns Promise with pipeline data including schema information
 */
export const parsePipelineWithSchemaCommand = async (
  lastRenderedDocumentUri: Uri | undefined
): Promise<EnhancedPipelineData | null> => {
  if (!lastRenderedDocumentUri) {
    return null;
  }
  
  const bruinExec = getBruinExecutablePath();
  const parser = new BruinLineageInternalParse(bruinExec, "");
  
  try {
    return await parser.parsePipelineWithSchema(lastRenderedDocumentUri.fsPath);
  } catch (error) {
    console.error("Error parsing pipeline with schema:", error);
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
