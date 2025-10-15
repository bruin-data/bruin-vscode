import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommandOptions } from "../types";

export class BruinInternalPatch extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'run' command string.
   */
  protected bruinCommand(): string {
    return "internal";
  }

  /**
   * Sets the asset values using the Bruin CLI command.
   *
   * @param {string} filePath - The path of the asset to be patched.
   * @param {object} body - The body of the patch request.
   * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
   */
  public async patchAsset(
    body: object,
    filePath: string,
    { flags = ["patch-asset", "--body"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<boolean> {
    try {
      const result = await this.run([...flags, JSON.stringify(body), filePath]);
      this.postMessageToPanels("success", result);
      return true; // Success
    } catch (error) {
      this.postMessageToPanels("error", error);
      console.debug("patching command error", error);
      return false; // Failure
    }
  }

  /**
   * Patches the pipeline configuration using the Bruin CLI command.
   *
   * @param {object} body - The body of the patch request containing pipeline data.
   * @param {string} filePath - The path of the pipeline.yml file to be patched.
   * @param {BruinCommandOptions} options - Optional command options.
   * @returns {Promise<boolean>} A promise that resolves to true on success, false on failure.
   */
  public async patchPipeline(
    body: object,
    filePath: string,
    { flags = ["patch-pipeline", "--body"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<boolean> {
    try {
      const result = await this.run([...flags, JSON.stringify(body), filePath]);
      this.postMessageToPanels("success", result);
      return true; // Success
    } catch (error) {
      this.postMessageToPanels("error", error);
      console.debug("patching pipeline command error", error);
      return false; // Failure
    }
  }

  // internal patch with another flag --convert and only asset path 
  public async convertFileToAsset(filePath: string) {
    await this.run(["patch-asset", "--convert", filePath]).then(
      (result) => {
        // there is no result returned on success 
        BruinPanel?.postMessage("convert-message", {
          status: "success",
          message: "File converted to asset successfully",
        });
      },
      (err) => {
        console.error("Error converting file to asset", err);
        BruinPanel?.postMessage("convert-message", {
          status: "error",
          message: JSON.stringify({ error: err }),
        });
        console.error("Error converting file to asset", err);
      }
    );
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("patch-message", { status, message });
  }
}
