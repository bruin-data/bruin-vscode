import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinCommandOptions } from "../types";
import { isBruinAsset, isBruinYaml } from "../utilities/helperUtils";
import { BRUIN_FILE_EXTENSIONS } from "../constants";
import { BruinCommand } from "./bruinCommand";

/**
 * Extends the BruinCommand class to implement the Bruin 'query -export' command.
 */
export class BruinExportQueryOutput extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'query -export' command json and exports query output.
   */
  protected bruinCommand(): string {
    return "query";
  }

  /**
   * Export the query output.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {string} asset - The asset name associated with the export.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */
  public isLoading: boolean = false;
  private readonly relevantFileExtensions = BRUIN_FILE_EXTENSIONS;

  private async isValidAsset(filePath: string): Promise<boolean> {
    if (
      !isBruinAsset(filePath, this.relevantFileExtensions) ||
      (await isBruinYaml(filePath)) ||
      !this.relevantFileExtensions.some((ext) => filePath.endsWith(ext))
    ) {
      return false;
    }
    return true;
  }
  
  public async exportResults(
    asset: string,
    connectionName?: string | null,
    { flags = [], ignoresErrors = false, query = "" }: BruinCommandOptions & { query?: string } = {}
  ): Promise<void> {
    // Construct base flags dynamically
    this.isLoading = true;
    this.postMessageToPanels("export-loading", this.isLoading);
    const constructedFlags = ["-export"];
    
    const hasExplicitQuery = query && query.trim().length > 0;

    if (hasExplicitQuery) {
      // If we have a direct query, use the query flag
      constructedFlags.push("-q", query);
      console.log("Using explicit query:", query);
      
      // When using explicit query, use connection if provided
      if (connectionName) {
        constructedFlags.push("-connection", connectionName);
        console.log("Using connection for explicit query:", connectionName);
      }
    } else {
      // No explicit query, use the asset
      const isAssetValid = await this.isValidAsset(asset);
      
      if (isAssetValid) {
        constructedFlags.push("-asset", asset);
        console.log("Using asset path:", asset);
      } else {
        this.postMessageToPanels(
          "error", 
          "Invalid asset type. Please use a valid SQL, Python file, or Bruin asset."
        );
        this.isLoading = false;
        this.postMessageToPanels("export-loading", this.isLoading);
        return;
      }
    }
    
    // Add output format
    constructedFlags.push("-o", "json");

    // Use provided flags or fallback to constructed flags
    const finalFlags = flags.length > 0 ? flags : constructedFlags;

    try {
      const result = await this.run(finalFlags, { ignoresErrors });
      let parsedResult: any;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = result;
      }
      const message = (() => {
        if (typeof parsedResult === "string") {
          return parsedResult;
        }

        if (
          parsedResult &&
          typeof parsedResult === "object" &&
          Object.keys(parsedResult).length === 1
        ) {
          const [key] = Object.keys(parsedResult);
          return `${key}: ${parsedResult[key]}`;
        }

        return JSON.stringify(parsedResult);
      })();

      if (message.includes("flag provided but not defined")) {
        this.postMessageToPanels(
          "error",
          "This feature requires the latest Bruin CLI version. Please update your CLI."
        );
        return;
      }
      this.postMessageToPanels("success", message);
    } catch (error: any) {
      console.error("Error occurred while exporting query results:", error);
      const errorMessage = error.message || error.toString();
      this.postMessageToPanels("error", errorMessage);
    } finally {
      this.isLoading = false;
      this.postMessageToPanels("export-loading", this.isLoading);
    }
  }

  /**
   * Helper function to post messages to the panel with a specific status and message.
   *
   * @param {string} status - Status of the message ('success' or 'error').
   * @param {string | any} message - The message content to send to the panel.
   */
  private postMessageToPanels(status: string, message: string | any) {
    QueryPreviewPanel.postMessage("query-export-message", { status, message });
  }
}