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
   * Parses pipeline.yml with column-level information.
   * Extends the standard pipeline parsing to include column lineage.
   * 
   * @param filePath - Path to the pipeline.yml file
   * @param options - Command options including flags and error handling
   * @returns Promise with enhanced pipeline data including column information
   */
  public async parsePipelineWithColumns(
    filePath: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<EnhancedPipelineData> {
    // Add the -c flag to get column-level information
    const columnsFlags = [...flags, "-c"];
    const result = await this.run([...columnsFlags, filePath], { ignoresErrors });
    const pipelineData = JSON.parse(result);
    console.log("Pipeline data with columns from parsePipelineWithColumns", pipelineData);
    
    return {
      name: pipelineData.name || '',
      schedule: pipelineData.schedule || '',
      description: pipelineData.description || '',
      assets: pipelineData.assets || [],
      columnLineage: pipelineData.column_lineage || {},
      raw: pipelineData
    };
  }

  /**
   * Alternative method using --with-schema flag for schema information.
   * This provides another way to get column information if -c flag is not sufficient.
   * 
   * @param filePath - Path to the pipeline.yml file  
   * @param options - Command options including flags and error handling
   * @returns Promise with enhanced pipeline data including schema information
   */
  public async parsePipelineWithSchema(
    filePath: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<EnhancedPipelineData> {
    // Add the --with-schema flag to get schema-level information
    const schemaFlags = [...flags, "--with-schema"];
    const result = await this.run([...schemaFlags, filePath], { ignoresErrors });
    const pipelineData = JSON.parse(result);
    console.log("Pipeline data with schema from parsePipelineWithSchema", pipelineData);
    
    return {
      name: pipelineData.name || '',
      schedule: pipelineData.schedule || '',
      description: pipelineData.description || '',
      assets: pipelineData.assets || [],
      schemaInfo: pipelineData.schema_info || {},
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
          ...(includeColumns && pipelineData.column_lineage && {
            columnLineage: pipelineData.column_lineage
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

  /**
   * Get column information for all assets in a pipeline.
   * This method provides a comprehensive view of all columns across all assets.
   * 
   * @param filePath - Path to the pipeline or asset file
   * @param options - Command options including flags and error handling
   * @returns Promise with detailed column information for all assets
   */
  public async getPipelineColumnsInfo(
    filePath: string,
    { flags = ["parse-pipeline"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<PipelineColumnInfo> {
    try {
      const pipelinePath = isConfigFile(filePath) 
        ? filePath 
        : await getCurrentPipelinePath(filePath);
      
      const columnsFlags = [...flags, "-c"];
      const result = await this.run([...columnsFlags, pipelinePath as string], { ignoresErrors });
      const pipelineData = JSON.parse(result);
      
      // Extract and organize column information
      const columnsInfo: PipelineColumnInfo = {
        pipeline: {
          name: pipelineData.name || '',
          path: pipelinePath as string
        },
        assets: pipelineData.assets?.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          columns: asset.columns || [],
          columnLineage: asset.column_lineage || [],
          upstreams: asset.upstreams || [],
          downstreams: asset.downstreams || []
        })) || [],
        globalColumnLineage: pipelineData.column_lineage || {}
      };
      
      console.log("Pipeline columns info:", columnsInfo);
      return columnsInfo;
      
    } catch (error: any) {
      console.error("Error getting pipeline columns info:", error);
      throw error;
    }
  }
}
