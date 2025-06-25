import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for the connection structure
interface Connection {
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  host?: string;
  port?: number;
  database?: string;
}

interface ConnectionsData {
  connections: Connection[];
}

class ConnectionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly connection?: Connection,
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

  private connections: Connection[] = [];

  constructor(private extensionPath: string) {
    this.loadConnections();
  }

  // Load connections from a configuration file or workspace settings
  private loadConnections(): void {
    try {
      // Try to load from workspace configuration first
      const workspaceConfig = vscode.workspace.getConfiguration('bruin');
      const configConnections = workspaceConfig.get<Connection[]>('connections', []);
      
      if (configConnections.length > 0) {
        this.connections = configConnections;
        return;
      }

      // No fallback connections - start with empty array
      this.connections = [];
    } catch (error) {
      console.error('Error loading connections:', error);
      this.connections = [];
    }
  }

  refresh(): void {
    this.loadConnections();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ConnectionItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ConnectionItem): Promise<ConnectionItem[]> {
    if (!element) {
      // Root level - return all connections
      return this.connections.map(connection => {
        const connectionItem = new ConnectionItem(
          connection.name,
          vscode.TreeItemCollapsibleState.None,
          connection,
          {
            command: 'bruin.showConnectionDetails',
            title: 'Show Connection Details',
            arguments: [connection]
          }
        );
        
        // Add tooltip with connection details
        connectionItem.tooltip = `${connection.type} - ${connection.status}\n${connection.host || connection.database || ''}`;
        
        return connectionItem;
      });
    }

    return [];
  }

  // Method to add a new connection
  addConnection(connection: Connection): void {
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