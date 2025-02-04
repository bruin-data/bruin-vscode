import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommand } from "./bruinCommand";
import { BruinCommandOptions } from "../types";
import {
  isBruinPipeline,
  isBruinYaml,
  isPythonBruinAsset,
  isYamlBruinAsset,
} from "../utilities/helperUtils";
import { Uri } from "vscode";
import { checkAssetValidityCommand } from "../extension/commands/parseAssetCommand";

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
    { flags = ["-o", "json"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    let isValidAsset = false;
    let isNonSqlAsset = false;

    try {
      isValidAsset = await this.isValidAsset(filePath);
      isNonSqlAsset = await this.isNonSqlAsset(filePath);
    } catch (error) {
      console.error("Error checking file type:", error);
      return;
    }

    if (!isValidAsset) {
      BruinPanel?.postMessage("render-message", {
        status: "non-asset-alert",
        message: "-- This is not a BRUIN asset --",
      });
      console.log("This is not a BRUIN asset");
      return;
    }

    if (isNonSqlAsset) {
      BruinPanel?.postMessage("render-message", {
        status: "bruin-asset-alert",
        message: "-- Python, Yaml, or Pipeline BRUIN asset detected --",
      });
      console.log("Python, Yaml, or Pipeline BRUIN asset detected");
      return;
    }

    await this.handleRenderRequest(filePath, flags, ignoresErrors);
  }

  private async handleRenderRequest(
    filePath: string,
    flags: string[],
    ignoresErrors: boolean
  ) {
    await this.run([...flags, filePath], { ignoresErrors })
      .then(
        (sqlRendered) => this.handleRenderSuccess(sqlRendered),
        (error) => this.handleRenderError(error)
      )
      .catch((err) => {
        if (err.toString().includes("Incorrect")) {
          this.runWithoutJsonFlag(filePath, ignoresErrors);
        }
      });
  }

  private handleRenderSuccess(sqlRendered: string) {
    BruinPanel?.postMessage("render-message", {
      status: "success",
      message: JSON.parse(sqlRendered).query,
    });
  }

  private handleRenderError(err: string) {
    BruinPanel?.postMessage("render-message", {
      status: "error",
      message:  JSON.stringify({ error: err }),
    });
  }

  private parseError(error: string): string {
    return error.startsWith("{") ? error : JSON.stringify({ error : error });
  }

  private async isValidAsset(filePath: string): Promise<boolean> {
    const uri = Uri.file(filePath);
    return (await checkAssetValidityCommand(uri)) ?? false;
  }

  private async isNonSqlAsset(filePath: string): Promise<boolean> {
    const isSQL = filePath.endsWith(".sql");
    return (
      (!isSQL && (await isPythonBruinAsset(filePath))) ||
      (await isYamlBruinAsset(filePath)) ||
      (await isBruinPipeline(filePath)) ||
      (await isBruinYaml(filePath))
    );
  }

  private async runWithoutJsonFlag(filePath: string, ignoresErrors: boolean) {
    if (!(await this.isValidAsset(filePath)) || (await this.isNonSqlAsset(filePath))) {
      return;
    }

    await this.run([filePath], { ignoresErrors }).then(
      (result) => {
        BruinPanel?.postMessage("render-message", {
          status: "success",
          message: result,
        });
      },
      (err) => {
        const errorMsg = this.parseError(err);
        BruinPanel?.postMessage("render-message", {
          status: "error",
          message: errorMsg,
        });
      }
    );
  }
}