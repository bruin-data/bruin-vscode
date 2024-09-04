import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { extractNonNullConnections } from "../utilities/helperUtils";

/**
 * Extends the BruinCommand class to implement the bruin get connections command.
 */

export class BruinConnections extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'connections list -o json' command string.
   */
  protected bruinCommand(): string {
    return "connections";
  }

  /**
   * Return the connections List.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */

  public async getConnections({
    flags = ["list", "-o", "json"],
    ignoresErrors = false,
  }: BruinCommandOptions = {}): Promise<void> {
    
    await this.run([...flags], { ignoresErrors })
      .then(
        (result) => {
          const connections = extractNonNullConnections(JSON.parse(result));
          this.postMessageToPanels("success", connections);
        },
        (error) => {
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.debug("environment list command error", err);
      });
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("connections-list-message", { status, message });
  }
}
