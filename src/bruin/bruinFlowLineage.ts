import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { LineagePanel } from "../panels/LineagePanel";
import { getCurrentPipelinePath } from "./bruinUtils";
import * as vscode from "vscode";
import { isConfigFile } from "../utilities/helperUtils";
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
  
      if (asset) {
        LineagePanel.postMessage("flow-lineage-message", {
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
        LineagePanel.postMessage("flow-lineage-message", {
          status: "error",
          message: formattedError,
        });
      } else {
        LineagePanel.postMessage("flow-lineage-message", {
          status: "error",
          message: errorMessage,
        });
      }
  
      console.error("Parsing command error", error);
    }
  }
}
