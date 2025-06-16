import * as vscode from "vscode";

export class QueryCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    const queryRegex =
      /(?:^|\s|\()\s*(SELECT\b[\s\S]*?(?=;|\s*[\r\n]|$))/gi;
    let match;
    while ((match = queryRegex.exec(text)) !== null) {
      if (token.isCancellationRequested) {
        return codeLenses;
      }
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

    return codeLenses;
  }
}
