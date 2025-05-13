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
   * @returns {Promise<void>} A promise that resolves when the patching process completes or errors are handled.
   */
  public async patchAsset(
    body: object,
    filePath: string,
    { flags = ["patch-asset", "--body"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    await this.run([...flags, JSON.stringify(body), filePath])
      .then(
        (result) => {
          this.postMessageToPanels("success", result);
        },
        (error) => {
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.debug("patching command error", err);
      });
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
