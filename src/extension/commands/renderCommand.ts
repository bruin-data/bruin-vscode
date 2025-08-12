import * as vscode from "vscode";
import { BruinPanel } from "../../panels/BruinPanel";
import { BruinRender } from "../../bruin";
import { prepareFlags } from "../../utilities/helperUtils";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const renderCommand = async (extensionUri: vscode.Uri) => {
  // Always render the panel, even if no active editor
  BruinPanel.render(extensionUri);

  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const bruinSqlRenderer = new BruinRender(
      getBruinExecutablePath(),
      vscode.workspace.workspaceFolders?.[0].uri.fsPath!!
    );

    const filePath = activeEditor.document.fileName;

    await bruinSqlRenderer.render(filePath);
  } else {
    // When no active editor, show a message in the panel that no file is open
    BruinPanel.postMessage("render-message", {
      status: "no-file",
      message: "Create a Bruin asset file or a bruin pipeline from a template"
    });
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
      getBruinExecutablePath(),
      vscode.workspace.workspaceFolders?.[0].uri.fsPath!!
    );

    await bruinSqlRenderer.render(filePath, {
      flags: prepareFlags(flags, ['--downstream', '--push-metadata']),
    });
  }
};
