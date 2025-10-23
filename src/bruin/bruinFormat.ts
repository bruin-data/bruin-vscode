// Here's an optimized version of BruinInternalParse class to make parsing faster
import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

export class BruinFormat extends BruinCommand {
  protected bruinCommand(): string {
    return "format";
  }

  public async formatAsset(
    filePath: string,
    sqlfluff: boolean,
    allAssets: boolean,
    { flags = [] as string[], ignoresErrors = false}: BruinCommandOptions = {}
  ): Promise<void> {
    console.time("formatAsset");
    try {
      let params: string[] = [];
      // Create a copy of flags to avoid mutating the original array
      const commandFlags = [...flags];
      // For other asset types, run the command but with optimized execution
      if (sqlfluff){
        commandFlags.push("--sqlfluff");
      }
      if (allAssets){
         params = [...commandFlags];
      }
      else {
        params = [...commandFlags, filePath];
      }
      this.run(params, { ignoresErrors })
        .then(
          (result) => {
            this.postMessageToPanels("success", result);
            console.timeEnd("formatAsset");
          },
          (error) => {
            this.postMessageToPanels("error", error);
            console.timeEnd("formatAsset");
          }
        )
        .catch((err) => {
          if (!BruinCommand.isTestMode) {
            console.debug("formatting command error", err);
          }
          console.timeEnd("formatAsset");
        });
    } catch (err) {
      this.postMessageToPanels("error", err instanceof Error ? err.message : String(err));
      console.timeEnd("formatAsset");
    }
  }


  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("format-message", { status, message });
  }
}