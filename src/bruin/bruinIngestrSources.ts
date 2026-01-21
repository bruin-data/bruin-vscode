import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";

/**
 * Extends the BruinCommand class to implement the Bruin 'internal ingestr-sources' command.
 * This command fetches available source tables for a given source type.
 */
export class BruinIngestrSources extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async getIngestrSources(
    sourceType: string,
    { ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    console.log(`[BruinIngestrSources] Requesting ingestr sources for type: "${sourceType}"`);
    const flags = ["ingestr-sources", "--source", sourceType];
    console.log(`[BruinIngestrSources] Running command: bruin internal ${flags.join(' ')}`);

    try {
      const result = await this.run([...flags], { ignoresErrors });
      try {
        const response = JSON.parse(result);
        const tables = this.extractTableNames(response);
        console.log("Extracted tables:", tables);
        this.postMessageToPanels("success", tables);
      } catch (parseError) {
        console.error("Error parsing ingestr-sources result:", parseError);
        const sources = result.trim().split('\n').filter(Boolean);
        if (sources.length > 0) {
          this.postMessageToPanels("success", sources);
        } else {
          this.postMessageToPanels("error", "No tables found or invalid response");
        }
      }
    } catch (error) {
      const errorString = String(error);
      console.error("Error occurred while getting ingestr sources:", errorString);
      
      const isUnsupportedCommand = errorString.includes("flag provided but not defined") || 
          errorString.includes("unknown command") ||
          errorString.includes("not defined");
      
      this.postMessageToPanels(isUnsupportedCommand ? "unsupported" : "error", null);
    }
  }

  private extractTableNames(response: any): string[] {
    const tables: string[] = [];
    
    if (response && response.tables && Array.isArray(response.tables)) {
      response.tables.forEach((table: any) => {
        if (table.name) {
          tables.push(table.name);
        }
      });
    }
    
    return tables;
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("ingestr-sources-message", { status, message });
  }
}
