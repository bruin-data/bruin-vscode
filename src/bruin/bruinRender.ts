import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommand } from "./bruinCommand";
import { BruinCommandOptions } from "../types";
import { isPythonBruinAsset } from "../utilities/helperUtils";

/**
 * Extends the BruinCommand class to implement the rendering process specific to Bruin assets.
 * It checks if the file is a Python or SQL Bruin asset and manages the rendering accordingly.
 */
export class BruinRender extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'render' command string.
   */
  protected bruinCommand(): string {
    return "render";
  }

  /**
   * Renders the content of the specified asset path, handles the display of results, and manages errors.
   * Notifies users when a Python Bruin asset is detected.
   *
   * @param {string} filePath - The path of the asset to be rendered.
   * @param {BruinCommandOptions} [options={}] - The optional parameters including flags and error handling preferences.
   * @returns {Promise<void>} A promise that resolves when the rendering process completes or errors are handled.
   */

  public async render(
    filePath: string,
    { flags = [], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    if (!filePath.endsWith(".sql")) {
      if (!isPythonBruinAsset(filePath)) {
        BruinPanel.currentPanel?.postMessage("render-message", {
          status: "non-assset-alert",
          message: "-- This is not a BRUIN asset --",
        });
      } else {
        BruinPanel.currentPanel?.postMessage("render-message", {
          status: "py-asset-alert",
          message: "-- Python BRUIN asset detected --",
        });
      }
      return;
    }
    await this.run([...flags, filePath], { ignoresErrors }).then(
      (sqlRendered) => {
        BruinPanel.currentPanel?.postMessage("render-message", {
          status: "success",
          message: sqlRendered,
        });
      },
      (error) => {
        console.debug(error);
        BruinPanel.currentPanel?.postMessage("render-message", {
          status: "error",
          message: error,
        });
      }
    );
  }
}
