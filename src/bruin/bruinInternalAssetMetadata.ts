import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

export class BruinInternalAssetMetadata extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async getAssetMetadata(
    assetPath: string,
    { flags = ["asset-metadata"], ignoresErrors = false }: BruinCommandOptions = {},
    startDate?: string,
    endDate?: string,
    environment?: string
  ): Promise<void> {
    try {
      const commandArgs = [...flags];
      
      if (startDate) {
        commandArgs.push("-start-date", startDate);
      }
      
      if (endDate) {
        commandArgs.push("-end-date", endDate);
      }
      
      if (environment) {
        commandArgs.push("-env", environment);
      }
      
      commandArgs.push(assetPath);
      
      console.log("Running asset metadata command:", commandArgs.join(" "));
      
      const result = await this.run(commandArgs, { ignoresErrors });
      
      if (!result || result.trim() === "") {
        this.postMessageToPanels("error", "Asset metadata command returned empty result");
        return;
      }
      
      try {
        const parsed = JSON.parse(result);
        
        if (parsed.error) {
          this.postMessageToPanels("error", parsed.error);
          return;
        }
        
        this.postMessageToPanels("success", result);
      } catch (parseError) {
        this.postMessageToPanels("error", `Asset metadata command returned invalid JSON: ${parseError}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.postMessageToPanels("error", `Failed to get asset metadata: ${errorMessage}`);
    }
  }

  /**
   * Get asset metadata synchronously for use in other components
   * Returns the parsed metadata object or null if error
   */
  public async getAssetMetadataSync(assetPath: string): Promise<any | null> {
    try {
      const result = await this.run(["asset-metadata", assetPath], { ignoresErrors: true });
      
      if (!result || result.trim() === "") {
        return null;
      }

      const parsed = JSON.parse(result);
      return parsed.error ? null : parsed;
      
    } catch (error) {
      return null;
    }
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("asset-metadata-message", { status, message });
  }
}