import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  TextDocumentChangeEvent,
  window,
  workspace,
} from "vscode";
import * as vscode from "vscode";
import { isBruinBinaryAvailable } from "../bruin/bruinUtils";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import { setupFoldingOnOpen, subscribeToConfigurationChanges } from "./configuration";
import * as os from "os";
import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";


const validTypes =["table", "view"];

export function activate(context: ExtensionContext) {
  if (!isBruinBinaryAvailable()) {
    window.showErrorMessage("Bruin is not installed");
    return;
  }

  const config = workspace.getConfiguration("bruin");

  // Check the current platform
  const isWindows = os.platform() === "win32";
  const newPathSeparator = isWindows ? "\\" : "/";
  config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);

  // Setup folding on open
  setupFoldingOnOpen();

  subscribeToConfigurationChanges();

  const lineageWebviewProvider = new LineagePanel(context.extensionUri);

  const completionProvider = vscode.languages.registerCompletionItemProvider(['sql', 'python'], {
    provideCompletionItems(document, position, token, context) {
      const linePrefix = document.lineAt(position).text.substr(0, position.character).trim();

      if (linePrefix.endsWith('materialization:')) {
        const typeCompletion = new vscode.CompletionItem('type: ', vscode.CompletionItemKind.Field);
        typeCompletion.insertText = new vscode.SnippetString('type:  ');
        typeCompletion.documentation = new vscode.MarkdownString('Materialization type');
        return [typeCompletion];
      }

      if (linePrefix.includes('type:')) {
        const viewCompletion = new vscode.CompletionItem(' view', vscode.CompletionItemKind.Value);
        const tableCompletion = new vscode.CompletionItem(' table', vscode.CompletionItemKind.Value);
        return [viewCompletion, tableCompletion];
      }

      return undefined;
    }
  }, ':');

  // Register the folding range provider for Python and SQL files
  const foldingDisposable = languages.registerFoldingRangeProvider(["python", "sql"], {
    provideFoldingRanges: bruinFoldingRangeProvider,
  });

  context.subscriptions.push(
    commands.registerCommand("bruin.renderSQL", () => {
      renderCommand(context.extensionUri);
    }),
    completionProvider,
    foldingDisposable,
    window.registerWebviewViewProvider(LineagePanel.viewId, lineageWebviewProvider)
  );

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('bruin');

  // Register document change events to trigger validation
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent) => {
    validateTextDocument(event.document);
  }));

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(validateTextDocument));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((textDocument) => {
    diagnosticCollection.delete(textDocument.uri);
  }));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document) {
      validateTextDocument(editor.document);
    }
  }));
  context.subscriptions.push(diagnosticCollection);

  // Initial validation of all open documents
  vscode.workspace.textDocuments.forEach(validateTextDocument);

  function validateTextDocument(textDocument: vscode.TextDocument) {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = textDocument.getText();
    const regex = /materialization:\s*type:\s*(\w+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const type = match[1];
      if (!validTypes.includes(type)) {
        const startPos = textDocument.positionAt(match.index + match[0].indexOf(type));
        const endPos = textDocument.positionAt(match.index + match[0].indexOf(type) + type.length);
        const range = new vscode.Range(startPos, endPos);
        const diagnostic = new vscode.Diagnostic(range, `"${type}" is not a valid type. Valid types are: ${validTypes.join(', ')}.`, vscode.DiagnosticSeverity.Error);
        diagnostics.push(diagnostic);
      }
    }

    diagnosticCollection.set(textDocument.uri, diagnostics);
  }

  console.debug("Bruin activated successfully");
}
