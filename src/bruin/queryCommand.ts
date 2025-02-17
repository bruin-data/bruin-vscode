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
    connection: string,
    query: string,
    {
      flags = ["--connection", connection, "--query", query, "-o", "json"],
      ignoresErrors = false,
    }: BruinCommandOptions = {}
  ): Promise<void> {
    await this.run([...flags], { ignoresErrors })
      .then(
        (result) => {
          const output = JSON.parse(result);
          console.log("SQL query output:", output); // Debug message
          this.postMessageToPanels("success", output);
          return output;
        },
        (error) => {
          console.error("Error occurred while running query:", error); // Debug message
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.error("Query command error", err);
      });
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
