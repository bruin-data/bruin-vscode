import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinCommandOptions } from "../types";
import { isBruinAsset, isBruinYaml } from "../utilities/helperUtils";
import { BRUIN_FILE_EXTENSIONS } from "../constants";
import { BruinCommand } from "./bruinCommand";
import * as child_process from "child_process";

/**
 * Extends the BruinCommand class to implement the Bruin 'query -export' command.
 */
export class BruinExportQueryOutput extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'query -export' command json and exports query output.
   */
  protected bruinCommand(): string {
    return "query";
  }

  /**
   * Export the query output.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {string} asset - The asset name associated with the export.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */
  public isLoading: boolean = false;
  private readonly relevantFileExtensions = BRUIN_FILE_EXTENSIONS;

  // Map to track running export processes by tabId
  private static runningProcesses: Map<string, child_process.ChildProcess> = new Map();

  private async isValidAsset(filePath: string): Promise<boolean> {
    if (
      !isBruinAsset(filePath, this.relevantFileExtensions) ||
      (await isBruinYaml(filePath)) ||
      !this.relevantFileExtensions.some((ext) => filePath.endsWith(ext))
    ) {
      return false;
    }
    return true;
  }
  
  public async exportResults(
    asset: string,
    connectionName?: string | null,
    tabId?: string,
    { flags = [], ignoresErrors = false, query = "" }: BruinCommandOptions & { query?: string } = {}
  ): Promise<void> {
    // Construct base flags dynamically
    this.isLoading = true;
    this.postMessageToPanels("export-loading", this.isLoading);

    const constructedFlags = ["-export"];

    const hasExplicitQuery = query && query.trim().length > 0;

    if (hasExplicitQuery) {
      // If we have a direct query, use the query flag
      constructedFlags.push("-q", query);
      console.log("Using explicit query:", query);

      // When using explicit query, use connection if provided
      if (connectionName) {
        constructedFlags.push("-connection", connectionName);
        console.log("Using connection for explicit query:", connectionName);
      }
    } else {
      // No explicit query, use the asset
      const isAssetValid = await this.isValidAsset(asset);

      if (isAssetValid) {
        constructedFlags.push("-asset", asset);
        console.log("Using asset path:", asset);
      } else {
        this.postMessageToPanels(
          "error",
          "Invalid asset type. Please use a valid SQL, Python file, or Bruin asset."
        );
        this.isLoading = false;
        this.postMessageToPanels("export-loading", this.isLoading);
        return;
      }
    }

    // Add output format
    constructedFlags.push("-o", "json");

    // Use provided flags or fallback to constructed flags
    const finalFlags = flags.length > 0 ? flags : constructedFlags;

    let currentProcess: child_process.ChildProcess | undefined;

    try {
      // Cancel any existing export for this tab right before starting a new one
      // (moved here to minimize async gap - no awaits between cancel and process registration)
      if (tabId) {
        BruinExportQueryOutput.cancelExport(tabId);
      }

      const { promise, process } = this.runCancellable(finalFlags, { ignoresErrors });
      currentProcess = process;

      // Store the process for potential cancellation immediately after spawning
      if (tabId) {
        BruinExportQueryOutput.runningProcesses.set(tabId, process);
      }

      const result = await promise;

      // Remove process from tracking once completed
      if (tabId) {
        BruinExportQueryOutput.runningProcesses.delete(tabId);
      }

      let parsedResult: any;
      try {
        parsedResult = JSON.parse(result);
      } catch {
        parsedResult = result;
      }
      const message = (() => {
        if (typeof parsedResult === "string") {
          return parsedResult;
        }

        if (
          parsedResult &&
          typeof parsedResult === "object" &&
          Object.keys(parsedResult).length === 1
        ) {
          const [key] = Object.keys(parsedResult);
          return `${key}: ${parsedResult[key]}`;
        }

        return JSON.stringify(parsedResult);
      })();

      if (message.includes("flag provided but not defined")) {
        this.postMessageToPanels(
          "error",
          "The command flag is not recognized. Please check your command syntax."
        );
        return;
      }
      this.postMessageToPanels("success", message);
    } catch (error: any) {
      // Check if a newer export has started by comparing process references
      // (not just existence - our own errored process would still be in the map)
      const processInMap = tabId ? BruinExportQueryOutput.runningProcesses.get(tabId) : undefined;
      const newerExportStarted = processInMap !== undefined && processInMap !== currentProcess;

      // Only delete from tracking if no newer export has taken over
      if (tabId && !newerExportStarted) {
        BruinExportQueryOutput.runningProcesses.delete(tabId);
      }

      console.error("Error occurred while exporting query results:", error);

      // Skip posting messages if a newer export is running
      if (newerExportStarted) {
        return;
      }

      const errorMessage = error.message || error.toString();

      // Check if the export was cancelled
      if (errorMessage.includes("Command was cancelled") ||
          errorMessage.includes("context canceled")) {
        this.postMessageToPanels("cancelled", "Export cancelled by user.");
      } else {
        this.postMessageToPanels("error", errorMessage);
      }
    } finally {
      // Skip posting loading:false if a newer export has started
      const processInMap = tabId ? BruinExportQueryOutput.runningProcesses.get(tabId) : undefined;
      const newerExportStarted = processInMap !== undefined && processInMap !== currentProcess;
      if (!newerExportStarted) {
        this.isLoading = false;
        this.postMessageToPanels("export-loading", this.isLoading);
      }
    }
  }

  // Static method to cancel a running export by tabId
  public static cancelExport(tabId: string) {
    const proc = BruinExportQueryOutput.runningProcesses.get(tabId);
    if (proc) {
      proc.kill("SIGINT"); // Mimic Ctrl+C
      BruinExportQueryOutput.runningProcesses.delete(tabId);
    }
  }

  /**
   * Helper function to post messages to the panel with a specific status and message.
   *
   * @param {string} status - Status of the message ('success' or 'error').
   * @param {string | any} message - The message content to send to the panel.
   */
  private postMessageToPanels(status: string, message: string | any) {
    QueryPreviewPanel.postMessage("query-export-message", { status, message });
  }
}