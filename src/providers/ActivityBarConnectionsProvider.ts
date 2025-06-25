import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BruinDBTCommand } from '../bruin/bruinDBTCommand';
import { BruinConnections } from '../bruin/bruinConnections';
import { Connection } from '../utilities/helperUtils';

// Define interfaces for the connection structure
interface ConnectionDisplayData {
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  host?: string;
  port?: number;
  database?: string;
  environment?: string;
}

interface Schema {
  name: string;
  tables: string[];
  connectionName: string;
}

interface Table {
  name: string;
  schema: string;
  connectionName: string;
}

type TreeItemData = ConnectionDisplayData | Schema | Table;

class ConnectionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: TreeItemData,
    public readonly contextValue: 'connection' | 'schema' | 'table' | 'connections'
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;

    if (this.contextValue === 'connection' && 'status' in this.itemData) {
      switch (this.itemData.status) {
        case 'connected':
          this.iconPath = new vscode.ThemeIcon('plug', new vscode.ThemeColor('charts.green'));
          break;
        case 'disconnected':
          this.iconPath = new vscode.ThemeIcon('debug-disconnect', new vscode.ThemeColor('charts.gray'));
          break;
        case 'error':
          this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
          break;
      }
    } else if (this.contextValue === 'schema') {
      this.iconPath = new vscode.ThemeIcon('database');
    } else if (this.contextValue === 'table') {
      this.iconPath = new vscode.ThemeIcon('table');
      // Command is now set in getChildren method
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
    this.loadConnections();
  }

  public refresh(): void {
    this.databaseCache.clear();
    this.loadConnections();
  }

  public refreshConnection(connectionName: string): void {
    this.databaseCache.delete(connectionName);
    this._onDidChangeTreeData.fire();
  }

  // Load connections using BruinConnections.getConnectionsForActivityBar() method
  public async loadConnections(): Promise<void> {
    try {
      console.log('ActivityBarConnectionsProvider: Loading connections...');
      // Get connections from Bruin CLI
      const connections = await this.bruinConnections.getConnectionsForActivityBar();
      console.log('ActivityBarConnectionsProvider: Received connections:', connections);
      
      if (!connections || connections.length === 0) {
        console.log('ActivityBarConnectionsProvider: No connections found, adding test data');
      } else {
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
      status: 'disconnected' as const,
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
            'connection'
          );
          item.tooltip = `${connection.type}`;
          return item;
        });
    }

    if (element.contextValue === 'connection' && 'name' in element.itemData) {
      const connectionName = element.itemData.name;
      if (this.databaseCache.has(connectionName)) {
        return this.databaseCache.get(connectionName)!.map(schema => 
          new ConnectionItem(schema.name, vscode.TreeItemCollapsibleState.Collapsed, schema, 'schema')
        );
      }

      try {
        const summary = await this.getDatabaseSummary(connectionName);
        const schemas = this.parseDbSummary(summary, connectionName);
        this.databaseCache.set(connectionName, schemas);
        return schemas.map(schema => 
          new ConnectionItem(schema.name, vscode.TreeItemCollapsibleState.Collapsed, schema, 'schema')
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get database summary: ${error}`);
        return [];
      }
    }
    
    if (element.contextValue === 'schema' && 'tables' in element.itemData) {
      const schema = element.itemData as Schema;
      return schema.tables.map(table => {
        const tableItem: Table = { name: table, schema: schema.name, connectionName: schema.connectionName };
        const tableTreeItem = new ConnectionItem(table, vscode.TreeItemCollapsibleState.None, tableItem, 'table');
        // Add command with both table name and schema name
        tableTreeItem.command = {
          command: 'bruin.showTableDetails',
          title: 'Show Table Details',
          arguments: [table, schema.name, schema.connectionName]
        };
        return tableTreeItem;
      });
    }

    return [];
  }

  private async getDatabaseSummary(connectionName: string): Promise<any> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || this.extensionPath;
    const command = new BruinDBTCommand("bruin", workspaceFolder);
    return command.getDbSummary(connectionName);
  }

  private parseDbSummary(summary: any, connectionName: string): Schema[] {
    const schemasArray = Array.isArray(summary) ? summary : summary?.schemas;

    if (!Array.isArray(schemasArray)) {
        throw new Error("Invalid summary format: not an array or object with a 'schemas' property.");
    }
    return schemasArray.map(item => ({
        name: item.name || item.schema_name,
        tables: (item.tables || []).map((table: any) => typeof table === 'string' ? table : table.name),
        connectionName: connectionName
    }));
  }

  // Method to add a new connection
  addConnection(connection: ConnectionDisplayData): void {
    this.connections.push(connection);
    this._onDidChangeTreeData.fire();
  }

  // Method to remove a connection
  removeConnection(connectionName: string): void {
    this.connections = this.connections.filter(conn => conn.name !== connectionName);
    this._onDidChangeTreeData.fire();
  }

  // Method to update connection status
  updateConnectionStatus(connectionName: string, status: 'connected' | 'disconnected' | 'error'): void {
    const connection = this.connections.find(conn => conn.name === connectionName);
    if (connection) {
      connection.status = status;
      this._onDidChangeTreeData.fire();
    }
  }
} 