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
   * @param {boolean} [fullDataDiff=false] - Whether to compare the full data differences.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution.
   * @returns {Promise<string>} A promise that resolves with the diff results.
   */
  public async compareTables(
    sourceConnection: string,
    sourceTable: string,
    targetConnection: string,
    targetTable: string,
    fullDataDiff: boolean = false,
    options: BruinCommandOptions = {}
  ): Promise<string> {
    const args = [
      `${sourceConnection}:${sourceTable}`,
      `${targetConnection}:${targetTable}`,
      "-o", "json",
      ...(fullDataDiff ? ["--full"] : [])
    ];

    try {
      const { promise, process } = this.runCancellable(args, options);
      BruinTableDiff.runningProcess = process;
      return await promise;
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

  /**
   * Estimate the cost of a full data diff operation (BigQuery only).
   * Uses --dry-run --full flags to get cost estimate without executing.
   *
   * @param {string} sourceConnection - The source connection name.
   * @param {string} sourceTable - The source table in format 'schema.table' or 'table'.
   * @param {string} targetConnection - The target connection name.
   * @param {string} targetTable - The target table in format 'schema.table' or 'table'.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution.
   * @returns {Promise<string>} A promise that resolves with the cost estimate JSON.
   */
  public async estimateCost(
    sourceConnection: string,
    sourceTable: string,
    targetConnection: string,
    targetTable: string,
    options: BruinCommandOptions = {}
  ): Promise<string> {
    const args = [
      `${sourceConnection}:${sourceTable}`,
      `${targetConnection}:${targetTable}`,
      "--dry-run",
      "--full"
    ];

    const { promise } = this.runCancellable(args, options);
    return await promise;
  }

}