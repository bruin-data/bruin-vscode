import * as vscode from "vscode";

export interface TableDiffItem {
  id: string;
  name: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

interface StoredTableDiffItem {
  name: string;
  schema: string;
  connectionName: string;
  environment?: string;
}

class DiffTableItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemData: TableDiffItem,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);
    this.tooltip = `${itemData.connectionName}.${itemData.schema}.${itemData.name}`;
    this.description = `${itemData.connectionName}.${itemData.schema}`;
    this.iconPath = new vscode.ThemeIcon("table");
  }
}

export class TableDiffProvider implements vscode.TreeDataProvider<DiffTableItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DiffTableItem | undefined | null | void> =
    new vscode.EventEmitter<DiffTableItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DiffTableItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private selectedTables: TableDiffItem[] = [];
  private static instance: TableDiffProvider;
  private context?: vscode.ExtensionContext;
  private static readonly STORAGE_KEY = 'bruin.tableDiff.selections';

  private constructor() {}

  public static getInstance(context?: vscode.ExtensionContext): TableDiffProvider {
    if (!TableDiffProvider.instance) {
      TableDiffProvider.instance = new TableDiffProvider();
    }
    if (context && !TableDiffProvider.instance.context) {
      TableDiffProvider.instance.initialize(context);
    }
    return TableDiffProvider.instance;
  }

  private initialize(context: vscode.ExtensionContext): void {
    this.context = context;
    this.loadPersistedTables();
  }

  private loadPersistedTables(): void {
    if (!this.context) return;
    
    try {
      const stored = this.context.workspaceState.get<StoredTableDiffItem[]>(TableDiffProvider.STORAGE_KEY, []);
      this.selectedTables = stored.map(item => ({
        ...item,
        id: `${item.connectionName}.${item.schema}.${item.name}`
      }));
      
      if (this.selectedTables.length > 0) {
        console.log(`TableDiffProvider: Loaded ${this.selectedTables.length} persisted table selections`);
        this._onDidChangeTreeData.fire();
      }
    } catch (error) {
      console.error('TableDiffProvider: Error loading persisted tables:', error);
      this.selectedTables = [];
    }
  }

  private async persistTables(): Promise<void> {
    if (!this.context) return;
    
    try {
      const toStore: StoredTableDiffItem[] = this.selectedTables.map(({ id, ...item }) => item);
      await this.context.workspaceState.update(TableDiffProvider.STORAGE_KEY, toStore);
    } catch (error) {
      console.error('TableDiffProvider: Error persisting tables:', error);
    }
  }

  getTreeItem(element: DiffTableItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DiffTableItem): Promise<DiffTableItem[]> {
    if (!element) {
      // Root level - return selected tables or controls
      const items: DiffTableItem[] = [];
      
      if (this.selectedTables.length === 0) {
        items.push(
          new DiffTableItem(
            "No tables selected for diff",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "empty_diff"
          )
        );
        
        items.push(
          new DiffTableItem(
            "💡 Select tables from Databases or Favorites",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "instruction"
          )
        );
      } else {
        // Show selected tables with better labels
        this.selectedTables.forEach((table, index) => {
          const isSource = this.selectedTables.length === 2 && index === 0;
          const isTarget = this.selectedTables.length === 2 && index === 1;
          const label = isSource ? `📊 Source: ${table.name}` :
                      isTarget ? `📈 Target: ${table.name}` :
                      `📋 ${index + 1}. ${table.name}`;
          
          const contextValue = isSource ? "diff_source_table" :
                              isTarget ? "diff_target_table" :
                              "diff_table";
          
          const item = new DiffTableItem(
            label,
            vscode.TreeItemCollapsibleState.None,
            table,
            contextValue
          );
          
          // Add description with connection info
          item.description = `${table.connectionName}.${table.schema}`;
          item.tooltip = `${table.connectionName}.${table.schema}.${table.name}${table.environment ? ` (${table.environment})` : ''}`;
          
          items.push(item);
        });
        
        // Add compare button when ready
        if (this.selectedTables.length === 2) {
          items.push(
            new DiffTableItem(
              "🔄 Compare Tables",
              vscode.TreeItemCollapsibleState.None,
              {} as any,
              "compare_button"
            )
          );
        } else if (this.selectedTables.length === 1) {
          items.push(
            new DiffTableItem(
              "➕ Select one more table to compare",
              vscode.TreeItemCollapsibleState.None,
              {} as any,
              "instruction"
            )
          );
        }
      }
      
      return items;
    }
    return [];
  }

  /**
   * Add a table to the diff selection (max 2 tables)
   */
  public async addTable(table: Omit<TableDiffItem, 'id'>): Promise<boolean> {
    if (this.selectedTables.length >= 2) {
      vscode.window.showWarningMessage("Maximum 2 tables can be selected for diff. Remove a table first.");
      return false;
    }

    // Check if table is already selected
    const exists = this.selectedTables.some(t => 
      t.name === table.name && 
      t.schema === table.schema && 
      t.connectionName === table.connectionName
    );

    if (exists) {
      vscode.window.showInformationMessage("Table is already selected for diff.");
      return false;
    }

    const tableWithId: TableDiffItem = {
      ...table,
      id: `${table.connectionName}.${table.schema}.${table.name}`
    };

    this.selectedTables.push(tableWithId);
    await this.persistTables();
    this._onDidChangeTreeData.fire();

    const position = this.selectedTables.length === 1 ? "source" : "target";
    vscode.window.showInformationMessage(
      `Selected ${table.schema}.${table.name} as ${position} table for diff.`
    );

    return true;
  }

  /**
   * Remove a table from the diff selection
   */
  public async removeTable(tableId: string): Promise<void> {
    const index = this.selectedTables.findIndex(t => t.id === tableId);
    if (index !== -1) {
      const removedTable = this.selectedTables.splice(index, 1)[0];
      await this.persistTables();
      this._onDidChangeTreeData.fire();
      vscode.window.showInformationMessage(
        `Removed ${removedTable.schema}.${removedTable.name} from diff selection.`
      );
    }
  }

  /**
   * Clear all selected tables
   */
  public async clearAll(): Promise<void> {
    if (this.selectedTables.length === 0) {
      vscode.window.showInformationMessage("No tables selected for diff.");
      return;
    }

    this.selectedTables = [];
    await this.persistTables();
    this._onDidChangeTreeData.fire();
    vscode.window.showInformationMessage("Cleared all tables from diff selection.");
  }

  /**
   * Swap source and target tables
   */
  public async swapTables(): Promise<void> {
    if (this.selectedTables.length !== 2) {
      vscode.window.showWarningMessage("Need exactly 2 tables to swap positions.");
      return;
    }

    [this.selectedTables[0], this.selectedTables[1]] = [this.selectedTables[1], this.selectedTables[0]];
    await this.persistTables();
    this._onDidChangeTreeData.fire();
    vscode.window.showInformationMessage("Swapped source and target tables.");
  }

  /**
   * Get selected tables for comparison
   */
  public getSelectedTables(): TableDiffItem[] {
    return [...this.selectedTables];
  }

  /**
   * Check if ready for comparison (has exactly 2 tables)
   */
  public isReadyForComparison(): boolean {
    return this.selectedTables.length === 2;
  }

  /**
   * Get source and target tables for comparison
   */
  public getComparisonTables(): { source: TableDiffItem; target: TableDiffItem } | null {
    if (this.selectedTables.length !== 2) {
      return null;
    }
    return {
      source: this.selectedTables[0],
      target: this.selectedTables[1]
    };
  }

  /**
   * Refresh the tree view
   */
  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}