import { Uri } from "vscode";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";
import { BruinInternalParse } from "../../bruin/bruinInternalParse";
import { BruinInternalPatch } from "../../bruin/bruinInternalPatch";
import { BruinLineageInternalParse } from "../../bruin/bruinFlowLineage";
import { BruinPanel } from "../../panels/BruinPanel";
import { EnhancedPipelineData, PipelineColumnInfo } from "../../types";
import { getCurrentPipelinePath } from "../../bruin/bruinUtils";
import * as path from "path";
import * as fs from "fs";
import { fileCache } from "../../utils/fileCache";

/**
 * Get the full path to the pipeline file (pipeline.yml or pipeline.yaml)
 * @param filePath - The asset file path or pipeline directory path
 * @returns Full path to the pipeline file, or undefined if not found
 */
export const getFullPipelineFilePath = async (filePath: string): Promise<string | undefined> => {
  // If it's already a pipeline file, return it
  if (filePath.endsWith("pipeline.yml") || filePath.endsWith("pipeline.yaml")) {
    return filePath;
  }
  
  // Get the pipeline directory
  const pipelineDir = await getCurrentPipelinePath(filePath);
  if (!pipelineDir) {
    return undefined;
  }
  
  // Check for pipeline.yml first, then pipeline.yaml
  const pipelineYml = path.join(pipelineDir, "pipeline.yml");
  const pipelineYaml = path.join(pipelineDir, "pipeline.yaml");
  
  try {
    await fs.promises.access(pipelineYml, fs.constants.F_OK);
    return pipelineYml;
  } catch {
    try {
      await fs.promises.access(pipelineYaml, fs.constants.F_OK);
      return pipelineYaml;
    } catch {
      return undefined;
    }
  }
};

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

export const parsePipelineCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const bruinExec = getBruinExecutablePath();
  const parsed = new BruinLineageInternalParse(
    bruinExec, ""
  );
  await parsed.parsePipelineConfig(lastRenderedDocumentUri.fsPath);
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
  
  // After successful patch, invalidate file cache and re-parse the asset to update the webview
  if (success) {
    // Clear file cache for the modified file
    fileCache.invalidate(lastRenderedDocumentUri.fsPath);
    
    await parseAssetCommand(lastRenderedDocumentUri);
  }
};

export const patchPipelineCommand = async (body: object, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  
  const filePath = lastRenderedDocumentUri.fsPath;
  
  // Get the full path to the pipeline file
  const pipelineFilePath = await getFullPipelineFilePath(filePath);
  
  if (!pipelineFilePath) {
    console.error("Could not find pipeline file for:", filePath);
    BruinPanel.postMessage("patch-message", { 
      status: "error", 
      message: "Could not find pipeline.yml or pipeline.yaml file" 
    });
    return;
  }
  
  const patched = new BruinInternalPatch(
    getBruinExecutablePath(),
     ""
  );
  
  const success = await patched.patchPipeline(body, pipelineFilePath);
  
  // After successful patch, invalidate file cache and re-parse the pipeline to update the webview
  if (success) {
    // Clear file cache for the modified pipeline file
    fileCache.invalidate(pipelineFilePath);
    
    await parsePipelineCommand(lastRenderedDocumentUri);
    
    // Also send the updated variables back to the webview
    const pipelineParser = new BruinLineageInternalParse(
      getBruinExecutablePath(),
      ""
    );
    
    try {
      const pipelineData = await pipelineParser.parsePipelineConfig(lastRenderedDocumentUri.fsPath);
      BruinPanel.postMessage("pipeline-variables-message", { 
        status: "success", 
        message: pipelineData 
      });
    } catch (error) {
      console.error("Failed to send variables to webview:", error);
    }
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
