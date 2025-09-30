// Here's an optimized version of BruinInternalParse class to make parsing faster
import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { BruinLineageInternalParse } from "./bruinFlowLineage";

export class BruinInternalParse extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async parseAsset(
    filePath: string,
    { flags = ["parse-asset"], ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    console.time("parseAsset");
    try {
      if (filePath.endsWith("pipeline.yml") || filePath.endsWith("pipeline.yaml")) {
        const parser = new BruinLineageInternalParse(this.bruinExecutable, this.workingDirectory);
        
        // Use Promise.race to limit parsing time
        const pipelineMeta = await Promise.race([
          parser.parsePipelineConfig(filePath),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Parsing timeout")), 300))
        ]);
        
        const result = JSON.stringify({ type: "pipelineConfig", ...pipelineMeta, filePath });
        this.postMessageToPanels("success", result);
        console.timeEnd("parseAsset");
        return;
      }
      
      if (filePath.endsWith("bruin.yml") || filePath.endsWith("bruin.yaml")) {
        const result = JSON.stringify({ type: "bruinConfig", filePath });
        this.postMessageToPanels("success", result);
        console.timeEnd("parseAsset");
        return;
      }

      // For other asset types, run the command but with optimized execution
      this.run([...flags, filePath], { ignoresErrors })
        .then(
          (result) => {
            this.postMessageToPanels("success", result);
            console.timeEnd("parseAsset");
          },
          (error) => {
            this.postMessageToPanels("error", error);
            console.timeEnd("parseAsset");
          }
        )
        .catch((err) => {
          if (!BruinCommand.isTestMode) {
            console.debug("parsing command error", err);
          }
          console.timeEnd("parseAsset");
        });
    } catch (err) {
      this.postMessageToPanels("error", err instanceof Error ? err.message : String(err));
      console.timeEnd("parseAsset");
    }
  }

  /**
   * Check if a file is an asset without posting to panels.
   * Returns true if file is an asset, false if not.
   * Uses CLI 'internal parse-asset' command to determine asset status.
   */
  public async checkIfAsset(filePath: string): Promise<boolean> {
    try {
      console.log("checkIfAsset: Checking asset status for", filePath);
      
      // Config files are not assets in the conversion sense
      if (filePath.endsWith("pipeline.yml") || filePath.endsWith("pipeline.yaml") ||
          filePath.endsWith("bruin.yml") || filePath.endsWith("bruin.yaml")) {
        console.log("checkIfAsset: Config file detected, returning true");
        return true; // They are valid bruin files, just not convertible assets
      }

      // Run CLI parse command to check if file is an asset
      const result = await this.run(["parse-asset", filePath], { ignoresErrors: true });
      
      if (!result || result.trim() === "") {
        console.log("checkIfAsset: No result from CLI, returning false");
        return false;
      }

      const parsed = JSON.parse(result);
      console.log("checkIfAsset: CLI result parsed:", { 
        hasAsset: parsed.asset !== null && parsed.asset !== undefined,
        assetValue: parsed.asset 
      });
      
      // If asset is null, it means the file is not an asset
      // Example: {"asset":null,"pipeline":{"name":"bruin-duckdb","schedule":"daily"},"repo":{"path":"..."}}
      const isAsset = parsed.asset !== null && parsed.asset !== undefined;
      console.log("checkIfAsset: Final result for", filePath, ":", isAsset);
      return isAsset;
      
    } catch (error) {
      console.log("checkIfAsset: Error checking asset status for", filePath, ":", error);
      return false;
    }
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("parse-message", { status, message });
  }
}