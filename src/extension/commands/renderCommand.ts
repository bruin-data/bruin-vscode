import * as vscode from "vscode";
import { BruinPanel } from "../../panels/BruinPanel";
import { BruinRender } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { prepareFlags } from "../../utilities/helperUtils";

export const renderCommand = async (extensionUri: vscode.Uri) => {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    BruinPanel.render(extensionUri);

    const bruinSqlRenderer = new BruinRender(
      getDefaultBruinExecutablePath(),
      vscode.workspace.workspaceFolders?.[0].uri.fsPath!!
    );

    const filePath = activeEditor.document.fileName;

    await bruinSqlRenderer.render(filePath);
  }
};

export const renderCommandWithFlags = async (flags: string, lastRenderedDocumentUri?: string | undefined) => {

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor || flags !== "") {
    let filePath: string;

    if (!activeEditor) {
      filePath = lastRenderedDocumentUri as string;
      if(!filePath) {
        return;
      }
    } else {
      filePath = activeEditor?.document.fileName;
    }
    const bruinSqlRenderer = new BruinRender(
      getDefaultBruinExecutablePath(),
      vscode.workspace.workspaceFolders?.[0].uri.fsPath!!
    );

    await bruinSqlRenderer.render(filePath, {
      flags: prepareFlags(flags, ['--downstream', '--push-metadata']),
    });
  }
};
