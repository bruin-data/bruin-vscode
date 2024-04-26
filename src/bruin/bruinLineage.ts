import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommand } from "./bruinCommand";
import { BruinCommandOptions } from "../types";
import { isPythonBruinAsset } from "../utilities/helperUtils";
import { processLineageData } from "../utilities/helperUtils";
/**
 * Extends the BruinCommand class to implement the display of the asset Lineage.
 */
export class BruinLineage extends BruinCommand {

  /**
   * Specifies the Bruin command string.
   * 
   * @returns {string} Returns the 'lineage' command string.
   */
  protected bruinCommand(): string {
    return "lineage";
  }

  /**
   * Display the lineage of the specified asset path, and manages errors.
   * 
   * @param {string} filePath - The path of the asset to be rendered.
   * @param {BruinCommandOptions} [options={}] - The optional parameters including flags and error handling preferences.
   * @returns {Promise<void>} A promise that resolves when the display process completes or errors are handled.
   */

  public async diplayLineage(filePath: string): Promise<void> {


    await this.run([filePath]).then(
      (lineageDisplayed) => {
        BruinPanel.currentPanel?.postMessage("lineage-message", 
        { status: "success", 
          message: processLineageData(JSON.stringify(lineageDisplayed))
        });
      },
      (error) => {
        console.debug(error);
        BruinPanel.currentPanel?.postMessage("lineage-message", {
          status: "error",
          message: error,
        });
        console.debug("lineage-err", error);
      }
    );
  }
}
