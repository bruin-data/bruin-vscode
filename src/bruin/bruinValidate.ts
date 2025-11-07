import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommandOptions } from "../types";
import { platform } from "os";
import { getBruinVersion, compareVersions } from "./bruinUtils";
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
   * @param {string} [excludeTag=""] - Optional exclude tag to use in validation.
   * @returns {Promise<void>} A promise that resolves when the validation is complete or an error is caught.
   */
  public async validate(
    filePath: string,
    { flags = ["-o", "json"], ignoresErrors = false }: BruinCommandOptions = {},
    excludeTag: string = "",
    fullRefresh: boolean = false
  ): Promise<void> {
    this.isLoading = true;
    BruinPanel.postMessage("validation-message", {
      status: "loading",
      message: "Validating asset...",
    });

    try {
      // Check version compatibility if fullRefresh is requested
      if (fullRefresh) {
        const versionInfo = await getBruinVersion();
        
        if (!versionInfo) {
          const errorMessage = `Could not determine Bruin CLI version. Please ensure Bruin CLI is properly installed.`;
          
          BruinPanel.postMessage("validation-message", {
            status: "error",
            message: JSON.stringify({ error: errorMessage }),
          });
          return;
        }
        
        const minRequiredVersion = "0.11.348";
        const isOutdated = compareVersions(versionInfo.version, minRequiredVersion);
        
        if (isOutdated) {
          const errorMessage = `The --full-refresh flag requires Bruin CLI version ${minRequiredVersion} or higher. Current version: ${versionInfo.version}. Please update your Bruin CLI to use this feature.`;
          
          BruinPanel.postMessage("validation-message", {
            status: "error",
            message: JSON.stringify({ error: errorMessage }),
          });
          return;
        }
      }

      const commandFlags = [...flags];
      if (fullRefresh) {
        commandFlags.push("--full-refresh");
      }
      // Add exclude-tag if provided
      if (excludeTag) {
        commandFlags.push("--exclude-tag", excludeTag);
      }
      
      const result = await this.run([...commandFlags, filePath], { ignoresErrors });
      let validationResults = JSON.parse(result);

      if (!Array.isArray(validationResults) && platform() === "win32") {
        if (validationResults.error) {
          // If it's an error object, throw it
          throw new Error(validationResults.error);
        }
        // If not an array, wrap in an array
        validationResults = [validationResults];
      }
  
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
    } catch (error: any) {
      // Handle the error and notify the user
      let errorMessage: string;

      // More comprehensive error handling
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = JSON.stringify({
          error: error.message || "An unknown error occurred",
          stack: error.stack,
        });
      } else if (typeof error === "object" && error !== null) {
        try {
          // Attempt to extract meaningful error information
          errorMessage = JSON.stringify({
            error: error.error || error.message || JSON.stringify(error),
          });
        } catch {
          errorMessage = JSON.stringify({ error: "An unknown error occurred" });
        }
      } else {
        errorMessage = JSON.stringify({ error: "An unknown error occurred" });
      }

      console.error("Full validation error:", error); // Log original error
      console.error("Processed error message:", errorMessage); // Log processed error

      BruinPanel.postMessage("validation-message", {
        status: "error",
        message: errorMessage,
      });
    } finally {
      this.isLoading = false; // Reset loading state when validation completes or fails
    }
  }
}
