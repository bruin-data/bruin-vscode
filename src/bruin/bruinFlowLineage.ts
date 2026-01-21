  import { BruinCommandOptions, EnhancedPipelineData, PipelineColumnInfo } from "../types";
import { BruinCommand } from "./bruinCommand";
import { updateLineageData } from "../panels/LineagePanel";
import { getCurrentPipelinePath } from "./bruinUtils";
import * as vscode from "vscode";
import { isConfigFile } from "../utilities/helperUtils";
import { BruinPanel } from "../panels/BruinPanel";

export class BruinLineageInternalParse extends BruinCommand {
  
  /**
   * Parses pipeline.yml and returns pipeline-level metadata (name, schedule, etc).
   */
  public async parsePipelineConfig(
    filePath: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<any> {
    const cliResult = await this.run([...flags, filePath], { ignoresErrors });
    const pipelineData = JSON.parse(cliResult);
    console.log("Pipeline data from parsePipelineConfig", pipelineData);
    const parsedResult: any = {
      name: pipelineData.name || '',
      schedule: pipelineData.schedule || '',
      description: pipelineData.description || '',
      raw: pipelineData
    };
    
    // Only include variables if they exist in the pipeline data
    if (pipelineData.variables) {
      parsedResult.variables = pipelineData.variables;
    }
    
    return parsedResult;
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
    return this.parseAssetLineageWithColumns(filePath, panel, { flags, ignoresErrors }, false);
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
      // For pipeline.yml files, show full pipeline lineage instead of individual asset
      const isPipelineFile = filePath.endsWith("pipeline.yml") || filePath.endsWith("pipeline.yaml");
      if(isConfigFile(filePath) && !isPipelineFile) {
        return;
      }
      
      // Add -c flag if requested for column information
      const enhancedFlags = includeColumns 
        ? [...flags, "-c"] 
        : flags;
      
      const pipelinePath = isPipelineFile ? filePath : await getCurrentPipelinePath(filePath) as string;
      const result = await this.run([...enhancedFlags, pipelinePath], { ignoresErrors });
      const pipelineData = JSON.parse(result);
      
      if(panel === "BruinPanel"){
        BruinPanel.postMessage("pipeline-assets", {
          status: "success",
          message: pipelineData.assets,
        });
        
        // Send additional column lineage data if available
        if (includeColumns && pipelineData.column_lineage) {
          BruinPanel.postMessage("column-lineage", {
            status: "success",
            message: pipelineData.column_lineage,
          });
        }
      }
      
      // Helper function to check for column data
      const hasColumnData = includeColumns && Boolean(
        pipelineData.column_lineage || 
        pipelineData.assets?.some((a: any) => 
          a.columns?.length > 0 && 
          a.columns.some((col: any) => col.upstreams?.length > 0)
        )
      );

      if (isPipelineFile) {
        // For pipeline.yml files, show full pipeline lineage with column data
        const lineageData: any = {
          pipelineData: pipelineData,
          name: pipelineData.name || "Pipeline",
          pipeline: result,
          isPipelineView: true,
        };
        
        if (includeColumns) {
          lineageData.columnLineage = pipelineData.column_lineage || {};
          lineageData.hasColumnData = hasColumnData;
        }
        
        updateLineageData({
          status: "success",
          message: lineageData,
        });
      } else {
        // For individual assets, find the specific asset
        const asset = pipelineData.assets.find(
          (asset: any) => asset.definition_file.path === filePath
        );
        
        if (asset) {
          const lineageData: any = {
            id: asset.id,
            name: asset.name,
            pipeline: result,
          };
          
          if (includeColumns) {
            lineageData.columnLineage = pipelineData.column_lineage || {};
            lineageData.hasColumnData = hasColumnData;
          }
        
          updateLineageData({
            status: "success",
            message: lineageData,
          });
        } else {
          throw new Error("Asset not found in pipeline data");
        }
      }
    } catch (error : any) {
      const errorMessage =  typeof error === "object" && error.error
        ? error.error 
        : String(error);
  
      if (errorMessage.includes("No help topic for")) {
        const formattedError = "Bruin CLI command not recognized. Please check that Bruin CLI is installed and the command is correct.";
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
  
      if (!BruinCommand.isTestMode) {
        console.error("Parsing command error", error);
      }
    }
  }

}