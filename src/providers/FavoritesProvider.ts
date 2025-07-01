import * as vscode from 'vscode';
import { getSchemaFavorites, saveSchemaFavorites, SchemaFavorite, createFavoriteKey, getTableFavorites, saveTableFavorites, TableFavorite, createTableFavoriteKey } from "../extension/configuration";
import { BruinDBTCommand } from '../bruin/bruinDBTCommand';

// Define interfaces for the hierarchical structure
interface FavoriteConnection {
  name: string;
  schemas: SchemaFavorite[];
  tables: TableFavorite[];
}

interface FavoriteTable {
  name: string;
  schema: string;
  connectionName: string;
}

interface FavoriteColumn {
  name: string;
  type: string;
  table: string;
  schema: string;
  connectionName: string;
}

type FavoriteItemData = FavoriteConnection | SchemaFavorite | FavoriteTable | FavoriteColumn;

class FavoriteItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: FavoriteItemData,
    public readonly contextValue: 'favorite_connection' | 'favorite_schema' | 'favorite_table' | 'favorite_column'
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    
    // Set appropriate icons
    if (this.contextValue === 'favorite_connection') {
      this.iconPath = new vscode.ThemeIcon('plug');
      this.tooltip = `Connection: ${label}`;
    } else if (this.contextValue === 'favorite_schema') {
      this.iconPath = new vscode.ThemeIcon('database');
      const schema = itemData as SchemaFavorite;
      this.tooltip = `${schema.connectionName}.${schema.schemaName}`;
    } else if (this.contextValue === 'favorite_table') {
      this.iconPath = new vscode.ThemeIcon('table');
      const table = itemData as FavoriteTable;
      this.tooltip = `${table.connectionName}.${table.schema}.${table.name}`;
      // Add command for table details
      this.command = {
        command: 'bruin.showTableDetails',
        title: 'Show Table Details',
        arguments: [table.name, table.schema, table.connectionName]
      };
    } else if (this.contextValue === 'favorite_column') {
      this.iconPath = new vscode.ThemeIcon('symbol-field');
      const column = itemData as FavoriteColumn;
      this.tooltip = `Column: ${column.name}, Type: ${column.type}`;
      this.description = column.type;
    }
  }
}

