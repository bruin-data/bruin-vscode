import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

export class BruinInternalAssetMetadata extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async getAssetMetadata(
    assetPath: string,
    { flags = ["asset-metadata"], ignoresErrors = true }: BruinCommandOptions = {}
  ): Promise<void> {
    try {
      // Run the CLI command to get asset metadata
      this.run([...flags, assetPath], { ignoresErrors })
        .then(
          (result) => {
            this.postMessageToPanels("success", result);
          },
          (error) => {
            console.error("Asset metadata CLI error:", error);
            this.postMessageToPanels("error", `Failed to get asset metadata: ${error}`);
          }
        )
        .catch((err) => {
          console.error("Asset metadata command error:", err);
          this.postMessageToPanels("error", `Asset metadata command failed: ${err}`);
        });
    } catch (err) {
      console.error("Asset metadata exception:", err);
      this.postMessageToPanels("error", err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Get asset metadata synchronously for use in other components
   * Returns the parsed metadata object or null if error
   */
  public async getAssetMetadataSync(assetPath: string): Promise<any | null> {
    try {
      console.log("getAssetMetadataSync: Getting metadata for", assetPath);
      
      const result = await this.run(["asset-metadata", assetPath], { ignoresErrors: true });
      
      if (!result || result.trim() === "") {
        console.log("getAssetMetadataSync: No result from CLI, trying alternative command");
        // Try alternative command format that might work
        try {
          const altResult = await this.run(["parse-asset", assetPath], { ignoresErrors: true });
          if (altResult && altResult.trim() !== "") {
            const altParsed = JSON.parse(altResult);
            console.log("getAssetMetadataSync: Alternative CLI result:", altParsed);
            // Check if this contains metadata we can use
            return altParsed.metadata || null;
          }
        } catch (altError) {
          console.log("getAssetMetadataSync: Alternative command also failed:", altError);
        }
        return null;
      }

      const parsed = JSON.parse(result);
      console.log("getAssetMetadataSync: CLI result parsed:", parsed);
      
      return parsed;
      
    } catch (error) {
      console.log("getAssetMetadataSync: Error getting metadata for", assetPath, ":", error);
      return null;
    }
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("asset-metadata-message", { status, message });
  }
}