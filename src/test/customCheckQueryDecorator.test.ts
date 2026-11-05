import * as assert from "assert";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { CustomCheckQueryDecorator } from "../providers/customCheckQueryDecorator";

suite("Custom check query decorator", () => {
  teardown(() => sinon.restore());

  test("refreshes decorations when a document's language mode changes", () => {
    const document = {
      languageId: "plaintext",
      uri: vscode.Uri.file("/assets/orders.sql"),
      getText: () => ["/* @bruin", "custom_checks:", "  - query: SELECT 1", "@bruin */"].join("\n"),
    };
    const setDecorations = sinon.spy();
    sinon.stub(vscode.window, "visibleTextEditors").value([{ document, setDecorations }]);
    let onOpen: (document: unknown) => void = () => undefined;
    sinon.stub(vscode.workspace, "onDidOpenTextDocument").value((listener: typeof onOpen) => {
      onOpen = listener;
      return { dispose: () => undefined };
    });
    const decoratedRangeCounts = () => setDecorations.getCalls().map((call) => call.args[1].length);

    const decorator = new CustomCheckQueryDecorator();
    assert.deepStrictEqual(decoratedRangeCounts(), [0, 0]);

    setDecorations.resetHistory();
    document.languageId = "sql";
    onOpen(document);
    assert.deepStrictEqual(decoratedRangeCounts(), [0, 1]);

    setDecorations.resetHistory();
    document.languageId = "plaintext";
    onOpen(document);
    assert.deepStrictEqual(decoratedRangeCounts(), [0, 0]);

    decorator.dispose();
  });
});
