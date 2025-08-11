import * as vscode from "vscode";
import { BruinTableDiff } from "../bruin/bruinTableDiff";
import { TableDiffProvider, TableDiffItem } from "../providers/TableDiffProvider";
import { TableDiffPanel } from "../panels/TableDiffPanel";

export class TableDiffService {
  private static instance: TableDiffService;
  private provider: TableDiffProvider;

  private constructor() {
    this.provider = TableDiffProvider.getInstance();
  }

  public static getInstance(): TableDiffService {
    if (!TableDiffService.instance) {
      TableDiffService.instance = new TableDiffService();
    }
    return TableDiffService.instance;
  }

  /**
   * Select a table for comparison - delegates to the provider
   */
  public selectTable(table: Omit<TableDiffItem, 'id'>): boolean {
    return this.provider.addTable(table);
  }

  /**
   * Get selected tables from the provider
   */
  public getSelectedTables(): TableDiffItem[] {
    return this.provider.getSelectedTables();
  }

  /**
   * Check if ready for comparison
   */
  public isReadyForComparison(): boolean {
    return this.provider.isReadyForComparison();
  }

  /**
   * Execute comparison between selected tables
   */
  public async executeDiff(): Promise<void> {
    const comparisonTables = this.provider.getComparisonTables();
    if (!comparisonTables) {
      vscode.window.showWarningMessage("Please select exactly 2 tables for comparison.");
      return;
    }

    const { source, target } = comparisonTables;

    try {
      // Show progress indicator
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Comparing Tables",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: `Comparing ${source.schema}.${source.name} with ${target.schema}.${target.name}` });

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
          throw new Error("Workspace folder not found");
        }

        // Create BruinTableDiff instance
        const tableDiff = new BruinTableDiff("bruin", workspaceFolder);

        // Format table references as schema.table
        const sourceTableRef = `${source.schema}.${source.name}`;
        const targetTableRef = `${target.schema}.${target.name}`;

        // Use source connection for the command
        const result = await tableDiff.compareTables(
          source.connectionName,
          sourceTableRef,
          targetTableRef,
          source.environment
        );

        // Show results in the TableDiff panel
        this.showDiffResults(source, target, result);
        
        // Focus the TableDiff panel to show results
        await TableDiffPanel.focusSafely();
      });

    } catch (error) {
      vscode.window.showErrorMessage(`Table comparison failed: ${error}`);
    }
  }

  /**
   * Show diff results in the TableDiff panel
   */
  private showDiffResults(sourceTable: TableDiffItem, targetTable: TableDiffItem, result: string): void {
    const sourceInfo = `${sourceTable.connectionName}.${sourceTable.schema}.${sourceTable.name}`;
    const targetInfo = `${targetTable.connectionName}.${targetTable.schema}.${targetTable.name}`;
    
    TableDiffPanel.showResults(sourceInfo, targetInfo, result);
  }

  /**
   * Remove a table from diff selection
   */
  public removeTable(tableId: string): void {
    this.provider.removeTable(tableId);
  }

  /**
   * Clear all tables from diff selection
   */
  public clearAll(): void {
    this.provider.clearAll();
  }
}