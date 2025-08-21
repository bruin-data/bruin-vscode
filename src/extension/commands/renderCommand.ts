import * as vscode from "vscode";
import { BruinPanel } from "../../panels/BruinPanel";
import { BruinRender } from "../../bruin";
import { buildRenderFlags } from "../../utilities/helperUtils";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const renderCommand = async (extensionUri: vscode.Uri) => {
  // Always render the panel, even if no active editor
  BruinPanel.render(extensionUri);

  const activeEditor = vscode.window.activeTextEditor;
  
  // Always render the panel
  BruinPanel.render(extensionUri);
  
  if (activeEditor) {
    // Normal file rendering when there's an active editor
    const bruinSqlRenderer = new BruinRender(
      getBruinExecutablePath(),
      vscode.workspace.workspaceFolders?.[0].uri.fsPath!!
    );

    const filePath = activeEditor.document.fileName;
    await bruinSqlRenderer.render(filePath);
  } else {
    // Settings-only mode when no active editor
    BruinPanel.postMessage("settings-only-mode", {
      status: "success",
      message: "Showing settings only"
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
      flags: buildRenderFlags(flags),
    });
  }
};
