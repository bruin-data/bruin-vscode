import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";

/**
 * Extends the BruinCommand class to implement the render-ddl command.
 * This command generates the DDL (Data Definition Language) version of a Bruin asset query.
 */
export class BruinRenderDdl extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'render-ddl' command string.
   */
  protected bruinCommand(): string {
    return "render-ddl";
  }

  /**
   * Renders the DDL version of the specified asset.
   *
   * @param {string | string[]} filePath - The path of the asset to generate DDL for.
   * @returns {Promise<string>} A promise that resolves with the DDL string.
   */
  public async renderDdl(
    filePath: string,
    commandFlags: string[],
    ignoresErrors: boolean
  ): Promise<string> {
    try {
      const result = await this.run([...commandFlags, filePath], { ignoresErrors });
      return result.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate DDL: ${errorMessage}`);
    }
  }
}
