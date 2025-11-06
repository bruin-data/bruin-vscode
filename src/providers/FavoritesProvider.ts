import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
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
import { BruinDBTCommand } from "../bruin/bruinDBTCommand";
import { BruinConnections } from "../bruin/bruinConnections";
import { Connection } from "../utilities/helperUtils";
import { bruinWorkspaceDirectory } from "../bruin/bruinUtils";
import { getBruinExecutablePath } from "./BruinExecutableService";

// Define interfaces for the hierarchical structure
interface FavoriteConnection {
  name: string;
  environment: string;
  schemas: SchemaFavorite[];
  tables: TableFavorite[];
}

interface FavoriteTable {
  name: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

interface FavoriteColumn {
  name: string;
  type: string;
  table: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

type FavoriteItemData = FavoriteConnection | SchemaFavorite | FavoriteTable | FavoriteColumn;

class FavoriteItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: FavoriteItemData,
    public readonly contextValue:
      | "favorite_connection"
      | "favorite_schema"
      | "schema_with_table_favorites"
      | "favorite_table"
      | "favorite_table_starred"
      | "favorite_column"
      | "table"
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;

    // Set appropriate icons
    if (this.contextValue === "favorite_connection") {
      this.iconPath = new vscode.ThemeIcon("plug");
      const connection = itemData as FavoriteConnection;
      this.description = connection.environment; // Show environment as description
      this.tooltip = `Connection: ${connection.name} (${connection.environment})`;
    } else if (
      this.contextValue === "favorite_schema" ||
      this.contextValue === "schema_with_table_favorites"
    ) {
      this.iconPath = new vscode.ThemeIcon("database");
      const schema = itemData as SchemaFavorite;
      this.tooltip = `${schema.connectionName}.${schema.schemaName}`;
    } else if (
      this.contextValue === "favorite_table" ||
      this.contextValue === "favorite_table_starred" ||
      this.contextValue === "table"
    ) {
      this.iconPath = new vscode.ThemeIcon("table");
      const table = itemData as FavoriteTable;
      this.tooltip = `${table.connectionName}.${table.schema}.${table.name}`;
      // Add command for table details
      this.command = {
        command: "bruin.showTableDetails",
        title: "Show Table Details",
        // Pass schema/database name for all connection types
        // For schema-aware: table.schema is the schema name
        // For non-schema-aware: table.schema is the database name
        arguments: [table.name, table.schema, table.connectionName, table.environment],
      };
    } else if (this.contextValue === "favorite_column") {
      this.iconPath = new vscode.ThemeIcon("symbol-field");
      const column = itemData as FavoriteColumn;
      this.tooltip = `Column: ${column.name}, Type: ${column.type}`;
      this.description = column.type;
    }
  }
}

