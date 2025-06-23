import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Define interfaces for the JSON structure for type safety
interface Column {
  [name: string]: string;
}

interface Table {
  columns: Column;
}

interface Schema {
  tables: { [name: string]: Table };
}

interface Database {
  schemas: { [name: string]: Schema };
}

interface DatabaseStructure {
  databases: { [name: string]: Database };
}

class Dependency extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly children?: Dependency[],
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }
}

export class ActivityBarDatabaseProvider implements vscode.TreeDataProvider<Dependency> {
  private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

  private data: Dependency[] = [];

  constructor(private extensionPath: string) {
    this.loadData();
  }

  private loadData(): void {
    const jsonPath = path.join(this.extensionPath, 'out', 'bruin', 'databaseSchema.json');
    try {
      if (fs.existsSync(jsonPath)) {
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const databaseData: DatabaseStructure = JSON.parse(jsonData);
        this.data = this.parseDatabaseStructure(databaseData);
      } else {
        // Fallback for development environment
        const devJsonPath = path.join(this.extensionPath, 'src', 'bruin', 'databaseSchema.json');
        if (fs.existsSync(devJsonPath)) {
          const jsonData = fs.readFileSync(devJsonPath, 'utf8');
          const databaseData: DatabaseStructure = JSON.parse(jsonData);
          this.data = this.parseDatabaseStructure(databaseData);
        } else {
          vscode.window.showErrorMessage(`Database schema file not found at ${jsonPath} or ${devJsonPath}`);
          this.data = [];
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error loading or parsing database schema: ${error}`);
      this.data = [];
    }
  }
  
  refresh(): void {
    this.loadData();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Dependency): Thenable<Dependency[]> {
    if (element) {
      return Promise.resolve(element.children || []);
    }
    return Promise.resolve(this.data);
  }
  
  private parseDatabaseStructure(dbStructure: DatabaseStructure): Dependency[] {
    const { databases } = dbStructure;
    if (!databases) { return []; }
    return Object.entries(databases).map(([dbName, dbDetails]) => {
      const schemas = dbDetails.schemas;
      const schemaItems = Object.entries(schemas).map(([schemaName, schemaDetails]) => {
        const tables = schemaDetails.tables;
        const tableItems = Object.entries(tables).map(([tableName, tableDetails]) => {
          const columns = tableDetails.columns;
          const columnItems = Object.entries(columns).map(([columnName, columnType]) => {
            return new Dependency(`${columnName}: ${columnType}`, vscode.TreeItemCollapsibleState.None);
          });
          const command = {
            command: 'bruin.showTableDetails',
            title: 'Show Table Details',
            arguments: [tableName],
          };
          const tableItem = new Dependency(tableName, vscode.TreeItemCollapsibleState.Collapsed, columnItems, command);
          tableItem.iconPath = new vscode.ThemeIcon('database');
          return tableItem;
        });
        return new Dependency(schemaName, vscode.TreeItemCollapsibleState.Collapsed, tableItems);
      });
      return new Dependency(dbName, vscode.TreeItemCollapsibleState.Collapsed, schemaItems);
    });
  }
}
