import * as vscode from "vscode";
import { BruinDBTCommand } from "../bruin/bruinDBTCommand";
import { BruinConnections } from "../bruin/bruinConnections";
import { Connection } from "../utilities/helperUtils";

// Define interfaces for the table diff data
export interface TableDiffConnection {
  name: string;
  type: string;
  environment?: string;
}

export interface TableDiffSchema {
  name: string;
  connectionName: string;
  environment?: string;
}

export interface TableDiffTable {
  name: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

export class TableDiffDataProvider {
  private connections: TableDiffConnection[] = [];
  private bruinConnections: BruinConnections;
  private databaseCache = new Map<string, TableDiffSchema[]>();
  private tablesCache = new Map<string, string[]>();
  private connectionsLoaded = false;

  // Allowed connection types (same as ActivityBarConnectionsProvider)
  private readonly allowedConnectionTypes = [
    "duckdb",
    "google_cloud_platform",
    "gcp", 
    "snowflake",
    "postgres",
    "redshift",
    "clickhouse",
    "databricks",
    "athena",
  ];

  constructor(private extensionPath: string) {
    // Get the current workspace folder or fallback to extension path
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || extensionPath;

    // Initialize BruinConnections with proper parameters
    this.bruinConnections = new BruinConnections("bruin", workspaceFolder);
  }

  public async getConnectionsList(): Promise<TableDiffConnection[]> {
    if (!this.connectionsLoaded) {
      await this.loadConnections();
    }
    return this.connections.filter((connection) => 
      this.allowedConnectionTypes.includes(connection.type.toLowerCase())
    );
  }

  public async getSchemasList(connectionName: string, environment?: string): Promise<string[]> {
    const env = environment || 'default';
    const cacheKey = `${connectionName}.${env}`;
    
    console.log(`TableDiffDataProvider: getSchemasList called with connectionName: ${connectionName}, environment: ${env}`);
    
    if (this.databaseCache.has(cacheKey)) {
      const schemas = this.databaseCache.get(cacheKey)!;
      const filteredSchemas = schemas
        .filter(schema => schema.name !== "No databases available" && !schema.name.startsWith("No databases found"))
        .map(schema => schema.name);
      console.log(`TableDiffDataProvider: returning cached schemas:`, filteredSchemas);
      return filteredSchemas;
    }

    try {
      console.log(`TableDiffDataProvider: fetching database summary for ${connectionName}`);
      const summary = await this.getDatabaseSummary(connectionName, env);
      console.log(`TableDiffDataProvider: received summary:`, summary);
      
      const schemas = this.parseDbSummary(summary, connectionName, env);
      console.log(`TableDiffDataProvider: parsed schemas:`, schemas);
      
      this.databaseCache.set(cacheKey, schemas);
      
      const filteredSchemas = schemas
        .filter(schema => schema.name !== "No databases available" && !schema.name.startsWith("No databases found"))
        .map(schema => schema.name);
      
      console.log(`TableDiffDataProvider: returning filtered schemas:`, filteredSchemas);
      return filteredSchemas;
    } catch (error) {
      console.error(`Failed to get schemas for connection ${connectionName}:`, error);
      return [];
    }
  }

  public async getTablesList(connectionName: string, schemaName: string, environment?: string): Promise<string[]> {
    const env = environment || 'default';
    const cacheKey = `${connectionName}.${env}.${schemaName}`;
    
    if (this.tablesCache.has(cacheKey)) {
      return this.tablesCache.get(cacheKey)!;
    }

    try {
      const tablesResponse = await this.getTablesSummary(connectionName, schemaName, env);
      const tables = tablesResponse.tables || [];
      const tableNames = Array.isArray(tables) ? tables : [];
      
      this.tablesCache.set(cacheKey, tableNames);
      return tableNames;
    } catch (error) {
      console.error(`Failed to get tables for ${connectionName}.${schemaName}:`, error);
      return [];
    }
  }

