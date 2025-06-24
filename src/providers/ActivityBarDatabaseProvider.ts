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
    public readonly command?: vscode.Command,
    public readonly dbName?: string,
    public readonly schemaName?: string,
    public readonly tableName?: string
  ) {
    super(label, collapsibleState);
  }
}

export class ActivityBarDatabaseProvider implements vscode.TreeDataProvider<Dependency> {
  private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | null | void> = new vscode.EventEmitter<Dependency | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | null | void> = this._onDidChangeTreeData.event;

  private databaseNames: string[] = [];
  private cachedData: { [key: string]: any } = {};
  private loadedDatabases: Set<string> = new Set();
  private bruinTerminal: vscode.Terminal | undefined;

  constructor(private extensionPath: string) {
    this.loadDatabaseNames();
  }

  private loadDatabaseNames(): void {
    const jsonPath = path.join(this.extensionPath, 'out', 'bruin', 'databaseSchema.json');
    try {
      if (fs.existsSync(jsonPath)) {
        const jsonData = fs.readFileSync(jsonPath, 'utf8');
        const databaseData: DatabaseStructure = JSON.parse(jsonData);
        this.databaseNames = Object.keys(databaseData.databases || {});
      } else {
        // Fallback for development environment
        const devJsonPath = path.join(this.extensionPath, 'src', 'bruin', 'databaseSchema.json');
        if (fs.existsSync(devJsonPath)) {
          const jsonData = fs.readFileSync(devJsonPath, 'utf8');
          const databaseData: DatabaseStructure = JSON.parse(jsonData);
          this.databaseNames = Object.keys(databaseData.databases || {});
        } else {
          vscode.window.showErrorMessage(`Database schema file not found at ${jsonPath} or ${devJsonPath}`);
          this.databaseNames = [];
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error loading database schema: ${error}`);
      this.databaseNames = [];
    }
  }

  private loadDatabaseData(dbName: string): Database | null {
    if (this.cachedData[dbName]) {
      return this.cachedData[dbName];
    }

    if (!this.loadedDatabases.has(dbName)) {
      this.loadedDatabases.add(dbName);
      
      // Database yüklendiğinde bruin terminale mesaj gönder
      // Mevcut bruin terminali kontrol et, yoksa yeni oluştur
      if (!this.bruinTerminal || this.bruinTerminal.exitStatus) {
        this.bruinTerminal = vscode.window.createTerminal('Bruin Database');
      }
      this.bruinTerminal.sendText(`echo "Database ${dbName} loaded successfully"`);
      this.bruinTerminal.show();
      
      this._onDidChangeTreeData.fire();
    }

    const jsonPath = path.join(this.extensionPath, 'out', 'bruin', 'databaseSchema.json');
    try {
      let jsonData: string;
      if (fs.existsSync(jsonPath)) {
        jsonData = fs.readFileSync(jsonPath, 'utf8');
      } else {
        const devJsonPath = path.join(this.extensionPath, 'src', 'bruin', 'databaseSchema.json');
        if (fs.existsSync(devJsonPath)) {
          jsonData = fs.readFileSync(devJsonPath, 'utf8');
        } else {
          return null;
        }
      }
      
      const databaseData: DatabaseStructure = JSON.parse(jsonData);
      const dbData = databaseData.databases[dbName];
      if (dbData) {
        this.cachedData[dbName] = dbData;
        return dbData;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Error loading data for database ${dbName}: ${error}`);
    }
    return null;
  }

  refresh(): void {
    this.cachedData = {};
    this.loadedDatabases.clear();
    this.loadDatabaseNames();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Dependency): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Dependency): Thenable<Dependency[]> {
    if (!element) {
      // Root level - return database names without command but with icon
      return Promise.resolve(
        this.databaseNames.map(dbName => {
          const dbItem = new Dependency(dbName, vscode.TreeItemCollapsibleState.Collapsed, undefined, undefined, dbName);
          dbItem.iconPath = new vscode.ThemeIcon('database');
          return dbItem;
        })
      );
    }

    if (element.dbName && !element.schemaName) {
      // Database level - load database and return schemas
      this.loadDatabaseData(element.dbName);
      const dbData = this.loadDatabaseData(element.dbName);
      if (dbData && dbData.schemas) {
        const schemaItems = Object.keys(dbData.schemas).map(schemaName => {
          const schemaItem = new Dependency(schemaName, vscode.TreeItemCollapsibleState.Collapsed, undefined, undefined, element.dbName, schemaName);
          schemaItem.iconPath = new vscode.ThemeIcon('folder');
          return schemaItem;
        });
        return Promise.resolve(schemaItems);
      }
    }

    if (element.dbName && element.schemaName && !element.tableName) {
      // Schema level - return tables
      const dbData = this.loadDatabaseData(element.dbName);
      if (dbData && dbData.schemas[element.schemaName]) {
        const tables = dbData.schemas[element.schemaName].tables;
        const tableItems = Object.keys(tables).map(tableName => {
          const command = {
            command: 'bruin.showTableDetails',
            title: 'Show Table Details',
            arguments: [tableName],
          };
          const tableItem = new Dependency(tableName, vscode.TreeItemCollapsibleState.Collapsed, undefined, command, element.dbName, element.schemaName, tableName);
          tableItem.iconPath = new vscode.ThemeIcon('table');
          return tableItem;
        });
        return Promise.resolve(tableItems);
      }
    }

    if (element.dbName && element.schemaName && element.tableName) {
      // Table level - return columns
      const dbData = this.loadDatabaseData(element.dbName);
      if (dbData && dbData.schemas[element.schemaName] && dbData.schemas[element.schemaName].tables[element.tableName]) {
        const columns = dbData.schemas[element.schemaName].tables[element.tableName].columns;
        const columnItems = Object.entries(columns).map(([columnName, columnType]) => {
          const columnItem = new Dependency(`${columnName}: ${columnType}`, vscode.TreeItemCollapsibleState.None);
          columnItem.iconPath = new vscode.ThemeIcon('symbol-field');
          return columnItem;
        });
        return Promise.resolve(columnItems);
      }
    }

    return Promise.resolve([]);
  }
}
