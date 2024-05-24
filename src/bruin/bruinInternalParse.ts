import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { LineagePanel } from "../panels/LineagePanel";

/**
 * Extends the BruinCommand class to implement the bruin run command on Bruin assets.
 */

export class BruinInternalParse extends BruinCommand {
  parseAssetLineage(fsPath: string) {
    throw new Error("Method not implemented.");
  }
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'run' command string.
   */
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

  public async parseAsset(
    filePath: string,
    { flags = ["parse-asset"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    await this.run([...flags, filePath], { ignoresErrors })
      .then(
        (result) => {
          this.postMessageToPanels("success", result);
        },
        (error) => {
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.debug("parsing command error", err);
      });
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("parse-message", { status, message });
    LineagePanel.postMessage("parse-message", { status, message });
  }
}
