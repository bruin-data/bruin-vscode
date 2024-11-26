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

    try {
      const result = await this.run([...flags, filePath], { ignoresErrors });
      const validationResults = JSON.parse(result);

      let hasErrors = false;
      const pipelinesWithIssues = [];

      for (const validationData of validationResults) {
        if (
          validationData.issues &&
          Object.keys(validationData.issues).length !== 0 &&
          validationData.issues.constructor === Object
        ) {
          hasErrors = true;
          pipelinesWithIssues.push(validationData);
        }
      }

      if (hasErrors) {
        BruinPanel.postMessage("validation-message", {
          status: "error",
          message: JSON.stringify(pipelinesWithIssues),
        });
      } else {
        BruinPanel.postMessage("validation-message", {
          status: "success",
          message: validationResults,
        });
      }
    } catch (error) {
      // Handle the error and notify the user
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      BruinPanel.postMessage("validation-message", {
        status: "error",
        message: errorMessage,
      });
      console.error("Validation error:", error);
    } finally {
      this.isLoading = false; // Reset loading state when validation completes or fails
    }
  }
}