  private async loadConnections(): Promise<void> {
    try {
      // Get connections from Bruin CLI
      const connections = await this.bruinConnections.getConnectionsForActivityBar();

      if (connections && connections.length > 0) {
        this.setConnections(connections);
      } else {
        this.connections = [];
      }

      this.connectionsLoaded = true;
    } catch (error) {
      console.error("TableDiffDataProvider: Error loading connections:", error);
      this.connectionsLoaded = true;
      this.connections = [];
    }
  }

  private setConnections(connections: Connection[]): void {
    this.connections = connections.map((conn: Connection) => ({
      name: conn.name || "Unknown",
      type: conn.type,
      environment: conn.environment,
    }));
  }

  private async getDatabaseSummary(connectionName: string, environment?: string): Promise<any> {
    const workspaceFolder =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getFetchDatabases(connectionName, environment);
  }

  private async getTablesSummary(connectionName: string, database: string, environment?: string): Promise<any> {
    const workspaceFolder =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getFetchTables(connectionName, database, environment);
  }

  private parseDbSummary(summary: any, connectionName: string, environment?: string): TableDiffSchema[] {
    // Handle null/undefined/empty responses gracefully
    if (!summary) {
      console.warn(`No database summary returned for connection '${connectionName}'${environment ? ` in environment '${environment}'` : ''}`);
      return [];
    }

    // Extract the schemas array from various possible formats
    let schemasArray;
    
    if (Array.isArray(summary)) {
      // Format 1: Direct array
      schemasArray = summary;
    } else if (summary?.databases !== undefined) {
      // Format 2: Object with databases property (could be null or array)
      schemasArray = summary.databases;
    } else {
      schemasArray = null;
    }

    // Handle null databases (empty connection)
    if (schemasArray === null) {
      console.log(`Connection '${connectionName}' has no databases (count: ${summary?.count || 0})`);
      // Return a placeholder item
      return [{
        name: summary?.count === 0 ? "No databases available" : `No databases found (${summary?.count || 0})`,
        connectionName: connectionName,
        environment: environment,
      }];
    }

    if (!Array.isArray(schemasArray)) {
      console.error("Received summary format:", JSON.stringify(summary, null, 2));
      throw new Error(
        `Invalid summary format for connection '${connectionName}': expected array or object with 'databases' property, got ${typeof summary}`
      );
    }

    return schemasArray.map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          connectionName: connectionName,
          environment: environment,
        };
      }

      return {
        name: item.name || item.database_name || "Unknown Database",
        connectionName: connectionName,
        environment: environment,
      };
    });
  }

  // Clear cache methods for refreshing data
  public clearConnectionsCache(): void {
    this.connectionsLoaded = false;
    this.connections = [];
  }

  public clearSchemasCache(connectionName?: string): void {
    if (connectionName) {
      const keysToDelete = Array.from(this.databaseCache.keys()).filter(key => 
        key.startsWith(`${connectionName}.`)
      );
      keysToDelete.forEach(key => this.databaseCache.delete(key));
    } else {
      this.databaseCache.clear();
    }
  }

  public clearTablesCache(connectionName?: string, schemaName?: string): void {
    if (connectionName && schemaName) {
      const keysToDelete = Array.from(this.tablesCache.keys()).filter(key =>
        key.startsWith(`${connectionName}.`) && key.includes(`.${schemaName}`)
      );
      keysToDelete.forEach(key => this.tablesCache.delete(key));
    } else if (connectionName) {
      const keysToDelete = Array.from(this.tablesCache.keys()).filter(key =>
        key.startsWith(`${connectionName}.`)
      );
      keysToDelete.forEach(key => this.tablesCache.delete(key));
    } else {
      this.tablesCache.clear();
    }
  }

  public clearAllCaches(): void {
    this.clearConnectionsCache();
    this.clearSchemasCache();
    this.clearTablesCache();
  }
}