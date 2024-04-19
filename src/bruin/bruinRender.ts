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
    if (await isPythonBruinAsset(filePath)) {
      BruinPanel.currentPanel?.postMessage(
        "render-alert",
        "-- This is a Python Bruin asset and does not contain SQL code for rendering, but you can still execute the asset."
      );
      return;
    }
    await this.run([filePath, ...flags], { ignoresErrors }).then(
      (sqlRendered) => {
        BruinPanel.currentPanel?.postMessage("render-success", sqlRendered);
      },
      (error) => {
        console.debug(error);
        BruinPanel.currentPanel?.postMessage("render-error", error);
      }
    );
  }
}
