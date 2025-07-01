import * as vscode from 'vscode';
import { getSchemaFavorites, saveSchemaFavorites, SchemaFavorite, createFavoriteKey } from "../extension/configuration";
import { BruinDBTCommand } from '../bruin/bruinDBTCommand';

// Define interfaces for the hierarchical structure
interface FavoriteConnection {
  name: string;
  schemas: SchemaFavorite[];
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
    }
  }
}

export class FavoritesProvider implements vscode.TreeDataProvider<FavoriteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FavoriteItem | undefined | null | void> = new vscode.EventEmitter<FavoriteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FavoriteItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private favorites: SchemaFavorite[] = [];
  private extensionPath: string;
  private tableCache = new Map<string, string[]>(); // Cache for tables per schema
  private columnsCache = new Map<string, FavoriteColumn[]>(); // Cache for columns per table

  constructor() {
    this.extensionPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.loadFavorites();
  }

  private loadFavorites(): void {
    this.favorites = getSchemaFavorites();
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

  // Group favorites by connection name
  private groupFavoritesByConnection(): FavoriteConnection[] {
    const connectionMap = new Map<string, SchemaFavorite[]>();
    
    this.favorites.forEach(favorite => {
      if (!connectionMap.has(favorite.connectionName)) {
        connectionMap.set(favorite.connectionName, []);
      }
      connectionMap.get(favorite.connectionName)!.push(favorite);
    });

    return Array.from(connectionMap.entries()).map(([connectionName, schemas]) => ({
      name: connectionName,
      schemas: schemas
    }));
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
      // Show schemas under connection
      const connection = element.itemData as FavoriteConnection;
      return connection.schemas.map(schema => {
        return new FavoriteItem(
          schema.schemaName,
          vscode.TreeItemCollapsibleState.Collapsed,
          schema,
          'favorite_schema'
        );
      });
    }

    if (element.contextValue === 'favorite_schema') {
      // Show tables under schema
      const schema = element.itemData as SchemaFavorite;
      const cacheKey = `${schema.connectionName}.${schema.schemaName}`;
      
      // Check cache first
      if (this.tableCache.has(cacheKey)) {
        const tables = this.tableCache.get(cacheKey)!;
        return tables.map(tableName => {
          const table: FavoriteTable = {
            name: tableName,
            schema: schema.schemaName,
            connectionName: schema.connectionName
          };
          return new FavoriteItem(
            tableName,
            vscode.TreeItemCollapsibleState.Collapsed,
            table,
            'favorite_table'
          );
        });
      }

      try {
        // Fetch tables using the same method as ActivityBarConnectionsProvider
        const tablesResponse = await this.getTablesSummary(schema.connectionName, schema.schemaName);
        const tables = tablesResponse.tables || [];
        
        // Cache the results
        this.tableCache.set(cacheKey, tables);
        
        return tables.map((tableName: string) => {
          const table: FavoriteTable = {
            name: tableName,
            schema: schema.schemaName,
            connectionName: schema.connectionName
          };
          return new FavoriteItem(
            tableName,
            vscode.TreeItemCollapsibleState.Collapsed,
            table,
            'favorite_table'
          );
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get tables for ${schema.schemaName}: ${error}`);
        return [];
      }
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
            `${column.name} (${column.type})`,
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
            `${column.name} (${column.type})`,
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