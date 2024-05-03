import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

/**
 * Extends the BruinCommand class to implement the bruin run command on Bruin assets.
 */

export class BruinRun extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'run' command string.
   */
  protected bruinCommand(): string {
    return "run";
  }

  /**
   * Run a Bruin Asset based on it's path with optional flags and error handling.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {string} filePath - The path of the asset to be run.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */

  public async runSql(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    await this.run([filePath, ...flags], { ignoresErrors })
      .then((result) => {
        BruinPanel.currentPanel?.postMessage("run-success", result);
      })
      .catch((err) => {
        BruinPanel.currentPanel?.postMessage("run-error", err);
      });
  }
}
