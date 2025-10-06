import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { getQueryTimeout } from "../extension/configuration";
import * as child_process from "child_process";


/**
 * Extends the BruinCommand class to implement the Bruin 'query' command.
 */
export class BruinQueryOutput extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'query -c connection -q query -o json' command string.
   */
  protected bruinCommand(): string {
    return "query";
  }

  /**
   * Return the query output.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */
  public isLoading: boolean = false;
  // Map to track running processes by tabId
  private static runningProcesses: Map<string, child_process.ChildProcess> = new Map();

  public async getOutput(
    environment: string,
    asset: string,
    limit: string,
    tabId?: string,
    connectionName?: string,
    startDate?: string,
    endDate?: string,
    { flags = [], ignoresErrors = false, query = "", isAsset = true }: BruinCommandOptions & { query?: string; isAsset?: boolean } = {}
  ): Promise<void> {
    // Construct base flags dynamically
    this.isLoading = true;
    this.postMessageToPanels("loading", this.isLoading, tabId);
    const constructedFlags = ["-o", "json"];

    if (connectionName && query) {
      console.log("Using direct query mode: --connection + --query");
      constructedFlags.push("--connection", connectionName);
      constructedFlags.push("--query", query);
    } else if (query && !isAsset) {
      // For non-asset files with query content but no connection, we need a connection
      console.log("Non-asset file detected but no connection specified. Cannot execute query.");
      this.postMessageToPanels("error", "SQL files in assets folder that are not Bruin assets require a connection to be specified. Add a comment like '-- connection: your-connection-name' at the top of your file.", tabId);
      return;
    } else if (query) {
      console.log("Using auto-detect mode: --asset + --query");
      constructedFlags.push("--asset", asset);
      constructedFlags.push("--query", query);
    } else {
      console.log("Using asset mode: --asset" + (environment ? " + --environment" : ""));
      constructedFlags.push("--asset", asset);
    }

    if (environment) {
      constructedFlags.push("--environment", environment);
    }
    if (limit) {
      constructedFlags.push("--limit", limit);
    }

    if (startDate) {  
      constructedFlags.push("--start-date", startDate);
    }
    if (endDate) {
      constructedFlags.push("--end-date", endDate);
    }
    
    // Add timeout flag from configuration
    const timeoutSeconds = getQueryTimeout();
    constructedFlags.push("--timeout", `${timeoutSeconds}`);
    
    // Use provided flags or fallback to constructed flags
    const finalFlags = flags.length > 0 ? flags : constructedFlags;
    console.log("Final CLI command: bruin query", finalFlags.join(" "));

    let consoleMessages: Array<{type: 'stdout' | 'stderr' | 'info', message: string, timestamp: string}> = [];
    
    try {
      const { promise, process, consoleMessages: cmdConsoleMessages } = this.runCancellable(finalFlags, { ignoresErrors });
      consoleMessages = cmdConsoleMessages; // Store console messages for use in catch block
      
      // Store the process for potential cancellation
      if (tabId) {
        BruinQueryOutput.runningProcesses.set(tabId, process);
      }

      const result = await promise;
      
      // Remove process from tracking once completed
      if (tabId) {
        BruinQueryOutput.runningProcesses.delete(tabId);
      }

      if (result.includes("flag provided but not defined")) {
        this.postMessageToPanels(
          "error",
          "This feature requires the latest Bruin CLI version. Please update your CLI.",
          tabId,
          consoleMessages
        );
        return;
      }
      this.postMessageToPanels("success", result, tabId, consoleMessages);
    } catch (error: any) {
      // Remove process from tracking on error
      if (tabId) {
        BruinQueryOutput.runningProcesses.delete(tabId);
      }
      
      console.error("Error occurred while running query:", error);
      const errorMessage = error.message || error.toString();
      
      // Use the console messages we captured before the error occurred
      if (errorMessage.includes("Command was cancelled") || 
          errorMessage.includes("context canceled") ||
          errorMessage.includes("query execution failed: failed to initiate query read: context canceled")) {
        this.postMessageToPanels("cancelled", "Query cancelled by user.", tabId, consoleMessages);
      } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        const timeoutSeconds = getQueryTimeout();
        this.postMessageToPanels("error", `Query timed out after ${timeoutSeconds} seconds. You can adjust the timeout in VS Code settings (bruin.query.timeout).`, tabId, consoleMessages);
      } else {
        this.postMessageToPanels("error", errorMessage, tabId, consoleMessages);
      }
    }
    finally {
      this.isLoading = false;
      this.postMessageToPanels("loading", this.isLoading, tabId, []);
    }
  }

  // Static method to cancel a running query by tabId
  public static cancelQuery(tabId: string) {
    const proc = BruinQueryOutput.runningProcesses.get(tabId);
    if (proc) {
      proc.kill("SIGINT"); // Mimic Ctrl+C
      BruinQueryOutput.runningProcesses.delete(tabId);
    }
  }

  /**
   * Helper function to post messages to the panel with a specific status and message.
   *
   * @param {string} status - Status of the message ('success' or 'error').
   * @param {string | any} message - The message content to send to the panel.
   * @param {string} [tabId] - Optional tab ID for tab-specific messages.
   * @param {Array} [consoleMessages] - Optional console messages from command execution.
   */
  private postMessageToPanels(status: string, message: string | any, tabId?: string, consoleMessages?: Array<{type: 'stdout' | 'stderr' | 'info', message: string, timestamp: string}>) {
    QueryPreviewPanel.postMessage("query-output-message", { status, message, tabId, consoleMessages });
  }
}
