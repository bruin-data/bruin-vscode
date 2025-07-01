import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BruinDBTCommand } from '../bruin/bruinDBTCommand';
import { BruinConnections } from '../bruin/bruinConnections';
import { Connection } from '../utilities/helperUtils';
import { getSchemaFavorites, saveSchemaFavorites, SchemaFavorite, createFavoriteKey } from "../extension/configuration";

// Define interfaces for the connection structure
interface ConnectionDisplayData {
  name: string;
  type: string;
  host?: string;
  port?: number;
  database?: string;
  environment?: string;
}

interface Schema {
  name: string;
  tables: string[];
  connectionName: string;
  isFavorite?: boolean;
}

interface Table {
  name: string;
  schema: string;
  connectionName: string;
}

interface Column {
  name: string;
  type: string;
  table: string;
  schema: string;
  connectionName: string;
}

type TreeItemData = ConnectionDisplayData | Schema | Table | Column;

class ConnectionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: TreeItemData,
    public readonly contextValue: 'bruin_connection' | 'schema' | 'schema_favorite' | 'schema_unfavorite' | 'table' | 'column' | 'connections'
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;

    if (this.contextValue === 'bruin_connection') {
      this.iconPath = new vscode.ThemeIcon('plug');
    } else if (this.contextValue === 'schema_favorite' || this.contextValue === 'schema_unfavorite') {
      this.iconPath = new vscode.ThemeIcon('database');
    } else if (this.contextValue === 'table') {
      this.iconPath = new vscode.ThemeIcon('table');
      // Command is now set in getChildren method
    } else if (this.contextValue === 'column') {
      this.iconPath = new vscode.ThemeIcon('symbol-field');
    } else {
      this.iconPath = new vscode.ThemeIcon('server-environment');
    }
  }
}

