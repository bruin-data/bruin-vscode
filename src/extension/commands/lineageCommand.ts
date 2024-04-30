import { Uri } from "vscode";
import { BruinLineage, bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";

export const lineageCommand = async (lastRenderedDocumentUri:  Uri | undefined, flags: string[] = ['-o', 'json']) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const lineage = new BruinLineage(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!!
  );
  await lineage.diplayLineage(lastRenderedDocumentUri.fsPath, {flags: flags});
  };
  