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
  public async selectTable(table: Omit<TableDiffItem, 'id'>): Promise<boolean> {
    return await this.provider.addTable(table);
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
    console.log('TableDiffService: executeDiff called');
    
    const comparisonTables = this.provider.getComparisonTables();
    console.log('TableDiffService: comparisonTables:', comparisonTables);
    
    if (!comparisonTables) {
      console.log('TableDiffService: No comparison tables found');
      vscode.window.showWarningMessage("Please select exactly 2 tables for comparison.");
      return;
    }

    const { source, target } = comparisonTables;
    console.log('TableDiffService: Source table:', source);
    console.log('TableDiffService: Target table:', target);

    try {
      // Show progress indicator
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Comparing Tables",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: `Comparing ${source.schema}.${source.name} with ${target.schema}.${target.name}` });

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        console.log('TableDiffService: Workspace folder:', workspaceFolder);
        
        if (!workspaceFolder) {
          throw new Error("Workspace folder not found");
        }

        // Create BruinTableDiff instance
        const tableDiff = new BruinTableDiff("bruin", workspaceFolder);
        console.log('TableDiffService: BruinTableDiff instance created');

        // Format table references as schema.table
        const sourceTableRef = `${source.schema}.${source.name}`;
        const targetTableRef = `${target.schema}.${target.name}`;
        console.log('TableDiffService: Source table ref:', sourceTableRef);
        console.log('TableDiffService: Target table ref:', targetTableRef);

        // Use source connection for the command
        console.log('TableDiffService: About to call compareTables with:', {
          connectionName: source.connectionName,
          sourceTableRef,
          targetTableRef
        });

        const result = await tableDiff.compareTables(
          source.connectionName,
          sourceTableRef,
          targetTableRef        
        );

        console.log('TableDiffService: compareTables result received:', result);
        console.log('TableDiffService: Result type:', typeof result);
        console.log('TableDiffService: Result length:', result?.length);

        // Show results in the TableDiff panel
        console.log('TableDiffService: Calling showDiffResults');
        this.showDiffResults(source, target, result);
        
        // Focus the TableDiff panel to show results
        console.log('TableDiffService: About to focus TableDiff panel');
        await TableDiffPanel.focusSafely();
        console.log('TableDiffService: TableDiff panel focused');
      });

    } catch (error) {
      console.error('TableDiffService: Error in executeDiff:', error);
      vscode.window.showErrorMessage(`Table comparison failed: ${error}`);
    }
  }

  /**
   * Show diff results in the TableDiff panel
   */
  private showDiffResults(sourceTable: TableDiffItem, targetTable: TableDiffItem, result: string): void {
    console.log('TableDiffService: showDiffResults called with:', {
      sourceTable,
      targetTable,
      result: result?.substring(0, 200) + '...' // Log first 200 chars to avoid huge logs
    });
    
    const sourceInfo = `${sourceTable.connectionName}.${sourceTable.schema}.${sourceTable.name}`;
    const targetInfo = `${targetTable.connectionName}.${targetTable.schema}.${targetTable.name}`;
    
    console.log('TableDiffService: Formatted table info:', { sourceInfo, targetInfo });
    console.log('TableDiffService: Calling TableDiffPanel.showResults');
    
    TableDiffPanel.showResults(sourceInfo, targetInfo, result);
    
    console.log('TableDiffService: TableDiffPanel.showResults called');
  }

  /**
   * Remove a table from diff selection
   */
  public async removeTable(tableId: string): Promise<void> {
    await this.provider.removeTable(tableId);
  }

  /**
   * Clear all tables from diff selection
   */
  public async clearAll(): Promise<void> {
    await this.provider.clearAll();
  }
}