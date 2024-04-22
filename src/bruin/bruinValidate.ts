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
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    this.isLoading = true; 
    BruinPanel.currentPanel?.postMessage("validation-loading", "Loading...");
    await this.run([filePath, ...flags], { ignoresErrors })
      .then((result) => {
        BruinPanel.currentPanel?.postMessage("validation-success", result);
      })
      .catch((err) => {
        BruinPanel.currentPanel?.postMessage("validation-error", err);
      })
      .finally(() => {
        this.isLoading = false; // Reset loading state when validation completes or fails
      });
  }
}
