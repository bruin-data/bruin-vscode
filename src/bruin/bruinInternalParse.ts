import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinLineageInternalParse } from "./bruinFlowLineage";

/**
 * Extends the BruinCommand class to implement the bruin run command on Bruin assets.
 */

export class BruinInternalParse extends BruinCommand {
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
    try {
      if (filePath.endsWith("pipeline.yml") || filePath.endsWith("pipeline.yaml")) {
        // Use the new parsePipelineConfig method for pipeline.yml
        const parser = new BruinLineageInternalParse(this.bruinExecutable, this.workingDirectory);
        const pipelineMeta = await parser.parsePipelineConfig(filePath);
        this.postMessageToPanels("success", JSON.stringify({ type: "pipelineConfig", ...pipelineMeta, filePath }));
        return;
      }
      if (filePath.endsWith("bruin.yml") || filePath.endsWith("bruin.yaml")) {
        // Do not throw error, just send minimal message for the panel/UI to handle
        console.log("Bruin config parsed:", filePath);
        this.postMessageToPanels("success", JSON.stringify({ type: "bruinConfig", filePath }));
        return;
      }
      // Default: original asset logic
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
    } catch (err) {
      this.postMessageToPanels("error", err instanceof Error ? err.message : String(err));
    }
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("parse-message", { status, message });
  }
}
