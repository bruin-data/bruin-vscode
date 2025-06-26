import { BruinCommand } from "./bruinCommand";

export class BruinDBTCommand extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async getDbSummary(connectionName: string): Promise<any> {
    const flags = ["db-summary", "--connection", connectionName, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error getting db summary for ${connectionName}:`, error);
      throw error;
    }
  }
} 