import * as vscode from "vscode";

export interface TableDiffItem {
  id: string;
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

  private constructor() {}

  public static getInstance(): TableDiffProvider {
    if (!TableDiffProvider.instance) {
      TableDiffProvider.instance = new TableDiffProvider();
    }
    return TableDiffProvider.instance;
  }

  getTreeItem(element: DiffTableItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DiffTableItem): Promise<DiffTableItem[]> {
    if (!element) {
      // Root level - return selected tables
      if (this.selectedTables.length === 0) {
        return [
          new DiffTableItem(
            "No tables selected for diff",
            vscode.TreeItemCollapsibleState.None,
            {} as any,
            "empty_diff"
          )
        ];
      }
      
      return this.selectedTables.map((table, index) => {
        const contextValue = this.selectedTables.length === 2 && index === 0 ? "diff_source_table" : 
                            this.selectedTables.length === 2 && index === 1 ? "diff_target_table" :
                            "diff_table";
        
        return new DiffTableItem(
          table.name,
          vscode.TreeItemCollapsibleState.None,
          table,
          contextValue
        );
      });
    }
    return [];
  }

  /**
   * Add a table to the diff selection (max 2 tables)
   */
  public addTable(table: Omit<TableDiffItem, 'id'>): boolean {
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
  public removeTable(tableId: string): void {
    const index = this.selectedTables.findIndex(t => t.id === tableId);
    if (index !== -1) {
      const removedTable = this.selectedTables.splice(index, 1)[0];
      this._onDidChangeTreeData.fire();
      vscode.window.showInformationMessage(
        `Removed ${removedTable.schema}.${removedTable.name} from diff selection.`
      );
    }
  }

  /**
   * Clear all selected tables
   */
  public clearAll(): void {
    if (this.selectedTables.length === 0) {
      vscode.window.showInformationMessage("No tables selected for diff.");
      return;
    }

    this.selectedTables = [];
    this._onDidChangeTreeData.fire();
    vscode.window.showInformationMessage("Cleared all tables from diff selection.");
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