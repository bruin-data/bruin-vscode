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

  public async getFetchTables(connectionName: string, database: string): Promise<any> {
    const flags = ["fetch-tables", "-c", connectionName, "-d", database, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error fetching tables for ${connectionName} in database ${database}:`, error);
      throw error;
    }
  }

  public async getFetchColumns(connectionName: string, database: string, table: string): Promise<any> {
    const flags = ["fetch-columns", "-c", connectionName, "-d", database, "-table", table, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error fetching columns for table ${table} in ${connectionName}.${database}:`, error);
      throw error;
    }
  }

} 