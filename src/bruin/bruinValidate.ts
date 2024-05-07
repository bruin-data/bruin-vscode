import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommandOptions } from "../types";
/**
 * Extends the BruinCommand class to implement the bruin validate command on Bruin assets.
 */
export class BruinValidate extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'validate' command string.
   */
  protected bruinCommand(): string {
    return "validate";
  }

  public isLoading: boolean = false;

  /**
   * Validates a Bruin Asset based on it's path with optional flags and error handling.
   * Communicates the results of the validation or errors back to the BruinPanel.
   *
   * @param {string} filePath - The path of the asset to be validated.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for validation, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the validation is complete or an error is caught.
   */
  public async validate(
    filePath: string,
    { flags = ["-o", "json"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    this.isLoading = true;
    BruinPanel.postMessage("validation-message", {
      status: "loading",
      message: "Validating asset...",
    });
    await this.run([...flags, filePath], { ignoresErrors })
      .then((result) => {
        const validationData = JSON.parse(result)[0];
        if (
          Object.keys(validationData.issues).length !== 0 &&
          validationData.issues.constructor === Object
        ) {
          BruinPanel.postMessage("validation-message", {
            status: "error",
            message: result,
          });
        } else {
          BruinPanel.postMessage("validation-message", {
            status: "success",
            message: validationData,
          });
          console.log(result);
        }
      })
      .catch((err) => {
        BruinPanel.postMessage("validation-message", {
          status: "error",
          message: err,
        });
      })
      .finally(() => {
        this.isLoading = false; // Reset loading state when validation completes or fails
      });
  }
}
