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
  public async getOutput(
    environment: string,
    asset: string,
    limit: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    // Construct base flags dynamically
    const constructedFlags = ["-o", "json"];
    if (environment) {
      constructedFlags.push("-env", environment);
    }
    if (limit) {
      constructedFlags.push("-limit", limit);
    }
    constructedFlags.push("-asset", asset);

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

      this.postMessageToPanels("success", result);
    } catch (error: any) {
      console.error("Error occurred while running query:", error);
      const errorMessage = error.message || error.toString();

      this.postMessageToPanels("error", errorMessage);
    }
  }

  /**
   * Helper function to post messages to the panel with a specific status and message.
   *
   * @param {string} status - Status of the message ('success' or 'error').
   * @param {string | any} message - The message content to send to the panel.
   */
  private postMessageToPanels(status: string, message: string | any) {
    QueryPreviewPanel.postMessage("query-output-message", { status, message });
  }
}
