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
import { BRUIN_FILE_EXTENSIONS } from "../constants";
import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { time } from "console";

/**
 * Simple YAML parser for extracting parameters from rendered ingestr assets.
 * Handles basic key-value pairs in the parameters section.
 */
function parseIngestrParameters(yamlContent: string): Record<string, string> | null {
  try {
    // Find the parameters section
    const parametersMatch = yamlContent.match(/^parameters:\s*\n((?:[ ]{2}[^\n]+\n?)+)/m);
    if (!parametersMatch) {
      return null;
    }

    const parametersBlock = parametersMatch[1];
    const params: Record<string, string> = {};

    // Parse each key-value pair (handles simple values, not multi-line)
    const lines = parametersBlock.split('\n');
    let currentKey: string | null = null;
    let currentValue: string = '';

    for (const line of lines) {
      // Skip empty lines
      if (line.trim() === '') continue;

      // Check for key-value pair (2-space indented)
      const kvMatch = line.match(/^[ ]{2}([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
      if (kvMatch) {
        // Save previous key-value if exists
        if (currentKey !== null) {
          params[currentKey] = currentValue.trim();
        }
        currentKey = kvMatch[1];
        currentValue = kvMatch[2];
      } else if (currentKey !== null && line.startsWith('    ')) {
        // Continuation of multi-line value
        currentValue += '\n' + line.substring(4);
      }
    }

    // Save last key-value pair
    if (currentKey !== null) {
      params[currentKey] = currentValue.trim();
    }

    return Object.keys(params).length > 0 ? params : null;
  } catch (error) {
    console.error("Error parsing ingestr parameters:", error);
    return null;
  }
}

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

    const isTaskYml = filePath.endsWith('.task.yml') || filePath.endsWith('.task.yaml');
    const isIngestrAsset = filePath.endsWith('.asset.yml') || filePath.endsWith('.asset.yaml');

    if ((isBruinAsset || isBruinPipeline || (isBruinYaml && !isTaskYml))) {
      BruinPanel?.postMessage("render-message", {
        status: "bruin-asset-alert",
        message: "-- Python, Yaml, or Pipeline BRUIN asset detected --",
      });

      // For ingestr assets, also render to get resolved variable values
      if (isIngestrAsset) {
        this.renderIngestrParams(filePath, { flags, ignoresErrors });
      }
      return;
    }

    await this.run([...flags, filePath], { ignoresErrors })
      .then((sqlRendered) => {
        setTimeout(async () => {
          try {
            const parsed = JSON.parse(sqlRendered);
            BruinPanel?.postMessage("render-message", {
              status: "success",
              message: parsed.query,
            });
          } catch (parseErr) {
            console.error("Invalid JSON from bruin render output", parseErr);
            // Fallback: try without -o json to surface raw output
            try {
              await this.runWithoutJsonFlag(filePath, ignoresErrors);
            } catch (fallbackErr) {
              BruinPanel?.postMessage("render-message", {
                status: "error",
                message: this.parseError(fallbackErr),
              });
            }
          }
        }, 0);
      })
      .catch((error) => {
        console.error("Error rendering SQL asset", this.parseError(error));
        setTimeout(() => {
          BruinPanel?.postMessage("render-message", {
            status: "error",
            message: this.parseError(error)
          });
        }, 1000);
    
        if (error.toString().includes("Incorrect")) {
          this.runWithoutJsonFlag(filePath, ignoresErrors);
        } else {
          console.error("Error rendering SQL asset from catch", error);
        }
      });
  }

  private parseError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const err = error as Error;
      return JSON.stringify({ error: err.message });
    }
    if (typeof error === 'string') {
      return error.startsWith("{") ? error : JSON.stringify({ error });
    }
    return JSON.stringify({ error: String(error) });
  }

  /**
   * Renders ingestr asset parameters to get resolved variable values.
   * Sends rendered parameters to the webview via render-ingestr-params-message.
   */
  private async renderIngestrParams(
    filePath: string,
    { flags = ["-o", "json"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    try {
      const result = await this.run([...flags, filePath], { ignoresErrors });
      const parsed = JSON.parse(result);

      if (parsed.query) {
        const renderedParams = parseIngestrParameters(parsed.query);
        if (renderedParams) {
          BruinPanel?.postMessage("render-ingestr-params-message", {
            status: "success",
            message: renderedParams,
          });
        }
      }
    } catch (error) {
      console.error("Error rendering ingestr parameters:", error);
    }
  }
  
  private async isBruinPipeline(filePath: string): Promise<boolean> {
    return await isBruinPipeline(filePath);
  }

  private async isBruinYaml(filePath: string): Promise<boolean> {
    return await isBruinYaml(filePath);
  }

  private readonly relevantFileExtensions = BRUIN_FILE_EXTENSIONS;

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
    const isTaskYml = filePath.endsWith('.task.yml') || filePath.endsWith('.task.yaml');
    
    if (
      (await isPythonBruinAsset(filePath)) ||
      ((await isYamlBruinAsset(filePath)) && !isTaskYml) ||
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
      return JSON.parse(result);
    } catch (err) {
      console.error("Error rendering SQL asset", err);
      throw err;
    }
  }
}
