import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";


/**
 * Extends the BruinCommand class to implement the Bruin 'query' command.
 */
export class BruinQueryOutput extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'query -c connection -q query -o json' command string.
   */
  protected bruinCommand(): string {
    return "query";
  }

  /**
   * Return the query output.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */
  public isLoading: boolean = false;

  public async getOutput(
    environment: string,
    asset: string,
    limit: string,
    tabId?: string,
    connectionName?: string,
    startDate?: string,
    endDate?: string,
    { flags = [], ignoresErrors = false, query = "" }: BruinCommandOptions & { query?: string } = {}
  ): Promise<void> {
    // Construct base flags dynamically
    this.isLoading = true;
    this.postMessageToPanels("loading", this.isLoading);
    const constructedFlags = ["-o", "json"];

    if (connectionName) {
      constructedFlags.push("--connection", connectionName);
    }
    if (query) {
      // If we have a direct query, use the query flag
      constructedFlags.push("-q", query);
    }
    if (environment) {
      constructedFlags.push("-env", environment);
    }
    if (limit) {
      constructedFlags.push("-limit", limit);
    }
    // we always need to push the other flags including the asset fla
    if(!connectionName) {
      constructedFlags.push("-asset", asset);
    }

    if (startDate) {  
      constructedFlags.push("--start-date", startDate);
    }
    if (endDate) {
      constructedFlags.push("--end-date", endDate);
    }
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
      console.log("SQL query output:", result);
      this.postMessageToPanels("success", result, tabId);
    } catch (error: any) {
      console.error("Error occurred while running query:", error);
      const errorMessage = error.message || error.toString();
      this.postMessageToPanels("error", errorMessage, tabId);
    }
    finally {
      this.isLoading = false;
      this.postMessageToPanels("loading", this.isLoading, tabId);
    }
  }

  /**
   * Helper function to post messages to the panel with a specific status and message.
   *
   * @param {string} status - Status of the message ('success' or 'error').
   * @param {string | any} message - The message content to send to the panel.
   */
  private postMessageToPanels(status: string, message: string | any, tabId?: string) {
    QueryPreviewPanel.postMessage("query-output-message", { status, message, tabId });
  }
}
