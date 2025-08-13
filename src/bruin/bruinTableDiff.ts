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
    const args = [
      "--connection", connectionName,
      sourceTable,
      targetTable
    ];

    console.log(`BruinTableDiff: Executing data-diff with args:`, args);
    
    try {
      const result = await this.run(args, options);
      console.log(`BruinTableDiff: Command completed successfully`);
      console.log(`BruinTableDiff: Result:`, result);
      return result;
    } catch (error) {
      console.error(`BruinTableDiff: Command failed:`, error);
      
      // For data-diff commands, the "error" might actually be valid diff results
      const errorString = String(error);
      console.log(`BruinTableDiff: Checking if error contains valid diff results...`);
      console.log(`BruinTableDiff: Error string length:`, errorString.length);
      console.log(`BruinTableDiff: Error preview:`, errorString.substring(0, 500));
      
      if (this.isValidDiffOutput(errorString)) {
        console.log(`BruinTableDiff: Error contains valid diff results, returning as success`);
        return errorString;
      }
      
      throw error;
    }
  }

  /**
   * Execute table diff between two tables using explicit connection names.
   * Uses connection_name:table_name format instead of --connection flag.
   *
   * @param {string} sourceConnection - The source connection name.
   * @param {string} sourceTable - The source table in format 'schema.table' or 'table'.
   * @param {string} targetConnection - The target connection name.
   * @param {string} targetTable - The target table in format 'schema.table' or 'table'.
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution.
   * @returns {Promise<string>} A promise that resolves with the diff results.
   */
  public async compareTablesExplicit(
    sourceConnection: string,
    sourceTable: string,
    targetConnection: string,
    targetTable: string,
    options: BruinCommandOptions = {}
  ): Promise<string> {
    const args = [
      `${sourceConnection}:${sourceTable}`,
      `${targetConnection}:${targetTable}`
    ];

    console.log(`BruinTableDiff: Executing data-diff with explicit connections:`, args);
    
    try {
      const result = await this.run(args, options);
      console.log(`BruinTableDiff: Command completed successfully`);
      console.log(`BruinTableDiff: Result:`, result);
      return result;
    } catch (error) {
      console.error(`BruinTableDiff: Command failed:`, error);
      
      // For data-diff commands, the "error" might actually be valid diff results
      const errorString = String(error);
      console.log(`BruinTableDiff: Checking if error contains valid diff results...`);
      console.log(`BruinTableDiff: Error string length:`, errorString.length);
      console.log(`BruinTableDiff: Error preview:`, errorString.substring(0, 500));
      
      if (this.isValidDiffOutput(errorString)) {
        console.log(`BruinTableDiff: Error contains valid diff results, returning as success`);
        return errorString;
      }
      
      throw error;
    }
  }

  /**
   * Check if the output looks like valid diff results
   */
  private isValidDiffOutput(output: string): boolean {
    console.log(`BruinTableDiff: isValidDiffOutput checking output...`);
    
    // Check for table formatting characters and diff-specific content
    const hasTableFormatting = output.includes('│') && output.includes('├');
    const hasDiffContent = output.includes('DIFF') || 
                          output.includes('Row Count') || 
                          output.includes('Column Count') ||
                          output.includes('Schema differences') ||
                          output.includes('COLUMN') ||
                          output.includes('PROP');
    
    console.log(`BruinTableDiff: hasTableFormatting:`, hasTableFormatting);
    console.log(`BruinTableDiff: hasDiffContent:`, hasDiffContent);
    console.log(`BruinTableDiff: includes DIFF:`, output.includes('DIFF'));
    console.log(`BruinTableDiff: includes Row Count:`, output.includes('Row Count'));
    console.log(`BruinTableDiff: includes Column Count:`, output.includes('Column Count'));
    
    const isValid = hasTableFormatting && hasDiffContent;
    console.log(`BruinTableDiff: isValid:`, isValid);
    
    return isValid;
  }
}