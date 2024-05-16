import { BruinPanel } from "../panels/BruinPanel";
import { BruinCommand } from "./bruinCommand";
import { BruinCommandOptions } from "../types";
import {
  isBruinAsset,
  isBruinPipeline,
  isBruinYaml,
  isPythonBruinAsset,
  isYamlBruinAsset,
} from "../utilities/helperUtils";

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
    if ((await this.isValidAsset(filePath)) === false) {
      return;
    } else {
      if (await this.detectBruinAsset(filePath)) {
        return;
      }
    }

    await this.run([...flags, filePath], { ignoresErrors })
      .then(
        (sqlRendered) => {
          BruinPanel?.postMessage("render-message", {
            status: "success",
            message: JSON.parse(sqlRendered).query,
          });
          console.log("SQL rendered successfully");
        },
        (error) => {
          BruinPanel?.postMessage("render-message", {
            status: "error",
            message: error,
          });
        }
      )
      .catch((err) => {
        if (err.toString().includes("Incorrect")) {
          this.runWithoutJsonFlag(filePath, ignoresErrors);
        } else {
          console.error("Error rendering SQL asset from catch", err);
        }
      });
  }
  private async isValidAsset(filePath: string): Promise<boolean> {
    if (!isBruinAsset(filePath, ["py", "sql", "asset.yml"]) || (await isBruinYaml(filePath))) {
      BruinPanel?.postMessage("render-message", {
        status: "non-asset-alert",
        message: "-- This is not a BRUIN asset --",
      });
      console.log("This is not a BRUIN asset");
      return false;
    }
    return true;
  }

  private async detectBruinAsset(filePath: string): Promise<boolean> {
    if (
      (await isPythonBruinAsset(filePath)) ||
      (await isYamlBruinAsset(filePath)) ||
      (await isBruinPipeline(filePath))
    ) {
      BruinPanel?.postMessage("render-message", {
        status: "bruin-asset-alert",
        message: "-- Python or Yaml BRUIN asset detected --",
      });
      console.log("Python or Yaml BRUIN asset detected");
      return true;
    }
    return false;
  }

  private async runWithoutJsonFlag(filePath: string, ignoresErrors: boolean) {
    if (!this.isValidAsset(filePath)) {
      return;
    } else {
      if (await this.detectBruinAsset(filePath)) {
        return;
      }
    }

    await this.run([filePath], { ignoresErrors }).then(
      (result) => {
        BruinPanel?.postMessage("render-message", {
          status: "success",
          message: result,
        });
        console.log("SQL rendered successfully without JSON", result);
      },
      (err) => {
        BruinPanel?.postMessage("render-message", {
          status: "error",
          message: JSON.stringify({ error: err }),
        });
        console.error("Error rendering SQL asset without JSON", err);
      }
    );
  }
}