export class ActivityBarConnectionsProvider implements vscode.TreeDataProvider<ConnectionItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ConnectionItem | undefined | null | void> = new vscode.EventEmitter<ConnectionItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ConnectionItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private connections: ConnectionDisplayData[] = [];
  private bruinConnections: BruinConnections;
  private databaseCache = new Map<string, Schema[]>();
  private columnsCache = new Map<string, Column[]>(); // Cache for columns
  private favorites = new Set<string>(); // Store favorite schema keys as "connectionName.schemaName"
  
  // Allowed connection types
  private readonly allowedConnectionTypes = [
    'duckdb',
    'google_cloud_platform',
    'gcp',
    'snowflake',
    'postgres',
    'redshift',
    'clickhouse',
    'databricks',
    'athena'
  ];

  constructor(private extensionPath: string) {
    // Get the current workspace folder or fallback to extension path
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || extensionPath;
    
    // Initialize BruinConnections with proper parameters
    this.bruinConnections = new BruinConnections("bruin", workspaceFolder);
    this.loadFavoritesFromSettings();
    this.loadConnections();
  }

  // Load favorites from VS Code settings
  private loadFavoritesFromSettings(): void {
    const savedFavorites = getSchemaFavorites();
    this.favorites.clear();
    savedFavorites.forEach(favorite => {
      const key = createFavoriteKey(favorite.schemaName, favorite.connectionName);
      this.favorites.add(key);
    });
  }

  // Save favorites to VS Code settings
  private async saveFavoritesToSettings(): Promise<void> {
    const favoritesArray: SchemaFavorite[] = Array.from(this.favorites).map(key => {
      const [connectionName, schemaName] = key.split('.');
      return { schemaName, connectionName };
    });
    await saveSchemaFavorites(favoritesArray);
  }

  public refresh(): void {
    this.databaseCache.clear();
    this.columnsCache.clear();
    this.loadFavoritesFromSettings();
    this.loadConnections();
  }

  public refreshConnection(connectionName: string): void {
    this.databaseCache.delete(connectionName);
    // Also clear columns cache for this connection
    const keysToDelete = Array.from(this.columnsCache.keys()).filter(key => key.startsWith(connectionName));
    keysToDelete.forEach(key => this.columnsCache.delete(key));
    this._onDidChangeTreeData.fire();
  }

  // Toggle favorite status for a schema
  public async toggleSchemaFavorite(schema: Schema): Promise<void> {
    const favoriteKey = `${schema.connectionName}.${schema.name}`;
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
    const favoriteKey = `${schema.connectionName}.${schema.name}`;
    return this.favorites.has(favoriteKey);
  }

  public async loadConnections(): Promise<void> {
    try {
      // Get connections from Bruin CLI
      const connections = await this.bruinConnections.getConnectionsForActivityBar();
      
      if (connections && connections.length > 0) {
        this.setConnections(connections);
      }
      
      this._onDidChangeTreeData.fire();
    } catch (error) {
      console.error('ActivityBarConnectionsProvider: Error loading connections:', error);
      this._onDidChangeTreeData.fire();
    }
  }

  // Method to set connections data (called by BruinConnections)
  public setConnections(connections: Connection[]): void {
    this.connections = connections.map((conn: Connection) => ({
      ...conn,
      name: conn.name || 'Unknown',
      type: conn.type,
      environment: conn.environment
    }));
    this._onDidChangeTreeData.fire();
  }

  // Method to handle connection errors
  public handleConnectionError(error: string): void {
    console.error('Error loading connections:', error);
    this.connections = [];
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConnectionItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ConnectionItem): Promise<ConnectionItem[]> {
    if (!element) {
      // Root level - return filtered connections based on allowed types
      return this.connections
        .filter(connection => this.allowedConnectionTypes.includes(connection.type.toLowerCase()))
        .map(connection => {
          const item = new ConnectionItem(
            connection.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            connection,
            'bruin_connection'
          );
          item.tooltip = `${connection.type}`;
          return item;
        });
    }

    if (element.contextValue === 'bruin_connection' && 'name' in element.itemData) {
      const connectionName = element.itemData.name;
      if (this.databaseCache.has(connectionName)) {
        return this.databaseCache.get(connectionName)!.map(schema => {
          const isFavorite = this.isSchemaFavorite(schema);
          const contextValue = isFavorite ? 'schema_favorite' : 'schema_unfavorite';
          const schemaItem = new ConnectionItem(schema.name, vscode.TreeItemCollapsibleState.Collapsed, schema, contextValue);
          // Keep the database icon on the left
          schemaItem.iconPath = new vscode.ThemeIcon('database');
          return schemaItem;
        });
      }

      try {
        const summary = await this.getDatabaseSummary(connectionName);
        const schemas = this.parseDbSummary(summary, connectionName);
        this.databaseCache.set(connectionName, schemas);
        return schemas.map(schema => {
          const isFavorite = this.isSchemaFavorite(schema);
          const contextValue = isFavorite ? 'schema_favorite' : 'schema_unfavorite';
          const schemaItem = new ConnectionItem(schema.name, vscode.TreeItemCollapsibleState.Collapsed, schema, contextValue);
          // Keep the database icon on the left
          schemaItem.iconPath = new vscode.ThemeIcon('database');
          return schemaItem;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get database summary: ${error}`);
        return [];
      }
    }
    
    if ((element.contextValue === 'schema_favorite' || element.contextValue === 'schema_unfavorite') && 'tables' in element.itemData) {
      const schema = element.itemData as Schema;
      try {
        const tablesResponse = await this.getTablesSummary(schema.connectionName, schema.name);
        const tables = tablesResponse.tables || [];
        return tables.map((table: string) => {
          const tableItem: Table = { name: table, schema: schema.name, connectionName: schema.connectionName };
          const tableTreeItem = new ConnectionItem(table, vscode.TreeItemCollapsibleState.Collapsed, tableItem, 'table');
          // Add command with both table name and schema name
          tableTreeItem.command = {
            command: 'bruin.showTableDetails',
            title: 'Show Table Details',
            arguments: [table, schema.name, schema.connectionName]
          };
          return tableTreeItem;
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get tables for ${schema.name}: ${error}`);
        return [];
      }
    }

    if (element.contextValue === 'table' && 'name' in element.itemData && 'schema' in element.itemData) {
      const table = element.itemData as Table;
      const cacheKey = `${table.connectionName}.${table.schema}.${table.name}`;
      
      if (this.columnsCache.has(cacheKey)) {
        return this.columnsCache.get(cacheKey)!.map(column => {
          const columnItem = new ConnectionItem(
            `${column.name} (${column.type})`,
            vscode.TreeItemCollapsibleState.None,
            column,
            'column'
          );
          columnItem.tooltip = `Column: ${column.name}, Type: ${column.type}`;
          return columnItem;
        });
      }

      try {
        const columnsResponse = await this.getColumnsSummary(table.connectionName, table.schema, table.name);
        const columns = this.parseColumnsSummary(columnsResponse, table);
        this.columnsCache.set(cacheKey, columns);
        return columns.map(column => {
          const columnItem = new ConnectionItem(
            `${column.name} (${column.type})`,
            vscode.TreeItemCollapsibleState.None,
            column,
            'column'
          );
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

  private async getDatabaseSummary(connectionName: string): Promise<any> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getFetchDatabases(connectionName);
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

  private parseColumnsSummary(summary: any, table: Table): Column[] {
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

  private parseDbSummary(summary: any, connectionName: string): Schema[] {
    const schemasArray = Array.isArray(summary) ? summary : summary?.databases;

    if (!Array.isArray(schemasArray)) {
        throw new Error("Invalid summary format: not an array or object with a 'databases' property.");
    }
    return schemasArray.map(item => {
        if (typeof item === 'string') {
            return {
                name: item,
                tables: [],
                connectionName: connectionName
            };
        }
        
        return {
            name: item.name || item.database_name || 'Unknown Database',
            tables: (item.tables || []).map((table: any) => typeof table === 'string' ? table : table.name),
            connectionName: connectionName
        };
    });
  }
  
} 