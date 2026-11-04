import * as vscode from "vscode";
import { findCustomCheckQueries } from "../utilities/customCheckQueries";

const SUPPORTED_LANGUAGES = ["sql", "python", "yaml"];
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
  private pendingUpdate: NodeJS.Timeout | undefined;

  constructor() {
    this.disposables.push(
      this.blockDecoration,
      this.inlineDecoration,
      vscode.window.onDidChangeVisibleTextEditors((editors) => editors.forEach((e) => this.decorate(e))),
      vscode.workspace.onDidChangeTextDocument((event) => this.scheduleUpdate(event.document))
    );
    vscode.window.visibleTextEditors.forEach((editor) => this.decorate(editor));
  }

  private scheduleUpdate(document: vscode.TextDocument) {
    clearTimeout(this.pendingUpdate);
    this.pendingUpdate = setTimeout(() => {
      vscode.window.visibleTextEditors
        .filter((editor) => editor.document === document)
        .forEach((editor) => this.decorate(editor));
    }, UPDATE_DELAY_MS);
  }

  private decorate(editor: vscode.TextEditor) {
    const { document } = editor;
    if (!SUPPORTED_LANGUAGES.includes(document.languageId)) {
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
    clearTimeout(this.pendingUpdate);
    this.disposables.forEach((d) => d.dispose());
  }
}
