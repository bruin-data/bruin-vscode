import { getDefaultBruinExecutablePath } from "../configuration";
import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { BruinConnections } from "../../bruin/bruinConnections";

export const getConnections = async (lastRenderedDocumentUri: Uri | undefined) => {
  const bruinConnections = new BruinConnections(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!
  );
  await bruinConnections.getConnections();
};
