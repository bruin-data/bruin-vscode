import { BruinCommand } from "./bruinCommand";

export class BruinDBTCommand extends BruinCommand {
  constructor(_bruinExecutable: string, workingDirectory: string, options: string[] = []) {
    // Override to use custom path for testing
    super("/Users/mustafacihatersan/codebase/bruin/bin/bruin", workingDirectory, options);
  }

  protected bruinCommand(): string {
    return "internal";
  }

  public async getFetchDatabases(connectionName: string, environment?: string): Promise<any> {
    const flags = environment 
      ? ["fetch-databases", "-c", connectionName, "-env", environment, "-o", "json"]
      : ["fetch-databases", "-c", connectionName, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error fetching databases for ${connectionName}:`, error);
      throw error;
    }
  }

  public async getFetchTables(connectionName: string, database: string, environment?: string): Promise<any> {
    const flags = environment 
      ? ["fetch-tables", "-c", connectionName, "-d", database, "-env", environment, "-o", "json"]
      : ["fetch-tables", "-c", connectionName, "-d", database, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error fetching tables for ${connectionName} in database ${database}:`, error);
      throw error;
    }
  }

  public async getFetchColumns(connectionName: string, database: string, table: string, environment?: string): Promise<any> {
    const flags = environment 
      ? ["fetch-columns", "-c", connectionName, "-d", database, "-table", table, "-env", environment, "-o", "json"]
      : ["fetch-columns", "-c", connectionName, "-d", database, "-table", table, "-o", "json"];
    try {
      const result = await this.run(flags, { ignoresErrors: false });
      return JSON.parse(result);
    } catch (error) {
      console.error(`Error fetching columns for table ${table} in ${connectionName}.${database}:`, error);
      throw error;
    }
  }

} 