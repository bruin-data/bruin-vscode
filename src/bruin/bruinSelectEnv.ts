import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

/**
 * Extends the BruinCommand class to implement the bruin select run environement command.
 */

export class BruinEnvList extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'environments list -o json' command string.
   */
  protected bruinCommand(): string {
    return "environments";
  }

  /**
   * Return the environments List.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */

  public async getEnvironmentsList({
    flags = ["list", "-o", "json"],
    ignoresErrors = false,
  }: BruinCommandOptions = {}): Promise<void> {
    await this.run([...flags], { ignoresErrors })
      .then(
        (result) => {
          this.postMessageToPanels("success", result);
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
    BruinPanel.postMessage("environments-list-message", { status, message });
  }
}
