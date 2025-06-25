import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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

interface ConnectionsData {
  connections: ConnectionDisplayData[];
}

class ConnectionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly connection?: ConnectionDisplayData,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    
    // Set context value for menu items
    this.contextValue = connection ? 'connection' : 'connections';
    
    // Set icon based on connection status
    if (connection) {
      switch (connection.status) {
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

  // Load connections using BruinConnections.getConnectionsForActivityBar() method
  private async loadConnections(): Promise<void> {
    try {
      console.log('ActivityBarConnectionsProvider: Loading connections...');
      // Get connections from Bruin CLI
      const connections = await this.bruinConnections.getConnectionsForActivityBar();
      console.log('ActivityBarConnectionsProvider: Received connections:', connections);
      
      if (!connections || connections.length === 0) {
        console.log('ActivityBarConnectionsProvider: No connections found, adding test data');
        // Add test data for demonstration
        
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
          const connectionItem = new ConnectionItem(
            `${connection.type}`,
            vscode.TreeItemCollapsibleState.None,
            connection
          );
          
          // Add tooltip with connection details
          connectionItem.tooltip = `${connection.type} - ${connection.status}\nEnvironment: ${connection.environment}`;
          
          return connectionItem;
        });
    }

    return [];
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