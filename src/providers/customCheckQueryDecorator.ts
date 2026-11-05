import * as vscode from "vscode";
import { CUSTOM_CHECK_LANGUAGES, findCustomCheckQueries } from "../utilities/customCheckQueries";

const UPDATE_DELAY_MS = 150;

/**
 * Tints the SQL of custom check queries so it stands apart from the surrounding asset YAML,
 * the same way Markdown sets off fenced code blocks. The color is the themeable
 * `bruin.customCheckQueryBackground`.
 */
export class CustomCheckQueryDecorator implements vscode.Disposable {
  private readonly background = new vscode.ThemeColor("bruin.customCheckQueryBackground");
  private readonly blockDecoration = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: this.background,
  });
  private readonly inlineDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: this.background,
    borderRadius: "3px",
  });
  private readonly disposables: vscode.Disposable[] = [];
  private readonly pendingUpdates = new Map<vscode.TextDocument, NodeJS.Timeout>();

  constructor() {
    this.disposables.push(
      this.blockDecoration,
      this.inlineDecoration,
      vscode.window.onDidChangeVisibleTextEditors((editors) => editors.forEach((e) => this.decorate(e))),
      vscode.workspace.onDidChangeTextDocument((event) => this.scheduleUpdate(event.document)),
      // Changing a document's language mode reopens it, so this also covers mode switches.
      vscode.workspace.onDidOpenTextDocument((document) => this.decorateDocument(document))
    );
    vscode.window.visibleTextEditors.forEach((editor) => this.decorate(editor));
  }

  private scheduleUpdate(document: vscode.TextDocument) {
    if (!CUSTOM_CHECK_LANGUAGES.includes(document.languageId)) {
      return;
    }
    // One timer per document, so edits elsewhere can't cancel or postpone this refresh.
    clearTimeout(this.pendingUpdates.get(document));
    this.pendingUpdates.set(
      document,
      setTimeout(() => {
        this.pendingUpdates.delete(document);
        this.decorateDocument(document);
      }, UPDATE_DELAY_MS)
    );
  }

  private decorateDocument(document: vscode.TextDocument) {
    const uri = document.uri.toString();
    vscode.window.visibleTextEditors
      .filter((editor) => editor.document.uri.toString() === uri)
      .forEach((editor) => this.decorate(editor));
  }

  private decorate(editor: vscode.TextEditor) {
    const { document } = editor;
    if (!CUSTOM_CHECK_LANGUAGES.includes(document.languageId)) {
      editor.setDecorations(this.blockDecoration, []);
      editor.setDecorations(this.inlineDecoration, []);
      return;
    }

    const { blockLines, inlineSpans } = findCustomCheckQueries(document.getText(), document.languageId);
    editor.setDecorations(
      this.blockDecoration,
      blockLines.map((line) => new vscode.Range(line, 0, line, 0))
    );
    editor.setDecorations(
      this.inlineDecoration,
      inlineSpans.map(({ line, start, end }) => new vscode.Range(line, start, line, end))
    );
  }

  dispose() {
    this.pendingUpdates.forEach((timeout) => clearTimeout(timeout));
    this.disposables.forEach((d) => d.dispose());
  }
}
