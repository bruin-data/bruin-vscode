import * as vscode from "vscode";
import { BruinDBTCommand } from "../bruin/bruinDBTCommand";
import { BruinConnections } from "../bruin/bruinConnections";
import { Connection } from "../utilities/helperUtils";
import {
  getSchemaFavorites,
  saveSchemaFavorites,
  SchemaFavorite,
  createFavoriteKey,
  getTableFavorites,
  saveTableFavorites,
  TableFavorite,
  createTableFavoriteKey,
} from "../extension/configuration";
import { getBruinExecutablePath } from "./BruinExecutableService";

// Define interfaces for the connection structure
interface ConnectionDisplayData {
  name: string;
  type: string;
  host?: string;
  port?: number;
  database?: string;
  environment?: string;
}

interface EnvironmentData {
  name: string;
  connections: ConnectionDisplayData[];
}

interface Schema {
  name: string;
  tables: string[];
  connectionName: string;
  environment?: string;
  isFavorite?: boolean;
  isPlaceholder?: boolean;
}

interface Table {
  name: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

interface Column {
  name: string;
  type: string;
  table: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

type TreeItemData = EnvironmentData | ConnectionDisplayData | Schema | Table | Column;

class ConnectionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: TreeItemData,
    public contextValue:
      | "environment"
      | "bruin_connection"
      | "schema"
      | "schema_favorite"
      | "schema_unfavorite"
      | "table"
      | "table_favorite"
      | "table_unfavorite"
      | "column"
      | "connections"
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;

    if (this.contextValue === "environment") {
      this.iconPath = new vscode.ThemeIcon("server-environment");
    } else if (this.contextValue === "bruin_connection") {
      this.iconPath = new vscode.ThemeIcon("plug");
    } else if (
      this.contextValue === "schema_favorite" ||
      this.contextValue === "schema_unfavorite"
    ) {
      this.iconPath = new vscode.ThemeIcon("database");
    } else if (
      this.contextValue === "table" ||
      this.contextValue === "table_favorite" ||
      this.contextValue === "table_unfavorite"
    ) {
      this.iconPath = new vscode.ThemeIcon("table");
    } else if (this.contextValue === "column") {
      this.iconPath = new vscode.ThemeIcon("symbol-field");
    } else {
      this.iconPath = new vscode.ThemeIcon("server-environment");
    }
  }
}

