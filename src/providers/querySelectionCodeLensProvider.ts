import * as vscode from "vscode";

export class QuerySelectionCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Listen for selection changes to trigger CodeLens updates
    this.disposables.push(
      vscode.window.onDidChangeTextEditorSelection(() => {
        this._onDidChangeCodeLenses.fire();
      })
    );

    // Listen for active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
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

    // Create CodeLens at the start of the selection
    const codeLensRange = new vscode.Range(selection.start, selection.start);
    
    const previewCodeLens = new vscode.CodeLens(codeLensRange, {
      title: "Preview selected query",
      command: "bruin.previewSelectedQuery",
      arguments: [selectedText]
    });

    codeLenses.push(previewCodeLens);

    return codeLenses;
  }

  public dispose() {
    this.disposables.forEach(d => d.dispose());
  }
} 