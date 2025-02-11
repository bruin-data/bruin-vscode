import { BruinCommandOptions, ParseResponse } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

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

  public async checkAssetValidity(
    filePath: string,
    { ignoresErrors = false }: Pick<BruinCommandOptions, 'ignoresErrors'> = {}
  ): Promise<boolean> {
    try {
      const result = await this.run(["parse-asset", filePath], { ignoresErrors });
      const parsedResult = JSON.parse(result) as ParseResponse;
      return parsedResult.asset !== null;
    } catch (err) {
      console.debug("Error checking asset validity:", err);
      return true;
    }
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("parse-message", { status, message });
  }
}