export class FavoritesProvider implements vscode.TreeDataProvider<FavoriteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FavoriteItem | undefined | null | void> =
    new vscode.EventEmitter<FavoriteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FavoriteItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private favorites: SchemaFavorite[] = [];
  private tableFavorites: TableFavorite[] = [];
  private extensionPath: string;
  private tableCache = new Map<string, string[]>(); // Cache for tables per schema
  private columnsCache = new Map<string, FavoriteColumn[]>(); // Cache for columns per table
  private connections: Connection[] = []; // Store connection data for environment info
  private bruinConnections: BruinConnections;
  private connectionsLoaded = false; // Track if connections have been loaded
  private connectionLoadError: string | null = null; // Track connection loading errors

  constructor() {
    this.extensionPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    this.bruinConnections = new BruinConnections(getBruinExecutablePath(), workspaceFolder);
    this.loadFavorites();
  }

  // Check if the current workspace is a Bruin project
  private async isBruinWorkspace(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return false;
    }
    
    const bruinWorkspace = await bruinWorkspaceDirectory(workspaceFolder);
    return bruinWorkspace !== undefined;
  }

  private loadFavorites(): void {
    this.favorites = getSchemaFavorites();
    this.tableFavorites = getTableFavorites();
  }

  private async loadConnections(): Promise<void> {
    try {
      this.connections = await this.bruinConnections.getConnectionsForActivityBar();
      this.connectionsLoaded = true;
      this.connectionLoadError = null;
    } catch (error) {
      console.error("FavoritesProvider: Error loading connections:", error);
      this.connectionsLoaded = true;
      this.connectionLoadError = error instanceof Error ? error.message : String(error);
      this.connections = [];
    }
  }

  private getConnectionEnvironment(connectionName: string): string | undefined {
    const connection = this.connections.find(conn => conn.name === connectionName);
    return connection?.environment;
  }

  public refresh(): void {
    this.tableCache.clear();
    this.columnsCache.clear();
    this.loadFavorites();
    this.connectionsLoaded = false;
    this.connectionLoadError = null;
    this.loadConnections();
    this._onDidChangeTreeData.fire();
  }

  public async removeFavorite(favorite: SchemaFavorite): Promise<void> {
    const environment = favorite.environment || this.getConnectionEnvironment(favorite.connectionName) || 'default';
    const favoriteKey = createFavoriteKey(favorite.schemaName, favorite.connectionName, environment);
    
    this.favorites = this.favorites.filter(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        const fKey = createFavoriteKey(f.schemaName, f.connectionName, fEnv);
        return fKey !== favoriteKey;
      }
    );

    await saveSchemaFavorites(this.favorites);
    this._onDidChangeTreeData.fire();
  }

  public async removeTableFavorite(favorite: TableFavorite): Promise<void> {
    const environment = favorite.environment || this.getConnectionEnvironment(favorite.connectionName) || 'default';
    const favoriteKey = createTableFavoriteKey(
      favorite.tableName,
      favorite.schemaName,
      favorite.connectionName,
      environment
    );
    
    this.tableFavorites = this.tableFavorites.filter(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        const fKey = createTableFavoriteKey(f.tableName, f.schemaName, f.connectionName, fEnv);
        return fKey !== favoriteKey;
      }
    );

    await saveTableFavorites(this.tableFavorites);
    this._onDidChangeTreeData.fire();
  }

  // Add method to remove favorite by schema with environment context
  public async removeSchemaFavoriteWithEnvironment(schema: SchemaFavorite, environment: string): Promise<void> {
    const favoriteKey = createFavoriteKey(schema.schemaName, schema.connectionName, environment);
    
    this.favorites = this.favorites.filter(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        const fKey = createFavoriteKey(f.schemaName, f.connectionName, fEnv);
        return fKey !== favoriteKey;
      }
    );

    await saveSchemaFavorites(this.favorites);
    this._onDidChangeTreeData.fire();
  }

  // Add method to remove table favorite with environment context
  public async removeTableFavoriteWithEnvironment(table: TableFavorite, environment: string): Promise<void> {
    const favoriteKey = createTableFavoriteKey(
      table.tableName,
      table.schemaName,
      table.connectionName,
      environment
    );
    
    this.tableFavorites = this.tableFavorites.filter(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        const fKey = createTableFavoriteKey(f.tableName, f.schemaName, f.connectionName, fEnv);
        return fKey !== favoriteKey;
      }
    );

    await saveTableFavorites(this.tableFavorites);
    this._onDidChangeTreeData.fire();
  }

  // Add method to remove all favorites for a specific connection and environment
  public async removeAllFavoritesForConnection(connectionName: string, environment: string): Promise<void> {
    // Remove schema favorites
    this.favorites = this.favorites.filter(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        return !(f.connectionName === connectionName && fEnv === environment);
      }
    );

    // Remove table favorites
    this.tableFavorites = this.tableFavorites.filter(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        return !(f.connectionName === connectionName && fEnv === environment);
      }
    );

    await saveSchemaFavorites(this.favorites);
    await saveTableFavorites(this.tableFavorites);
    this._onDidChangeTreeData.fire();
  }

  // Update cache clearing to be environment-aware
  public clearCacheForConnection(connectionName: string, environment: string): void {
    const envKey = `${connectionName}.${environment}`;
    
    // Clear table cache
    const tableCacheKeysToDelete = Array.from(this.tableCache.keys()).filter(key =>
      key.startsWith(envKey)
    );
    tableCacheKeysToDelete.forEach(key => this.tableCache.delete(key));
    
    // Clear columns cache
    const columnsCacheKeysToDelete = Array.from(this.columnsCache.keys()).filter(key =>
      key.startsWith(envKey)
    );
    columnsCacheKeysToDelete.forEach(key => this.columnsCache.delete(key));
  }

  // Update refresh method to be environment-aware
  public refreshConnection(connectionName: string, environment: string): void {
    this.clearCacheForConnection(connectionName, environment);
    this._onDidChangeTreeData.fire();
  }

  // Helper method to check if a schema is favorited in a specific environment
  public isSchemaFavoritedInEnvironment(schema: SchemaFavorite, environment: string): boolean {
    const favoriteKey = createFavoriteKey(schema.schemaName, schema.connectionName, environment);
    return this.favorites.some(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        const fKey = createFavoriteKey(f.schemaName, f.connectionName, fEnv);
        return fKey === favoriteKey;
      }
    );
  }

  // Helper method to check if a table is favorited in a specific environment
  public isTableFavoritedInEnvironment(table: TableFavorite, environment: string): boolean {
    const favoriteKey = createTableFavoriteKey(
      table.tableName,
      table.schemaName,
      table.connectionName,
      environment
    );
    return this.tableFavorites.some(
      (f) => {
        const fEnv = f.environment || this.getConnectionEnvironment(f.connectionName) || 'default';
        const fKey = createTableFavoriteKey(f.tableName, f.schemaName, f.connectionName, fEnv);
        return fKey === favoriteKey;
      }
    );
  }

  // Group favorites by connection name (including environment info)
  private groupFavoritesByConnection(): FavoriteConnection[] {
    const connectionMap = new Map<string, FavoriteConnection>();

    // Get current workspace connection names for filtering
    const currentConnectionNames = new Set(this.connections.map(conn => conn.name));

    // Process schema favorites - only include those with connections in current workspace
    this.favorites.forEach((favorite) => {
      if (!currentConnectionNames.has(favorite.connectionName)) {
        return; // Skip favorites for connections not in current workspace
      }
      
      const environment = favorite.environment || this.getConnectionEnvironment(favorite.connectionName) || 'default';
      const connectionKey = `${favorite.connectionName}.${environment}`;
      
      if (!connectionMap.has(connectionKey)) {
        connectionMap.set(connectionKey, {
          name: favorite.connectionName,
          environment: environment,
          schemas: [],
          tables: [],
        });
      }
      connectionMap.get(connectionKey)!.schemas.push(favorite);
    });

    // Process table favorites - only include those with connections in current workspace
    this.tableFavorites.forEach((favorite) => {
      if (!currentConnectionNames.has(favorite.connectionName)) {
        return; // Skip favorites for connections not in current workspace
      }
      
      const environment = favorite.environment || this.getConnectionEnvironment(favorite.connectionName) || 'default';
      const connectionKey = `${favorite.connectionName}.${environment}`;
      
      if (!connectionMap.has(connectionKey)) {
        connectionMap.set(connectionKey, {
          name: favorite.connectionName,
          environment: environment,
          schemas: [],
          tables: [],
        });
      }
      connectionMap.get(connectionKey)!.tables.push(favorite);
    });

    return Array.from(connectionMap.values())
      .sort((a, b) => {
        // Sort by connection name first, then by environment
        const nameCompare = a.name.localeCompare(b.name);
        return nameCompare !== 0 ? nameCompare : a.environment.localeCompare(b.environment);
      });
  }

  getTreeItem(element: FavoriteItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FavoriteItem): Promise<FavoriteItem[]> {
    if (!element) {      
      // Root level - lazy load connections first if not already loaded
      if (!this.connectionsLoaded) {
        await this.loadConnections();
      }
      
      // Check if there are any favorites at all
      const hasFavorites = this.favorites.length > 0 || this.tableFavorites.length > 0;
      
      // If no favorites, show simple message
      if (!hasFavorites) {
        return [
          new FavoriteItem(
            "No favorites added",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "favorite_connection"
          )
        ];
      }
      
      // If there was an error loading connections, show error message
      if (this.connectionLoadError) {
        return [
          new FavoriteItem(
            "Error loading connection info",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "favorite_connection"
          )
        ];
      }
      
      // Root level - return connections with environment as description
      const groupedConnections = this.groupFavoritesByConnection();
      return groupedConnections.map((connection) => {
        return new FavoriteItem(
          connection.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          connection,
          "favorite_connection"
        );
      });
    }

    if (element.contextValue === "favorite_connection") {
      // Show schemas and tables under connection, grouped by schema
      const connection = element.itemData as FavoriteConnection;
      const items: FavoriteItem[] = [];

      // Create a map to group items by schema
      const schemaMap = new Map<
        string,
        {
          schema?: SchemaFavorite;
          tables: TableFavorite[];
        }
      >();

      // Add schema favorites to the map
      connection.schemas.forEach((schema) => {
        if (!schemaMap.has(schema.schemaName)) {
          schemaMap.set(schema.schemaName, { tables: [] });
        }
        schemaMap.get(schema.schemaName)!.schema = schema;
      });

      // Add table favorites to the map, grouped by schema
      connection.tables.forEach((table) => {
        if (!schemaMap.has(table.schemaName)) {
          schemaMap.set(table.schemaName, { tables: [] });
        }
        schemaMap.get(table.schemaName)!.tables.push(table);
      });

      // Create items for each schema
      Array.from(schemaMap.entries()).forEach(([schemaName, schemaData]) => {
        const schemaItem: SchemaFavorite = schemaData.schema || {
          schemaName: schemaName,
          connectionName: connection.name,
          environment: connection.environment,
        };

        // Determine context value based on whether schema is actually favorited
        const isSchemaFavorited = schemaData.schema !== undefined;
        const contextValue = isSchemaFavorited ? "favorite_schema" : "schema_with_table_favorites";

        items.push(
          new FavoriteItem(
            `${schemaName}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            schemaItem,
            contextValue
          )
        );
      });

      return items;
    }

    if (
      element.contextValue === "favorite_schema" ||
      element.contextValue === "schema_with_table_favorites"
    ) {
      const schema = element.itemData as SchemaFavorite;
      const environment = schema.environment || this.getConnectionEnvironment(schema.connectionName) || 'default';
      const cacheKey = `${schema.connectionName}.${environment}.${schema.schemaName}`;

      // Get favorite tables for this schema in this environment
      const favoriteTablesInSchema = this.tableFavorites.filter(
        (table) =>
          table.connectionName === schema.connectionName && 
          table.schemaName === schema.schemaName &&
          (table.environment || this.getConnectionEnvironment(table.connectionName) || 'default') === environment
      );

      // Check if this schema is actually favorited in this environment
      const isSchemaFavorited = this.favorites.some(
        (fav) =>
          fav.connectionName === schema.connectionName && 
          fav.schemaName === schema.schemaName &&
          (fav.environment || this.getConnectionEnvironment(fav.connectionName) || 'default') === environment
      );

      // Scenario 1: Only table favorites (no schema favorite)
      if (!isSchemaFavorited && favoriteTablesInSchema.length > 0) {
        return this.createTableItems(
          favoriteTablesInSchema.map((ft) => ft.tableName),
          schema,
          favoriteTablesInSchema.map((ft) => ft.tableName),
          false // Schema is not favorited
        );
      }

      // Scenario 2 & 3: Schema is favorited (with or without table favorites)
      if (isSchemaFavorited) {
        return await this.getSchemaTablesWithFavorites(schema, favoriteTablesInSchema, cacheKey);
      }

      return [];
    }

    if (
      element.contextValue === "favorite_table" ||
      element.contextValue === "favorite_table_starred" ||
      element.contextValue === "table"
    ) {
      // Show columns under table
      const table = element.itemData as FavoriteTable;
      const environment = table.environment || this.getConnectionEnvironment(table.connectionName) || 'default';
      const cacheKey = `${table.connectionName}.${environment}.${table.schema}.${table.name}`;

      // Check cache first
      if (this.columnsCache.has(cacheKey)) {
        const columns = this.columnsCache.get(cacheKey)!;
        return columns.map((column) => {
          return new FavoriteItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column,
            "favorite_column"
          );
        });
      }

      try {
        // Get environment for this connection
        const connectionEnvironment = this.getConnectionEnvironment(table.connectionName);
        
        // Fetch columns using getFetchColumns method
        const columnsResponse = await this.getColumnsSummary(
          table.connectionName,
          table.schema,
          table.name,
          connectionEnvironment
        );
        const columns = this.parseColumnsSummary(columnsResponse, table);

        // Cache the results
        this.columnsCache.set(cacheKey, columns);

        return columns.map((column) => {
          return new FavoriteItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column,
            "favorite_column"
          );
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get columns for ${table.name}: ${error}`);
        return [];
      }
    }

    return [];
  }

  // Helper method to get schema tables with favorites prioritized
  private async getSchemaTablesWithFavorites(
    schema: SchemaFavorite,
    favoriteTablesInSchema: TableFavorite[],
    cacheKey: string
  ): Promise<FavoriteItem[]> {
    const environment = schema.environment || this.getConnectionEnvironment(schema.connectionName) || 'default';
    
    // Check cache first
    if (this.tableCache.has(cacheKey)) {
      const allTables = this.tableCache.get(cacheKey)!;
      const favoriteTableNames = favoriteTablesInSchema.map((ft) => ft.tableName);
      return this.createTableItems(allTables, schema, favoriteTableNames, true);
    }

    try {
      // Fetch all tables from the database with retry logic
      const tablesResponse = await this.getTablesWithRetry(
        schema.connectionName,
        schema.schemaName
      );
      const allTables = tablesResponse.tables || [];

      // Cache the results
      this.tableCache.set(cacheKey, allTables);

      const favoriteTableNames = favoriteTablesInSchema.map((ft) => ft.tableName);
      return this.createTableItems(allTables, schema, favoriteTableNames, true);
    } catch (error) {
      console.error(`Failed to get tables for ${schema.schemaName}:`, error);

      // If we have favorite tables, show them even if we can't get all tables
      if (favoriteTablesInSchema.length > 0) {
        const favoriteTableNames = favoriteTablesInSchema.map((ft) => ft.tableName);
        return this.createTableItems(favoriteTableNames, schema, favoriteTableNames, true);
      }

      // Show error message but don't block the UI
      vscode.window.showWarningMessage(
        `Database connection issue for ${schema.schemaName} in ${environment}. Showing cached data if available.`
      );
      return [];
    }
  }

  // Helper method with retry logic for database operations
  private async getTablesWithRetry(
    connectionName: string,
    schemaName: string,
    maxRetries: number = 2
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }

        const environment = this.getConnectionEnvironment(connectionName);
        return await this.getTablesSummary(connectionName, schemaName, environment);
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed for ${connectionName}.${schemaName}:`, error);

        // If it's a connection issue, try again
        if (this.isConnectionError(error)) {
          continue;
        }

        // If it's not a connection issue, don't retry
        throw error;
      }
    }

    throw lastError;
  }

  // Helper method to check if error is connection-related
  private isConnectionError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || "";
    const connectionErrorPatterns = [
      "could not open database",
      "connection refused",
      "timeout",
      "network error",
      "connection lost",
      "database/sql/driver",
    ];

    return connectionErrorPatterns.some((pattern) =>
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Helper method to create table items with favorites at top
  private createTableItems(
    allTables: string[],
    schema: SchemaFavorite,
    favoriteTableNames: string[],
    isSchemaFavorited: boolean = true
  ): FavoriteItem[] {
    const items: FavoriteItem[] = [];
    const favoriteSet = new Set(favoriteTableNames);
    const environment = schema.environment || this.getConnectionEnvironment(schema.connectionName) || 'default';

    // Add favorite tables first with appropriate context
    favoriteTableNames.forEach((tableName) => {
      if (allTables.includes(tableName)) {
        const table: FavoriteTable = {
          name: tableName,
          schema: schema.schemaName,
          connectionName: schema.connectionName,
          environment: environment,
        };
        // Use starred context only if schema is also favorited
        const contextValue = isSchemaFavorited ? "favorite_table_starred" : "favorite_table";
        const favoriteTableItem = new FavoriteItem(
          tableName,
          vscode.TreeItemCollapsibleState.Collapsed,
          table,
          contextValue
        );
        items.push(favoriteTableItem);
      }
    });

    // Add other tables (non-favorites) only if schema is favorited
    if (isSchemaFavorited) {
      allTables.forEach((tableName) => {
        if (!favoriteSet.has(tableName)) {
          const table: FavoriteTable = {
            name: tableName,
            schema: schema.schemaName,
            connectionName: schema.connectionName,
            environment: environment,
          };
          items.push(
            new FavoriteItem(tableName, vscode.TreeItemCollapsibleState.Collapsed, table, "table")
          );
        }
      });
    }

    return items;
  }

  private async getTablesSummary(connectionName: string, database: string, environment?: string): Promise<any> {
    const workspaceFolder =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand(getBruinExecutablePath(), workspaceFolder);
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
    const command = new BruinDBTCommand(getBruinExecutablePath(), workspaceFolder);
    return command.getFetchColumns(connectionName, database, table, environment);
  }

  private parseColumnsSummary(summary: any, table: FavoriteTable): FavoriteColumn[] {
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
}
