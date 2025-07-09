import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommandOptions } from "../types";

/**
 * Extends the BruinCommand class to implement bruin patch fill commands on Bruin assets.
 */
export class BruinFill extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'patch' command string.
   */
  protected bruinCommand(): string {
    return "patch";
  }

  public isLoading: boolean = false;

  /**
   * Fills columns from database for a Bruin Asset based on its path.
   * Communicates the results of the operation or errors back to the BruinPanel.
   *
   * @param {string} filePath - The path of the asset to fill columns for.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for the command.
   * @returns {Promise<void>} A promise that resolves when the operation is complete or an error is caught.
   */
  public async fillColumns(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    this.isLoading = true;
    BruinPanel.postMessage("fill-columns-message", {
      status: "loading",
      message: "Filling columns from database...",
    });

    try {
      const commandFlags = ["fill-columns-from-db", ...flags, filePath];
      
      const result = await this.run(commandFlags, { ignoresErrors });
      
      // Parse the result to check for success/error indicators
      let hasErrors = false;
      let message = "Columns filled successfully from database.";
      
      // Check if the result contains error indicators
      if (result.toLowerCase().includes("error") || result.toLowerCase().includes("failed")) {
        hasErrors = true;
        message = result || "Failed to fill columns from database.";
      }
      
      if (hasErrors) {
        BruinPanel.postMessage("fill-columns-message", {
          status: "error",
          message: message,
        });
      } else {
        BruinPanel.postMessage("fill-columns-message", {
          status: "success",
          message: message,
        });
      }
    } catch (error: any) {
      let errorMessage: string;
      
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message || "An unknown error occurred while filling columns.";
      } else {
        errorMessage = "An unknown error occurred while filling columns.";
      }
      
      BruinPanel.postMessage("fill-columns-message", {
        status: "error",
        message: errorMessage,
      });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fills asset dependencies for a Bruin Asset based on its path.
   * Communicates the results of the operation or errors back to the BruinPanel.
   *
   * @param {string} filePath - The path of the asset to fill dependencies for.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for the command.
   * @returns {Promise<void>} A promise that resolves when the operation is complete or an error is caught.
   */
  public async fillDependencies(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    this.isLoading = true;
    BruinPanel.postMessage("fill-dependencies-message", {
      status: "loading",
      message: "Filling asset dependencies...",
    });

    try {
      const commandFlags = ["fill-asset-dependencies", ...flags, filePath];
      
      const result = await this.run(commandFlags, { ignoresErrors });
      
      // Parse the result to check for success/error indicators
      let hasErrors = false;
      let message = "Asset dependencies filled successfully.";
      
      // Check if the result contains error indicators
      if (result.toLowerCase().includes("error") || result.toLowerCase().includes("failed")) {
        hasErrors = true;
        message = result || "Failed to fill asset dependencies.";
      }
      
      if (hasErrors) {
        BruinPanel.postMessage("fill-dependencies-message", {
          status: "error",
          message: message,
        });
      } else {
        BruinPanel.postMessage("fill-dependencies-message", {
          status: "success",
          message: message,
        });
      }
    } catch (error: any) {
      let errorMessage: string;
      
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message || "An unknown error occurred while filling dependencies.";
      } else {
        errorMessage = "An unknown error occurred while filling dependencies.";
      }
      
      BruinPanel.postMessage("fill-dependencies-message", {
        status: "error",
        message: errorMessage,
      });
    } finally {
      this.isLoading = false;
    }
  }
}