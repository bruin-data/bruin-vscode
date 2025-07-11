import * as vscode from "vscode";

export class QueryQuickActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Only provide actions for SQL files
    if (!["sql", "sql-bigquery", "snowflake-sql"].includes(document.languageId)) {
      return actions;
    }

    // Check if there's selected text
    if (range.isEmpty) {
      return actions;
    }

    const selectedText = document.getText(range).trim();
    if (!selectedText) {
      return actions;
    }

    // Check if selected text looks like SQL
    const sqlKeywords = [
      "SELECT", "INSERT", "UPDATE", "DELETE", "WITH", "CREATE", "DROP", 
      "ALTER", "TRUNCATE", "MERGE", "UPSERT", "REPLACE", "CALL", "EXEC"
    ];
    
    const firstWord = selectedText.split(/\s+/)[0]?.toUpperCase();
    if (!sqlKeywords.includes(firstWord || '')) {
      return actions;
    }

    // Create the preview query action
    const previewAction = new vscode.CodeAction(
      "Preview Query",
      vscode.CodeActionKind.QuickFix
    );
    
    previewAction.command = {
      command: "bruin.previewSelectedQuery",
      title: "Preview Query",
      arguments: []
    };

    previewAction.isPreferred = true;
    actions.push(previewAction);

    return actions;
  }
} 