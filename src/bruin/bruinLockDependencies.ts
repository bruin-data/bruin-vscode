import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommandOptions } from "../types";

/**
 * Extends the BruinCommand class to implement bruin internal lock-asset-dependencies command
 * for locking Python package dependencies in requirements.txt.
 */
export class BruinLockDependencies extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public isLoading: boolean = false;

  /**
   * Locks Python dependencies for a Bruin Python asset.
   * Uses uv pip compile to resolve and lock versions in requirements.txt.
   */
  public async lockDependencies(
    filePath: string,
    pythonVersion: string | null,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    this.isLoading = true;
    BruinPanel.postMessage("lock-python-dependencies-message", {
      status: "loading",
      message: "Locking Python dependencies...",
    });

    try {
      const commandFlags = ["lock-asset-dependencies", filePath, "--output", "json"];

      // Only add --python-version if not default (3.11)
      if (pythonVersion && pythonVersion !== "3.11") {
        commandFlags.push("--python-version", pythonVersion);
      }

      commandFlags.push(...flags);

      const result = await this.run(commandFlags, { ignoresErrors: true });

      // Try to parse JSON response
      let hasErrors = false;
      let message = "Python dependencies locked successfully.";

      try {
        const jsonResult = JSON.parse(result);
        if (jsonResult.error) {
          hasErrors = true;
          message = jsonResult.error;
        } else if (jsonResult.message) {
          message = jsonResult.message;
        }
      } catch {
        // Not JSON, check for error indicators in plain text
        if (result.toLowerCase().includes("error") || result.toLowerCase().includes("failed")) {
          hasErrors = true;
          message = result || "Failed to lock Python dependencies.";
        } else if (result.trim()) {
          message = result;
        }
      }

      BruinPanel.postMessage("lock-python-dependencies-message", {
        status: hasErrors ? "error" : "success",
        message: message,
      });
    } catch (error: any) {
      let errorMessage: string;

      if (typeof error === "string") {
        // Try to parse JSON error
        try {
          const jsonError = JSON.parse(error);
          errorMessage = jsonError.error || error;
        } catch {
          errorMessage = error;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message || "An unknown error occurred while locking Python dependencies.";
      } else {
        errorMessage = "An unknown error occurred while locking Python dependencies.";
      }

      BruinPanel.postMessage("lock-python-dependencies-message", {
        status: "error",
        message: errorMessage,
      });
    } finally {
      this.isLoading = false;
    }
  }
}
