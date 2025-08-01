import * as vscode from "vscode";

export class QuerySelectionCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | undefined;

  constructor() {
    // Listen for selection changes to trigger CodeLens updates with debouncing
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(() => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
          this._onDidChangeCodeLenses.fire();
        }, 100);
      })
    );

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
        this._onDidChangeCodeLenses.fire();
      })
    );
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];

    // Only provide CodeLenses for SQL files
    if (!["sql", "sql-bigquery", "snowflake-sql"].includes(document.languageId)) {
      return codeLenses;
    }

    // Check if there's an active editor and selection
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) {
      return codeLenses;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      return codeLenses;
    }

    const selectedText = document.getText(selection).trim();
    if (!selectedText) {
      return codeLenses;
    }

    // Find all Bruin blocks in the document
    const text = document.getText();
    const bruinBlockRegex = /\/\*\s*@bruin[\s\S]*?@bruin\s*\*\//g;
    let blockMatch;
    const bruinBlocks: vscode.Range[] = [];
    while ((blockMatch = bruinBlockRegex.exec(text)) !== null) {
      const startPos = document.positionAt(blockMatch.index);
      const endPos = document.positionAt(blockMatch.index + blockMatch[0].length);
      bruinBlocks.push(new vscode.Range(startPos, endPos));
    }

    // Helper to check if a position is inside any Bruin block
    const isInsideBruinBlock = (pos: vscode.Position) => {
      return bruinBlocks.some(block => block.contains(pos));
    };

    // Only show CodeLens if selection start is outside any Bruin block
    if (isInsideBruinBlock(selection.start)) {
      return codeLenses;
    }

    // Create CodeLens at the start of the selection
    const codeLensRange = new vscode.Range(selection.start, selection.start);
    const previewCodeLens = new vscode.CodeLens(codeLensRange, {
      title: "Preview selected query",
      command: "bruin.previewSelectedQuery",
      arguments: [] 
    });

    codeLenses.push(previewCodeLens);

    return codeLenses;
  }

  public dispose() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.disposables.forEach(d => d.dispose());
  }
} 