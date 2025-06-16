import * as vscode from "vscode";

export class QueryCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Pattern to match both main queries and subqueries, including simple queries without FROM
    const queryRegex =
      /(?:^|\s|\()\s*(SELECT\b[\s\S]*?(?=;|\s*[\r\n]|$))/gi;
    let match;
    while ((match = queryRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) {
        return codeLenses;
      }

      // Check if this SELECT is inside a subquery by looking at the text before it
      const textBeforeSelect = text.substring(0, match.index);
      const openParens = (textBeforeSelect.match(/\(/g) || []).length;
      const closeParens = (textBeforeSelect.match(/\)/g) || []).length;
      
      // Only show CodeLens if this is not a subquery (equal number of parentheses)
      if (openParens === closeParens) {
        const queryText = match[0].replace(/^(?:\s|\()*\s*SELECT/i, 'SELECT').trim();

        const selectPos = match.index + match[0].indexOf("SELECT");
        const startPos = document.positionAt(selectPos);
        const endPos = document.positionAt(selectPos + queryText.length);
        const range = new vscode.Range(startPos, endPos);

        const codeLens = new vscode.CodeLens(range, {
          title: "$(play) Run",
          command: "bruin.runQuery",
          arguments: [document.uri, range],
        });

        codeLenses.push(codeLens);
      }
    }

    return codeLenses;
  }
}
