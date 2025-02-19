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
import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";

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
    let isBruinAsset = false;
    let isBruinPipeline = false;
    let isBruinYaml = false;

    try {
      isValidAsset = await this.isValidAsset(filePath);
      isBruinAsset = await this.detectBruinAsset(filePath);
      isBruinPipeline = await this.isBruinPipeline(filePath);
      isBruinYaml = await this.isBruinYaml(filePath);
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

    if (isBruinAsset || isBruinPipeline || isBruinYaml) {
      BruinPanel?.postMessage("render-message", {
        status: "bruin-asset-alert",
        message: "-- Python, Yaml, or Pipeline BRUIN asset detected --",
      });
      console.log("Python, Yaml, or Pipeline BRUIN asset detected");
      return;
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
          console.error("Error rendering SQL asset in the reject", this.parseError(error));
          BruinPanel?.postMessage("render-message", {
            status: "error",
            message: this.parseError(error),
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

  private parseError(error: string): string {
    if (error.startsWith("{")) {
      return error;
    } else {
      return JSON.stringify({ error: error });
    }
  }
  private async isBruinPipeline(filePath: string): Promise<boolean> {
    return await isBruinPipeline(filePath);
  }

  private async isBruinYaml(filePath: string): Promise<boolean> {
    return await isBruinYaml(filePath);
  }

  private readonly relevantFileExtensions = [
    "sql",
    "py",
    "asset.yml",
    "asset.yaml",
    "pipeline.yml",
    "pipeline.yaml",
  ];

  private async isValidAsset(filePath: string): Promise<boolean> {
    if (
      !isBruinAsset(filePath, this.relevantFileExtensions) ||
      (await isBruinYaml(filePath)) ||
      !this.relevantFileExtensions.some((ext) => filePath.endsWith(ext))
    ) {
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
        console.error("Error rendering SQL asset without JSON", err);
        BruinPanel?.postMessage("render-message", {
          status: "error",
          message: JSON.stringify({ error: err }),
        });
        console.error("Error rendering SQL asset without JSON", err);
      }
    );
  }
}

// this class only perfor the render command and return the query output
export class BruinRenderUnmaterliazed extends BruinRender {
  protected bruinCommand(): string {
    return "render";
  }

  public async getRenderedQuery(
    filePath: string,
    { flags = ["-o", "json"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<{ query: string }> {
    try {
      const result = await this.run([...flags, filePath], { ignoresErrors });
      console.log("SQL rendered successfully", result);
      return JSON.parse(result);
    } catch (err) {
      console.error("Error rendering SQL asset", err);
      throw err;
    }
  }
}
