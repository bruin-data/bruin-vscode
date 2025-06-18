import * as vscode from "vscode";

export class QueryCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // 1. First identify all Bruin metadata blocks and their positions
    const bruinBlocks: vscode.Range[] = [];
    const bruinBlockRegex = /\/\*\s*@bruin[\s\S]*?@bruin\s*\*\//g;
    let blockMatch;
    while ((blockMatch = bruinBlockRegex.exec(text)) !== null) {
      const startPos = document.positionAt(blockMatch.index);
      const endPos = document.positionAt(blockMatch.index + blockMatch[0].length);
      bruinBlocks.push(new vscode.Range(startPos, endPos));
    }

    // 2. Create a mask of the text where Bruin blocks are replaced with spaces
    let maskedText = text;
    for (let i = bruinBlocks.length - 1; i >= 0; i--) {
      const block = bruinBlocks[i];
      const startOffset = document.offsetAt(block.start);
      const endOffset = document.offsetAt(block.end);
      maskedText =
        maskedText.substring(0, startOffset) +
        " ".repeat(endOffset - startOffset) +
        maskedText.substring(endOffset);
    }

    // 3. Search for SQL queries in the masked text (outside Bruin blocks)
    const queryRegex = /(?:^|\s|;)\s*((?:SELECT|select)\b[\s\S]*?)(?=;|$|\s*\)\s*as\s+\w+|\/\*)/gi;

    let queryMatch;
    while ((queryMatch = queryRegex.exec(maskedText)) !== null) {
      if (token.isCancellationRequested) {
        return codeLenses;
      }

      const queryText = queryMatch[0].trim();
      const selectPos = queryMatch.index + queryMatch[0].indexOf(queryMatch[1]);

      // Skip if it's a subquery
      if (this.isSubquery(maskedText, selectPos)) {
        continue;
      }

      const startPos = document.positionAt(selectPos);
      const endPos = document.positionAt(selectPos + queryMatch[1].length);
      const queryRange = new vscode.Range(startPos, endPos);

      // Create CodeLens for queries found outside Bruin blocks
      codeLenses.push(
        new vscode.CodeLens(queryRange, {
          title: "$(play) Run",
          command: "bruin.runQuery",
          arguments: [document.uri, queryRange],
        })
      );
    }

    return codeLenses;
  }

  private isSubquery(text: string, selectPos: number): boolean {
    const textBefore = text.substring(0, selectPos);
    const openParens = (textBefore.match(/\(/g) || []).length;
    const closeParens = (textBefore.match(/\)/g) || []).length;
    return openParens > closeParens;
  }
}