export class ActivityBarConnectionsProvider implements vscode.TreeDataProvider<ConnectionItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ConnectionItem | undefined | null | void> =
    new vscode.EventEmitter<ConnectionItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ConnectionItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private connections: ConnectionDisplayData[] = [];
  private bruinConnections: BruinConnections;
  private databaseCache = new Map<string, Schema[]>();
  private columnsCache = new Map<string, Column[]>(); // Cache for columns
  private favorites = new Set<string>(); // Store favorite schema keys as "connectionName.environment.schemaName"
  private tableFavorites = new Set<string>(); // Store favorite table keys as "connectionName.environment.schemaName.tableName"
  private connectionsLoaded = false; // Track if connections have been loaded
  private connectionLoadError: string | null = null; // Track connection loading errors

  // Allowed connection types
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
    this.bruinConnections = new BruinConnections(getBruinExecutablePath(), workspaceFolder);
    this.loadFavoritesFromSettings();
    this.loadTableFavoritesFromSettings();
  }

  // Load favorites from VS Code settings
  private loadFavoritesFromSettings(): void {
    const savedFavorites = getSchemaFavorites();
    this.favorites.clear();
    savedFavorites.forEach((favorite) => {
      const connection = this.connections.find(conn => conn.name === favorite.connectionName);
      const environment = favorite.environment || connection?.environment || 'default';
      const key = createFavoriteKey(favorite.schemaName, favorite.connectionName, environment);
      this.favorites.add(key);
    });
  }

  // Load table favorites from VS Code settings
  private loadTableFavoritesFromSettings(): void {
    const savedTableFavorites = getTableFavorites();
    this.tableFavorites.clear();
    savedTableFavorites.forEach((favorite) => {
      const connection = this.connections.find(conn => conn.name === favorite.connectionName);
      const environment = favorite.environment || connection?.environment || 'default';
      const key = createTableFavoriteKey(favorite.tableName, favorite.schemaName, favorite.connectionName, environment);
      this.tableFavorites.add(key);
    });
  }

  // Save favorites to VS Code settings
  private async saveFavoritesToSettings(): Promise<void> {
    const favoritesArray: SchemaFavorite[] = Array.from(this.favorites).map((key) => {
      const parts = key.split(".");
      if (parts.length === 3) {
        const [connectionName, environment, schemaName] = parts;
        return { schemaName, connectionName, environment };
      } else {
        // Fallback for old format
        const [connectionName, schemaName] = parts;
        return { schemaName, connectionName };
      }
    });
    await saveSchemaFavorites(favoritesArray);
  }

  // Save table favorites to VS Code settings
  private async saveTableFavoritesToSettings(): Promise<void> {
    const tableFavoritesArray: TableFavorite[] = Array.from(this.tableFavorites).map((key) => {
      const parts = key.split(".");
      if (parts.length === 4) {
        const [connectionName, environment, schemaName, tableName] = parts;
        return { tableName, schemaName, connectionName, environment };
      } else {
        // Fallback for old format
        const [connectionName, schemaName, tableName] = parts;
        return { tableName, schemaName, connectionName };
      }
    });
    await saveTableFavorites(tableFavoritesArray);
  }

  public refresh(): void {
    this.databaseCache.clear();
    this.columnsCache.clear();
    this.loadFavoritesFromSettings();
    this.loadTableFavoritesFromSettings();
    this.connectionsLoaded = false;
    this.connectionLoadError = null;
    this.loadConnections();
  }

  public refreshConnection(connectionName: string, environment?: string): void {
    if (environment) {
      // Environment-specific refresh - only clear cache for this specific environment
      const cacheKey = `${connectionName}.${environment}`;
      this.databaseCache.delete(cacheKey);
      
      const keysToDelete = Array.from(this.columnsCache.keys()).filter((key) =>
        key.startsWith(cacheKey)
      );
      keysToDelete.forEach((key) => this.columnsCache.delete(key));
    } else {
      // If no environment provided, refresh all connections with this name across all environments
      const keysToDelete = Array.from(this.databaseCache.keys()).filter((key) =>
        key.startsWith(`${connectionName}.`)
      );
      keysToDelete.forEach((key) => this.databaseCache.delete(key));
      
      const columnKeysToDelete = Array.from(this.columnsCache.keys()).filter((key) =>
        key.startsWith(`${connectionName}.`)
      );
      columnKeysToDelete.forEach((key) => this.columnsCache.delete(key));
    }
    this._onDidChangeTreeData.fire();
  }

  public refreshSchema(schema: Schema): void {
    const environment = schema.environment || 'default';
    const tableCacheKey = `${schema.connectionName}.${environment}.${schema.name}`;
    this.databaseCache.delete(tableCacheKey);

    const keysToDelete = Array.from(this.columnsCache.keys()).filter((key) =>
      key.startsWith(`${schema.connectionName}.${environment}.${schema.name}`)
    );
    keysToDelete.forEach((key) => this.columnsCache.delete(key));
    this._onDidChangeTreeData.fire();
  }

  // Toggle favorite status for a schema
  public async toggleSchemaFavorite(schema: Schema): Promise<void> {
    const environment = schema.environment || 'default';
    const favoriteKey = createFavoriteKey(schema.name, schema.connectionName, environment);
    
    if (this.favorites.has(favoriteKey)) {
      this.favorites.delete(favoriteKey);
    } else {
      this.favorites.add(favoriteKey);
    }

    // Save to VS Code settings
    await this.saveFavoritesToSettings();
    this._onDidChangeTreeData.fire();
  }

  public isSchemaFavorite(schema: Schema): boolean {
    const environment = schema.environment || 'default';
    const favoriteKey = createFavoriteKey(schema.name, schema.connectionName, environment);
    return this.favorites.has(favoriteKey);
  }

  // Toggle favorite status for a table
  public async toggleTableFavorite(table: Table, item?: ConnectionItem): Promise<void> {
    const environment = table.environment || 'default';
    const favoriteKey = createTableFavoriteKey(table.name, table.schema, table.connectionName, environment);
    
    if (this.tableFavorites.has(favoriteKey)) {
      this.tableFavorites.delete(favoriteKey);
    } else {
      this.tableFavorites.add(favoriteKey);
    }

    // Clear only this table's columns cache to force reload
    const cacheKey = `${table.connectionName}.${environment}.${table.schema}.${table.name}`;
    this.columnsCache.delete(cacheKey);

    // Save to VS Code settings
    await this.saveTableFavoritesToSettings();

    // Always try to refresh only the specific table node if item is provided
    if (item) {
      // Update the item's contextValue before firing the refresh
      const isFavorite = this.isTableFavorite(table);
      item.contextValue = isFavorite ? "table_favorite" : "table_unfavorite";

      // Fire refresh only for this specific table node
      this._onDidChangeTreeData.fire(item);
    } else {
      // Fallback to full refresh only if no item provided
      console.warn("toggleTableFavorite: No item provided, falling back to full tree refresh");
      this._onDidChangeTreeData.fire();
    }
  }

  public isTableFavorite(table: Table): boolean {
    const environment = table.environment || 'default';
    const favoriteKey = createTableFavoriteKey(table.name, table.schema, table.connectionName, environment);
    return this.tableFavorites.has(favoriteKey);
  }

  public async loadConnections(): Promise<void> {
    try {
      // Get connections from Bruin CLI
      const connections = await this.bruinConnections.getConnectionsForActivityBar();

      if (connections && connections.length > 0) {
        this.setConnections(connections);
      } else {
        this.connections = [];
      }

      this.connectionsLoaded = true;
      this.connectionLoadError = null;
      this._onDidChangeTreeData.fire();
    } catch (error) {
      console.error("ActivityBarConnectionsProvider: Error loading connections:", error);
      this.connectionsLoaded = true;
      this.connectionLoadError = error instanceof Error ? error.message : String(error);
      this.connections = [];
      this._onDidChangeTreeData.fire();
    }
  }

  // Method to set connections data (called by BruinConnections)
  public setConnections(connections: Connection[]): void {
    this.connections = connections.map((conn: Connection) => ({
      ...conn,
      name: conn.name || "Unknown",
      type: conn.type,
      environment: conn.environment,
    }));
    this._onDidChangeTreeData.fire();
  }

  // Method to handle connection errors
  public handleConnectionError(error: string): void {
    console.error("Error loading connections:", error);
    this.connections = [];
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConnectionItem): vscode.TreeItem {
    const isTable =
      (element.contextValue === "table" ||
        element.contextValue === "table_favorite" ||
        element.contextValue === "table_unfavorite") &&
      "schema" in element.itemData;

    if (isTable) {
      const table = element.itemData as Table;
      const isFavorite = this.isTableFavorite(table);

      // Update contextValue based on current favorite status
      element.contextValue = isFavorite ? "table_favorite" : "table_unfavorite";

      // Ensure icon is properly set for table items
      element.iconPath = new vscode.ThemeIcon("table");

      // Update command to show table details
      element.command = {
        command: "bruin.showTableDetails",
        title: "Show Table Details",
        arguments: [table.name, table.schema, table.connectionName, table.environment],
      };
    }
    return element;
  }

  async getChildren(element?: ConnectionItem): Promise<ConnectionItem[]> {
    if (!element) { 
      // Root level - lazy load connections first if not already loaded
      if (!this.connectionsLoaded) {
        await this.loadConnections();
      }
      
      // If there was an error loading connections, show error message
      if (this.connectionLoadError) {
        return [
          new ConnectionItem(
            "Error loading connections",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "connections"
          )
        ];
      }
      
      // If no connections found, show simple message
      if (this.connections.length === 0) {
        return [
          new ConnectionItem(
            "No database connections found",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "connections"
          )
        ];
      }
      
      // Root level - return connections directly with environment info
      return this.connections
        .filter((connection) => this.allowedConnectionTypes.includes(connection.type.toLowerCase()))
        .map((connection) => {
          const item = new ConnectionItem(
            connection.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            connection,
            "bruin_connection"
          );
          item.tooltip = `${connection.type}`;
          item.description = connection.environment || 'default';
          return item;
        });
    }


    if (element.contextValue === "bruin_connection" && "name" in element.itemData) {
      const connection = element.itemData as ConnectionDisplayData;
      const connectionName = connection.name;
      const environment = connection.environment || 'default';
      
      // Use environment-aware cache key
      const cacheKey = `${connectionName}.${environment}`;
      
      if (this.databaseCache.has(cacheKey)) {
        return this.databaseCache.get(cacheKey)!.map((schema) => {
          // Handle placeholder items (no databases found)
          if (schema.isPlaceholder) {
            const schemaItem = new ConnectionItem(
              "No databases found",
              vscode.TreeItemCollapsibleState.None,
              schema,
              "schema"
            );
            return schemaItem;
          }
          
          const isFavorite = this.isSchemaFavorite(schema);
          const contextValue = isFavorite ? "schema_favorite" : "schema_unfavorite";
          const schemaItem = new ConnectionItem(
            schema.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            schema,
            contextValue
          );
          schemaItem.iconPath = new vscode.ThemeIcon("database");
          return schemaItem;
        });
      }

      try {
        const summary = await this.getDatabaseSummary(connectionName, environment);
        const schemas = this.parseDbSummary(summary, connectionName, environment);
        this.databaseCache.set(cacheKey, schemas);
        return schemas.map((schema) => {
          // Handle placeholder items (no databases found)
          if (schema.isPlaceholder) {
            const schemaItem = new ConnectionItem(
              "No databases found",
              vscode.TreeItemCollapsibleState.None,
              schema,
              "schema"
            );
            return schemaItem;
          }
          
          const isFavorite = this.isSchemaFavorite(schema);
          const contextValue = isFavorite ? "schema_favorite" : "schema_unfavorite";
          const schemaItem = new ConnectionItem(
            schema.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            schema,
            contextValue
          );
          schemaItem.iconPath = new vscode.ThemeIcon("database");
          return schemaItem;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get database summary: ${error}`);
        return [];
      }
    }

    if (
      (element.contextValue === "schema_favorite" ||
        element.contextValue === "schema_unfavorite" ||
        element.contextValue === "schema") &&
      "tables" in element.itemData
    ) {
      const schema = element.itemData as Schema;
      
      // Handle placeholder schemas (no databases found)
      if (schema.isPlaceholder) {
        return []; // No children for placeholder schemas
      }
      
      const environment = schema.environment || 'default';
      
      try {
        const tablesResponse = await this.getTablesSummary(schema.connectionName, schema.name, environment);
        const tables = tablesResponse.tables || [];
        return tables.map((table: string) => {
          const tableItem: Table = {
            name: table,
            schema: schema.name,
            connectionName: schema.connectionName,
            environment: environment,
          };
          const isFavorite = this.isTableFavorite(tableItem);
          const contextValue = isFavorite ? "table_favorite" : "table_unfavorite";
          const tableTreeItem = new ConnectionItem(
            table,
            vscode.TreeItemCollapsibleState.Collapsed,
            tableItem,
            contextValue
          );
          tableTreeItem.command = {
            command: "bruin.showTableDetails",
            title: "Show Table Details",
            arguments: [table, schema.name, schema.connectionName, environment],
          };
          return tableTreeItem;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get tables for ${schema.name}: ${error}`);
        return [];
      }
    }

    if (
      (element.contextValue === "table" ||
        element.contextValue === "table_favorite" ||
        element.contextValue === "table_unfavorite") &&
      "name" in element.itemData &&
      "schema" in element.itemData
    ) {
      const table = element.itemData as Table;
      const cacheKey = `${table.connectionName}.${table.schema}.${table.name}`;
      
      const connection = this.connections.find(conn => conn.name === table.connectionName);
      const environment = connection?.environment;

      if (this.columnsCache.has(cacheKey)) {
        return this.columnsCache.get(cacheKey)!.map((column) => {
          const columnItem = new ConnectionItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column,
            "column"
          );
          columnItem.description = column.type;
          columnItem.tooltip = `Column: ${column.name}, Type: ${column.type}`;
          return columnItem;
        });
      }

      try {
        const columnsResponse = await this.getColumnsSummary(
          table.connectionName,
          table.schema,
          table.name,
          environment
        );
        const columns = this.parseColumnsSummary(columnsResponse, table);
        this.columnsCache.set(cacheKey, columns);
        return columns.map((column) => {
          const columnItem = new ConnectionItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column,
            "column"
          );
          columnItem.description = column.type;
          columnItem.tooltip = `Column: ${column.name}, Type: ${column.type}`;
          return columnItem;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get columns for ${table.name}: ${error}`);
        return [];
      }
    }

    return [];
  }

  // New method to group connections by environment
  private getEnvironments(): EnvironmentData[] {
    const environmentMap = new Map<string, ConnectionDisplayData[]>();
    
    // Group connections by environment
    this.connections.forEach(connection => {
      const envName = connection.environment || 'default';
      if (!environmentMap.has(envName)) {
        environmentMap.set(envName, []);
      }
      environmentMap.get(envName)!.push(connection);
    });

    // Convert to array and sort
    return Array.from(environmentMap.entries())
      .map(([name, connections]) => ({
        name,
        connections: connections.filter(conn => 
          this.allowedConnectionTypes.includes(conn.type.toLowerCase())
        )
      }))
      .filter(env => env.connections.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
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

  private async getColumnsSummary(
    connectionName: string,
    database: string,
    table: string,
    environment?: string
  ): Promise<any> {
    const workspaceFolder =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getFetchColumns(connectionName, database, table, environment);
  }

  private parseColumnsSummary(summary: any, table: Table): Column[] {
    const columnsArray = Array.isArray(summary) ? summary : summary?.columns;

    if (!Array.isArray(columnsArray)) {
      throw new Error(
        "Invalid columns summary format: not an array or object with a 'columns' property."
      );
    }

    return columnsArray.map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          type: "unknown",
          table: table.name,
          schema: table.schema,
          connectionName: table.connectionName,
          environment: table.environment,
        };
      }

      return {
        name: item.name || item.column_name || "Unknown Column",
        type: item.type || item.data_type || "unknown",
        table: table.name,
        schema: table.schema,
        connectionName: table.connectionName,
        environment: table.environment,
      };
    });
  }

  private parseDbSummary(summary: any, connectionName: string, environment?: string): Schema[] {
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
      // Return a special placeholder item to show in the UI
      return [{
        name: summary?.count === 0 ? "No databases available" : `No databases found (${summary?.count || 0})`,
        tables: [],
        connectionName: connectionName,
        environment: environment,
        isPlaceholder: true
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
          tables: [],
          connectionName: connectionName,
          environment: environment,
        };
      }

      return {
        name: item.name || item.database_name || "Unknown Database",
        tables: (item.tables || []).map((table: any) =>
          typeof table === "string" ? table : table.name
        ),
        connectionName: connectionName,
        environment: environment,
      };
    });
  }

  private async getChildrenForConnection(connectionElement: ConnectionItem): Promise<Schema[]> {
    const connection = connectionElement.itemData as ConnectionDisplayData;
    if (this.databaseCache.has(connection.name)) {
      return this.databaseCache.get(connection.name) || [];
    }

    try {
      const summary = await this.getDatabaseSummary(connection.name, connection.environment);
      const schemas = this.parseDbSummary(summary, connection.name, connection.environment);
      this.databaseCache.set(connection.name, schemas);
      return schemas;
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error loading schemas: ${error.message}`);
      return [];
    }
  }

  private async getChildrenForSchema(schema: Schema): Promise<Table[]> {
    try {
      // Get environment from the connection
      const connection = this.connections.find(conn => conn.name === schema.connectionName);
      const environment = connection?.environment;
      
      const summary = await this.getTablesSummary(schema.connectionName, schema.name, environment);
      return this.parseTableSummary(summary, schema);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error loading tables: ${error.message}`);
      return [];
    }
  }

  private async getChildrenForTable(table: Table): Promise<ConnectionItem[]> {
    const cacheKey = `${table.connectionName}.${table.schema}.${table.name}`;
    
    // Get environment from the connection
    const connection = this.connections.find(conn => conn.name === table.connectionName);
    const environment = connection?.environment;

    if (this.columnsCache.has(cacheKey)) {
      return this.columnsCache.get(cacheKey)!.map((column) => {
        const columnItem = new ConnectionItem(
          column.name,
          vscode.TreeItemCollapsibleState.None,
          column,
          "column"
        );
        columnItem.description = column.type;
        columnItem.tooltip = `Column: ${column.name}, Type: ${column.type}`;
        return columnItem;
      });
    }

    try {
      const columnsResponse = await this.getColumnsSummary(
        table.connectionName,
        table.schema,
        table.name,
        environment
      );
      const columns = this.parseColumnsSummary(columnsResponse, table);
      this.columnsCache.set(cacheKey, columns);
      return columns.map((column) => {
        const columnItem = new ConnectionItem(
          column.name,
          vscode.TreeItemCollapsibleState.None,
          column,
          "column"
        );
        columnItem.description = column.type;
        columnItem.tooltip = `Column: ${column.name}, Type: ${column.type}`;
        return columnItem;
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to get columns for ${table.name}: ${error}`);
      return [];
    }
  }

  private parseTableSummary(summary: any, schema: Schema): Table[] {
    const tablesArray = Array.isArray(summary) ? summary : summary?.tables;
    if (!Array.isArray(tablesArray)) {
      throw new Error("Invalid tables summary format: not an array or object with a 'tables' property.");
    }
    return tablesArray.map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          schema: schema.name,
          connectionName: schema.connectionName,
        };
      }
      return {
        name: item.name || "Unknown Table",
        schema: schema.name,
        connectionName: schema.connectionName,
      };
    });
  }

  // Add method to remove schema favorite with environment context
  public async removeSchemaFavoriteWithEnvironment(schema: Schema, environment: string): Promise<void> {
    const favoriteKey = createFavoriteKey(schema.name, schema.connectionName, environment);
    this.favorites.delete(favoriteKey);
    
    await this.saveFavoritesToSettings();
    this._onDidChangeTreeData.fire();
  }

  // Add method to remove table favorite with environment context
  public async removeTableFavoriteWithEnvironment(table: Table, environment: string): Promise<void> {
    const favoriteKey = createTableFavoriteKey(table.name, table.schema, table.connectionName, environment);
    this.tableFavorites.delete(favoriteKey);
    
    // Clear cache for this table
    const cacheKey = `${table.connectionName}.${environment}.${table.schema}.${table.name}`;
    this.columnsCache.delete(cacheKey);
    
    await this.saveTableFavoritesToSettings();
    this._onDidChangeTreeData.fire();
  }
}
