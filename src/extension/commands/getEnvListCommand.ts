import { BruinEnvList } from "../../bruin/bruinSelectEnv";
import * as vscode from "vscode";
import * as path from "path";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const getEnvListCommand = async (lastRenderedDocumentUri: vscode.Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }

  const foundBruinWorkspace = await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(lastRenderedDocumentUri)?.uri.fsPath;
  const fallbackDir = workspaceFolder ?? path.dirname(lastRenderedDocumentUri.fsPath);
  const workingDirectory = foundBruinWorkspace ?? fallbackDir;

  const getList = new BruinEnvList(getBruinExecutablePath(), workingDirectory as string);
  await getList.getEnvironmentsList();
};
  