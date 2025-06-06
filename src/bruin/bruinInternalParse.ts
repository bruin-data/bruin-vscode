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
          console.debug("parsing command error", err);
          console.timeEnd("parseAsset");
        });
    } catch (err) {
      this.postMessageToPanels("error", err instanceof Error ? err.message : String(err));
      console.timeEnd("parseAsset");
    }
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("parse-message", { status, message });
  }
}