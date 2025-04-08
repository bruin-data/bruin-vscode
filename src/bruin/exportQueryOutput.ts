import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinCommandOptions } from "../types";
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

  public async exportResults(
    asset: string,

    { flags = [], ignoresErrors = false, query = "" }: BruinCommandOptions & { query?: string } = {}
  ): Promise<void> {
    // Construct base flags dynamically
    this.isLoading = true;
    this.postMessageToPanels("export-loading", this.isLoading);
    const constructedFlags = ["-export"];

    if (query && query.trim().length > 0) {
      // If we have a direct query, use the query flag
      constructedFlags.push("-q", query);
    }

    // we always need to push the other flags including the asset flag
    constructedFlags.push("-asset", asset, "-o", "json");

    // Use provided flags or fallback to constructed flags
    const finalFlags = flags.length > 0 ? flags : constructedFlags;

    try {
      const result = await this.run(finalFlags, { ignoresErrors });
      if (result.includes("flag provided but not defined")) {
        this.postMessageToPanels(
          "error",
          "This feature requires the latest Bruin CLI version. Please update your CLI."
        );
        return;
      }
      this.postMessageToPanels("success", result);
    } catch (error: any) {
      console.error("Error occurred while exporting query results:", error);
      const errorMessage = error.message || error.toString();
      this.postMessageToPanels("error", errorMessage);
    }
    finally {
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
