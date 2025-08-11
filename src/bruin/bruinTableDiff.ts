import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";

/**
 * Extends the BruinCommand class to implement the bruin table-diff command.
 */
export class BruinTableDiff extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'table-diff' command string.
   */
  protected bruinCommand(): string {
    return "data-diff";
  }

  /**
   * Execute table diff between two tables with connection and table specifications.
   *
   * @param {string} connectionName - The connection name to use for the diff.
   * @param {string} sourceTable - The source table in format 'schema.table'.
   * @param {string} targetTable - The target table in format 'schema.table'.
   * @param {string} [environment] - Optional environment name.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution.
   * @returns {Promise<string>} A promise that resolves with the diff results.
   */
  public async compareTables(
    connectionName: string,
    sourceTable: string,
    targetTable: string,
    environment?: string,
    options: BruinCommandOptions = {}
  ): Promise<string> {
    try {
      const args = [
        "--connection", connectionName,
        sourceTable,
        targetTable
      ];

      if (environment) {
        args.unshift("--environment", environment);
      }

      console.log(`BruinTableDiff: Executing table-diff with args:`, args);
      
      const result = await this.run(args, options);
      
      console.log(`BruinTableDiff: Command completed successfully`);
      return result;
    } catch (error) {
      console.error(`BruinTableDiff: Error executing table-diff:`, error);
      throw error;
    }
  }
}