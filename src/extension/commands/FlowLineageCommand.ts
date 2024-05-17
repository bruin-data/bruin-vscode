import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinLineageInternalParse } from "../../bruin/bruinFlowLineage";

export const flowLineageCommand = async (lastRenderedDocumentUri:  Uri | undefined ) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const flowLineage = new BruinLineageInternalParse(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!!
  );
  console.log("flowLineageCommand", lastRenderedDocumentUri.fsPath);
  await flowLineage.parseAssetLineage(lastRenderedDocumentUri.fsPath);
  };
  