export class FavoritesProvider implements vscode.TreeDataProvider<FavoriteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FavoriteItem | undefined | null | void> = new vscode.EventEmitter<FavoriteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FavoriteItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private favorites: SchemaFavorite[] = [];
  private tableFavorites: TableFavorite[] = [];
  private extensionPath: string;
  private tableCache = new Map<string, string[]>(); // Cache for tables per schema
  private columnsCache = new Map<string, FavoriteColumn[]>(); // Cache for columns per table

  constructor() {
    this.extensionPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.loadFavorites();
  }

  private loadFavorites(): void {
    this.favorites = getSchemaFavorites();
    this.tableFavorites = getTableFavorites();
  }

  public refresh(): void {
    this.tableCache.clear();
    this.columnsCache.clear();
    this.loadFavorites();
    this._onDidChangeTreeData.fire();
  }

  public async removeFavorite(favorite: SchemaFavorite): Promise<void> {
    const favoriteKey = createFavoriteKey(favorite.schemaName, favorite.connectionName);
    this.favorites = this.favorites.filter(f => 
      createFavoriteKey(f.schemaName, f.connectionName) !== favoriteKey
    );
    
    await saveSchemaFavorites(this.favorites);
    this._onDidChangeTreeData.fire();
  }

  public async removeTableFavorite(favorite: TableFavorite): Promise<void> {
    const favoriteKey = createTableFavoriteKey(favorite.tableName, favorite.schemaName, favorite.connectionName);
    this.tableFavorites = this.tableFavorites.filter(f => 
      createTableFavoriteKey(f.tableName, f.schemaName, f.connectionName) !== favoriteKey
    );
    
    await saveTableFavorites(this.tableFavorites);
    this._onDidChangeTreeData.fire();
  }

  // Group favorites by connection name
  private groupFavoritesByConnection(): FavoriteConnection[] {
    const connectionMap = new Map<string, FavoriteConnection>();
    
    // Add schema favorites
    this.favorites.forEach(favorite => {
      if (!connectionMap.has(favorite.connectionName)) {
        connectionMap.set(favorite.connectionName, {
          name: favorite.connectionName,
          schemas: [],
          tables: []
        });
      }
      connectionMap.get(favorite.connectionName)!.schemas.push(favorite);
    });

    // Add table favorites
    this.tableFavorites.forEach(favorite => {
      if (!connectionMap.has(favorite.connectionName)) {
        connectionMap.set(favorite.connectionName, {
          name: favorite.connectionName,
          schemas: [],
          tables: []
        });
      }
      connectionMap.get(favorite.connectionName)!.tables.push(favorite);
    });

    return Array.from(connectionMap.values());
  }

  getTreeItem(element: FavoriteItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FavoriteItem): Promise<FavoriteItem[]> {
    if (!element) {
      // Root level - return connections grouped by connection name
      const groupedConnections = this.groupFavoritesByConnection();
      return groupedConnections.map(connection => {
        return new FavoriteItem(
          connection.name,
          vscode.TreeItemCollapsibleState.Collapsed,
          connection,
          'favorite_connection'
        );
      });
    }

    if (element.contextValue === 'favorite_connection') {
      // Show schemas and tables under connection, grouped by schema
      const connection = element.itemData as FavoriteConnection;
      const items: FavoriteItem[] = [];
      
      // Create a map to group items by schema
      const schemaMap = new Map<string, { 
        schema?: SchemaFavorite, 
        tables: TableFavorite[] 
      }>();
      
      // Add schema favorites to the map
      connection.schemas.forEach(schema => {
        if (!schemaMap.has(schema.schemaName)) {
          schemaMap.set(schema.schemaName, { tables: [] });
        }
        schemaMap.get(schema.schemaName)!.schema = schema;
      });
      
      // Add table favorites to the map, grouped by schema
      connection.tables.forEach(table => {
        if (!schemaMap.has(table.schemaName)) {
          schemaMap.set(table.schemaName, { tables: [] });
        }
        schemaMap.get(table.schemaName)!.tables.push(table);
      });
      
      // Create items for each schema
      Array.from(schemaMap.entries()).forEach(([schemaName, schemaData]) => {
        const schemaItem: SchemaFavorite = schemaData.schema || {
          schemaName: schemaName,
          connectionName: connection.name
        };
        
        items.push(new FavoriteItem(
          `${schemaName}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          schemaItem,
          'favorite_schema'
        ));
      });
      
      return items;
    }

    if (element.contextValue === 'favorite_schema') {
      const schema = element.itemData as SchemaFavorite;
      const cacheKey = `${schema.connectionName}.${schema.schemaName}`;
      
      // Get favorite tables for this schema
      const favoriteTablesInSchema = this.tableFavorites.filter(table => 
        table.connectionName === schema.connectionName && 
        table.schemaName === schema.schemaName
      );
      
      // Check if this schema is actually favorited
      const isSchemaFavorited = this.favorites.some(fav => 
        fav.connectionName === schema.connectionName && 
        fav.schemaName === schema.schemaName
      );
      
      // Scenario 1: Only table favorites (no schema favorite)
      if (!isSchemaFavorited && favoriteTablesInSchema.length > 0) {
        return this.createTableItems(favoriteTablesInSchema.map(ft => ft.tableName), schema, favoriteTablesInSchema.map(ft => ft.tableName));
      }
      
      // Scenario 2 & 3: Schema is favorited (with or without table favorites)
      if (isSchemaFavorited) {
        return await this.getSchemaTablesWithFavorites(schema, favoriteTablesInSchema, cacheKey);
      }
      
      return [];
    }

    if (element.contextValue === 'favorite_table') {
      // Show columns under table
      const table = element.itemData as FavoriteTable;
      const cacheKey = `${table.connectionName}.${table.schema}.${table.name}`;
      
      // Check cache first
      if (this.columnsCache.has(cacheKey)) {
        const columns = this.columnsCache.get(cacheKey)!;
        return columns.map(column => {
          return new FavoriteItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column,
            'favorite_column'
          );
        });
      }

      try {
        // Fetch columns using getFetchColumns method
        const columnsResponse = await this.getColumnsSummary(table.connectionName, table.schema, table.name);
        const columns = this.parseColumnsSummary(columnsResponse, table);
        
        // Cache the results
        this.columnsCache.set(cacheKey, columns);
        
        return columns.map(column => {
          return new FavoriteItem(
            column.name,
            vscode.TreeItemCollapsibleState.None,
            column,
            'favorite_column'
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
  private async getSchemaTablesWithFavorites(schema: SchemaFavorite, favoriteTablesInSchema: TableFavorite[], cacheKey: string): Promise<FavoriteItem[]> {
    // Check cache first
    if (this.tableCache.has(cacheKey)) {
      const allTables = this.tableCache.get(cacheKey)!;
      const favoriteTableNames = favoriteTablesInSchema.map(ft => ft.tableName);
      return this.createTableItems(allTables, schema, favoriteTableNames);
    }

    try {
      // Fetch all tables from the database with retry logic
      const tablesResponse = await this.getTablesWithRetry(schema.connectionName, schema.schemaName);
      const allTables = tablesResponse.tables || [];
      
      // Cache the results
      this.tableCache.set(cacheKey, allTables);
      
      const favoriteTableNames = favoriteTablesInSchema.map(ft => ft.tableName);
      return this.createTableItems(allTables, schema, favoriteTableNames);
    } catch (error) {
      console.error(`Failed to get tables for ${schema.schemaName}:`, error);
      
      // If we have favorite tables, show them even if we can't get all tables
      if (favoriteTablesInSchema.length > 0) {
        const favoriteTableNames = favoriteTablesInSchema.map(ft => ft.tableName);
        return this.createTableItems(favoriteTableNames, schema, favoriteTableNames);
      }
      
      // Show error message but don't block the UI
      vscode.window.showWarningMessage(`Database connection issue for ${schema.schemaName}. Showing cached data if available.`);
      return [];
    }
  }

  // Helper method with retry logic for database operations
  private async getTablesWithRetry(connectionName: string, schemaName: string, maxRetries: number = 2): Promise<any> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
        
        return await this.getTablesSummary(connectionName, schemaName);
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
    const errorMessage = error?.message || error?.toString() || '';
    const connectionErrorPatterns = [
      'could not open database',
      'connection refused',
      'timeout',
      'network error',
      'connection lost',
      'database/sql/driver'
    ];
    
    return connectionErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  // Helper method to create table items with favorites at top
  private createTableItems(allTables: string[], schema: SchemaFavorite, favoriteTableNames: string[]): FavoriteItem[] {
    const items: FavoriteItem[] = [];
    const favoriteSet = new Set(favoriteTableNames);
    
    // Add favorite tables first with star icon
    favoriteTableNames.forEach(tableName => {
      if (allTables.includes(tableName)) {
        const table: FavoriteTable = {
          name: tableName,
          schema: schema.schemaName,
          connectionName: schema.connectionName
        };
        const favoriteTableItem = new FavoriteItem(
          tableName,
          vscode.TreeItemCollapsibleState.Collapsed,
          table,
          'favorite_table'
        );
        favoriteTableItem.iconPath = new vscode.ThemeIcon('star-full');
        items.push(favoriteTableItem);
      }
    });
    
    // Add other tables (non-favorites)
    allTables.forEach(tableName => {
      if (!favoriteSet.has(tableName)) {
        const table: FavoriteTable = {
          name: tableName,
          schema: schema.schemaName,
          connectionName: schema.connectionName
        };
        items.push(new FavoriteItem(
          tableName,
          vscode.TreeItemCollapsibleState.Collapsed,
          table,
          'favorite_table'
        ));
      }
    });
    
    return items;
  }

  private async getTablesSummary(connectionName: string, database: string): Promise<any> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getFetchTables(connectionName, database);
  }

  private async getColumnsSummary(connectionName: string, database: string, table: string): Promise<any> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getFetchColumns(connectionName, database, table);
  }

  private parseColumnsSummary(summary: any, table: FavoriteTable): FavoriteColumn[] {
    const columnsArray = Array.isArray(summary) ? summary : summary?.columns;

    if (!Array.isArray(columnsArray)) {
      throw new Error("Invalid columns summary format: not an array or object with a 'columns' property.");
    }

    return columnsArray.map(item => {
      if (typeof item === 'string') {
        return {
          name: item,
          type: 'unknown',
          table: table.name,
          schema: table.schema,
          connectionName: table.connectionName
        };
      }
      
      return {
        name: item.name || item.column_name || 'Unknown Column',
        type: item.type || item.data_type || 'unknown',
        table: table.name,
        schema: table.schema,
        connectionName: table.connectionName
      };
    });
  }
} 