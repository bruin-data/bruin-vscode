import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import * as child_process from "child_process";

/**
 * Extends the BruinCommand class to implement the bruin data-diff command.
 */
export class BruinTableDiff extends BruinCommand {
  private static runningProcess: child_process.ChildProcess | null = null;

  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'data-diff' command string.
   */
  protected bruinCommand(): string {
    return "data-diff";
  }

  /**
   * Execute table diff between two tables using explicit connection names.
   * Uses connection_name:table_name format.
   *
   * @param {string} sourceConnection - The source connection name.
   * @param {string} sourceTable - The source table in format 'schema.table' or 'table'.
   * @param {string} targetConnection - The target connection name.
   * @param {string} targetTable - The target table in format 'schema.table' or 'table'.
   * @param {boolean} [schemaOnly=false] - Whether to compare only schema differences.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution.
   * @returns {Promise<string>} A promise that resolves with the diff results.
   */
  public async compareTables(
    sourceConnection: string,
    sourceTable: string,
    targetConnection: string,
    targetTable: string,
    schemaOnly: boolean = false,
    options: BruinCommandOptions = {}
  ): Promise<string> {
    const args = [
      `${sourceConnection}:${sourceTable}`,
      `${targetConnection}:${targetTable}`,
      ...(schemaOnly ? ["--schema-only"] : [])
    ];

    console.log(`BruinTableDiff: Executing data-diff with explicit connections:`, args);
    console.log(`BruinTableDiff: Full command: bruin data-diff ${args.join(' ')}`);
    
    try {
      const { promise, process } = this.runCancellable(args, options);
      BruinTableDiff.runningProcess = process;

      const result = await promise;
      console.log(`BruinTableDiff: Command completed successfully`);
      console.log(`BruinTableDiff: Result length: ${result.length} characters`);
      if (result.length > 0) {
        console.log(`BruinTableDiff: Result preview (first 300 chars): ${result.substring(0, 300)}`);
      } else {
        console.warn(`BruinTableDiff: WARNING - Empty result returned!`);
      }
      return result;
    } catch (error) {
      console.error(`BruinTableDiff: Command failed:`, error);
      throw error;
    } finally {
      BruinTableDiff.runningProcess = null;
    }
  }

  /** Cancel the currently running diff operation, if any. */
  public static cancelDiff(): void {
    const proc = BruinTableDiff.runningProcess;
    if (proc) {
      try {
        proc.kill("SIGINT");
      } catch (e) {
        console.warn("Failed to send SIGINT to running diff process", e);
      }
      BruinTableDiff.runningProcess = null;
    }
  }


}