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
      return bruinBlocks.some((block) => block.contains(pos));
    };

    // Check if selection is inside a Bruin block
    const isInBruinBlock = isInsideBruinBlock(selection.start);

    // If selection is inside a Bruin block, check if it's a custom-checks query
    if (isInBruinBlock) {
      const customCheckCodeLens = this.getCustomCheckSelectionCodeLens(
        document,
        selection,
        bruinBlocks
      );
      if (customCheckCodeLens) {
        codeLenses.push(customCheckCodeLens);
      }
      return codeLenses;
    }

    // Create CodeLens at the start of the selection
    const codeLensRange = new vscode.Range(selection.start, selection.start);
    const previewCodeLens = new vscode.CodeLens(codeLensRange, {
      title: "Preview selected query",
      command: "bruin.previewSelectedQuery",
      arguments: [],
    });

    codeLenses.push(previewCodeLens);

    return codeLenses;
  }

  private getCustomCheckSelectionCodeLens(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    bruinBlocks: vscode.Range[]
  ): vscode.CodeLens | null {
    const containingBlock = bruinBlocks.find((block) => block.contains(selection.start));
    if (!containingBlock) {
      return null;
    }

    const blockText = document.getText(containingBlock);

    // Check if we're in a custom_checks section
    if (!blockText.includes("custom_checks:")) {
      return null;
    }

    // Get the selected text
    const selectedText = document.getText(selection).trim();
    if (!selectedText) {
      return null;
    }

    // find all "query:" occurrences and their content
    const blockStartOffset = document.offsetAt(containingBlock.start);
    const selectionStartOffset = document.offsetAt(selection.start);

    const queryRegex = /query:\s*\|-\s*\n([\s\S]*?)(?=\n\s*-\s+\w+:|$)/g;
    let queryMatch;

    while ((queryMatch = queryRegex.exec(blockText)) !== null) {
      const queryStartInBlock = queryMatch.index;
      const queryEndInBlock = queryMatch.index + queryMatch[0].length;

      console.log(
        `Query block detected between in-block offsets ${queryStartInBlock} → ${queryEndInBlock}`
      );

      const queryStartInDocument = blockStartOffset + queryStartInBlock;
      const queryEndInDocument = blockStartOffset + queryEndInBlock;

      if (
        selectionStartOffset >= queryStartInDocument &&
        selectionStartOffset < queryEndInDocument
      ) {
        return new vscode.CodeLens(new vscode.Range(selection.start, selection.start), {
          title: "Preview selected query",
          command: "bruin.previewSelectedQuery",
          arguments: [],
        });
      }
    }

    return null;
  }

  public dispose() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.disposables.forEach((d) => d.dispose());
  }
}
