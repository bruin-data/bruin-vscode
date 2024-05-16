import { Uri } from "vscode";
import { BruinLineage, bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinInternalParse } from "../../bruin/bruinInternalParse";

export const parseAssetCommand = async (lastRenderedDocumentUri:  Uri | undefined ) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const parsed = new BruinInternalParse(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!!
  );
  await parsed.parseAsset(lastRenderedDocumentUri.fsPath);
  };
  