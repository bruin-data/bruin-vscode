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
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath!) as string
  );
  await flowLineage.parseAssetLineage(lastRenderedDocumentUri.fsPath);
  };
  