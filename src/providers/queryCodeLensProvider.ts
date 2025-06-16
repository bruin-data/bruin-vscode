import * as vscode from 'vscode';

export class QueryCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const queryRegex = /SELECT[\s\S]*?FROM[\s\S]*?(?:WHERE|GROUP BY|ORDER BY|LIMIT|;|$)/gi;
        let match;

        while ((match = queryRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            const codeLens = new vscode.CodeLens(range, {
                title: "$(play) Run",
                command: "bruin.runQuery",
                arguments: [document.uri, range]
            });

            codeLenses.push(codeLens);
        }

        return codeLenses;
    }
} 