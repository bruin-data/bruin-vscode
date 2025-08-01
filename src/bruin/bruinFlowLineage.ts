  import { BruinCommandOptions, EnhancedPipelineData, PipelineColumnInfo } from "../types";
import { BruinCommand } from "./bruinCommand";
import { updateLineageData } from "../panels/LineagePanel";
import { getCurrentPipelinePath } from "./bruinUtils";
import * as vscode from "vscode";
import { isConfigFile } from "../utilities/helperUtils";
import { BruinPanel } from "../panels/BruinPanel";
/**
 * Extends the BruinCommand class to implement the bruin run command on Bruin assets.
 */

export class BruinLineageInternalParse extends BruinCommand {

  
  /**
   * Parses pipeline.yml and returns pipeline-level metadata (name, schedule, etc).
   * Does NOT look for assets or post to LineagePanel.
   */
  public async parsePipelineConfig(
    filePath: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<any> {
    const result = await this.run([...flags, filePath], { ignoresErrors });
    const pipelineData = JSON.parse(result);
    console.log("Pipeline data from parsePipelineConfig", pipelineData);
    return {
      name: pipelineData.name || '',
      schedule: pipelineData.schedule || '',
      description: pipelineData.description || '',
      raw: pipelineData
    };
  }



  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'run' command string.
   */
  // bruin internal parse-pipeline pipeline-one
  protected bruinCommand(): string {
    return "internal";
  }

  /**
   * Run a Bruin Asset based on it's path with optional flags and error handling.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {string} filePath - The path of the asset to be run.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */
  public async parseAssetLineage(
    filePath: string,
    panel?: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    try {
      if(isConfigFile(filePath)) {
        return;
      }
      const result = await this.run([...flags, await getCurrentPipelinePath(filePath) as string], { ignoresErrors });
      const pipelineData = JSON.parse(result);
      const asset = pipelineData.assets.find(
        (asset: any) => asset.definition_file.path === filePath
      );
      if(panel === "BruinPanel"){
        const pipelineAssets = JSON.parse(result).assets;
        BruinPanel.postMessage("pipeline-assets", {
          status: "success",
          message: pipelineAssets,
        });
      }
      if (asset) {
        updateLineageData({
          status: "success",
          message: {
            id: asset.id,
            name: asset.name,
            pipeline: result,
          },
        });
      } else {
        throw new Error("Asset not found in pipeline data");
      }
    } catch (error : any) {
      const errorMessage =  typeof error === "object" && error.error
        ? error.error 
        : String(error);
  
      if (errorMessage.includes("No help topic for")) {
        const formattedError = "Bruin CLI is not installed or is outdated. Please install or update Bruin CLI to use this feature.";
        vscode.window.showErrorMessage(formattedError);
        updateLineageData({
          status: "error",
          message: formattedError,
        });
      } else {
        updateLineageData({
          status: "error",
          message: errorMessage,
        });
      }
  
      console.error("Parsing command error", error);
    }
  }

  /**
   * Parse asset lineage with column-level information.
   * Extends the standard asset lineage parsing to include column lineage data.
   * 
   * @param filePath - The path of the asset to be analyzed
   * @param panel - Optional panel name for messaging
   * @param options - Command options including flags and error handling
   * @param includeColumns - Whether to include column-level lineage information
   * @returns Promise that resolves when the execution is complete or an error is caught
   */
  public async parseAssetLineageWithColumns(
    filePath: string,
    panel?: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {},
    includeColumns: boolean = true
  ): Promise<void> {
    try {
      if(isConfigFile(filePath)) {
        return;
      }
      
      // Add -c flag if requested for column information
      const enhancedFlags = includeColumns 
        ? [...flags, "-c"] 
        : flags;
      
      const result = await this.run([...enhancedFlags, await getCurrentPipelinePath(filePath) as string], { ignoresErrors });
      const pipelineData = JSON.parse(result);
      const asset = pipelineData.assets.find(
        (asset: any) => asset.definition_file.path === filePath
      );
      
      if(panel === "BruinPanel"){
        const pipelineAssets = JSON.parse(result).assets;
        BruinPanel.postMessage("pipeline-assets", {
          status: "success",
          message: pipelineAssets,
        });
        
        // Send additional column lineage data if available
        if (includeColumns && pipelineData.column_lineage) {
          BruinPanel.postMessage("column-lineage", {
            status: "success",
            message: pipelineData.column_lineage,
          });
        }
      }
      
      if (asset) {
        const lineageData = {
          id: asset.id,
          name: asset.name,
          pipeline: result,
          // Always include column lineage data if columns are requested
          ...(includeColumns && {
            columnLineage: pipelineData.column_lineage || {},
            // Also include asset-level column information for validation
            hasColumnData: Boolean(
              pipelineData.column_lineage || 
              pipelineData.assets?.some((a: any) => 
                a.columns?.length > 0 && 
                a.columns.some((col: any) => col.upstreams?.length > 0)
              )
            )
          })
        };
        
        updateLineageData({
          status: "success",
          message: lineageData,
        });
      } else {
        throw new Error("Asset not found in pipeline data");
      }
    } catch (error : any) {
      const errorMessage =  typeof error === "object" && error.error
        ? error.error 
        : String(error);
  
      if (errorMessage.includes("No help topic for")) {
        const formattedError = "Bruin CLI is not installed or is outdated. Please install or update Bruin CLI to use this feature.";
        vscode.window.showErrorMessage(formattedError);
        updateLineageData({
          status: "error",
          message: formattedError,
        });
      } else {
        updateLineageData({
          status: "error",
          message: errorMessage,
        });
      }
  
      console.error("Parsing command error", error);
    }
  }

}