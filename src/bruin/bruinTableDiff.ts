import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";

/**
 * Extends the BruinCommand class to implement the bruin data-diff command.
 */
export class BruinTableDiff extends BruinCommand {
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
    
    try {
      const result = await this.run(args, options);
      console.log(`BruinTableDiff: Command completed successfully`);
      return result;
    } catch (error) {
      console.error(`BruinTableDiff: Command failed:`, error);
      throw error;
    }
  }


}