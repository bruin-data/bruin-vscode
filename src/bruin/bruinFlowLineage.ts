import { BruinCommandOptions } from "../types";
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
   * Parse asset with column-level lineage information using the -c flag
   *
   * @param {string} filePath - The path of the asset to be parsed.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<any>} A promise that resolves with the column lineage data.
   */
  public async parseAssetColumnLineage(
    filePath: string,
    { flags = ["parse-asset", "-c"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<any> {
    try {
      if (isConfigFile(filePath)) {
        throw new Error("Cannot parse column lineage for config files");
      }
      
      const result = await this.run([...flags, filePath], { ignoresErrors });
      const columnLineageData = JSON.parse(result);
      
      console.log("Column lineage data:", columnLineageData);
      
      // Enrich upstream assets with their column information
      if (columnLineageData.asset && columnLineageData.asset.upstreams) {
        const pipelinePath = await getCurrentPipelinePath(filePath);
        
        if (pipelinePath) {
          for (const upstream of columnLineageData.asset.upstreams) {
            try {
              // Get pipeline data to find upstream asset details
              const pipelineResult = await this.run(["parse-pipeline", pipelinePath], { ignoresErrors: true });
              const pipelineData = JSON.parse(pipelineResult);
              
              // Find the upstream asset in pipeline data
              const upstreamAsset = pipelineData.assets.find((asset: any) => asset.name === upstream.value);
              if (upstreamAsset && upstreamAsset.columns) {
                upstream.columns = upstreamAsset.columns;
                upstream.type = upstreamAsset.type;
                upstream.path = upstreamAsset.definition_file?.path;
              }
            } catch (err) {
              console.warn(`Could not fetch column data for upstream asset: ${upstream.value}`, err);
              upstream.columns = [];
            }
          }
        }
      }
      
      // Return the enriched column lineage data
      return columnLineageData;
    } catch (error: any) {
      const errorMessage = typeof error === "object" && error.error
        ? error.error 
        : String(error);
  
      if (errorMessage.includes("No help topic for")) {
        const formattedError = "Bruin CLI is not installed or is outdated. Please install or update Bruin CLI to use this feature.";
        vscode.window.showErrorMessage(formattedError);
        throw new Error(formattedError);
      } else {
        console.error("Column lineage parsing error", error);
        throw new Error(errorMessage);
      }
    }
  }
}
