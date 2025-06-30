import { BruinCommand } from "./bruinCommand";

export class BruinDBTCommand extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async getFetchDatabases(connectionName: string): Promise<any> {
    const flags = ["fetch-databases", "-c", connectionName, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error fetching databases for ${connectionName}:`, error);
      throw error;
    }
  }

} 