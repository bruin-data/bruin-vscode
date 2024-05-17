import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { LineagePanel } from "../panels/LineagePanel";
import * as vscode from "vscode";
/**
 * Extends the BruinCommand class to implement the bruin run command on Bruin assets.
 */

export class BruinLineageInternalParse extends BruinCommand {
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
  public async parseAssetLineage(
    filePath: string,
    { flags = ["parse-asset"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    await this.run([...flags, filePath], { ignoresErrors })
      .then(
        (result) => {
          LineagePanel.postMessage("flow-lineage-message", {
            status: "success",
            message: result,
          });
        },
        (error) => {
          LineagePanel.postMessage("flow-lineage-message", {
            status: "error",
            message: error,
          });
        }
      )
      .catch((err) => {
        console.debug("parsing command error", err);
      });
  }
}
