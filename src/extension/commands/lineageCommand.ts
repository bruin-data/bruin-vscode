import { Uri } from "vscode";
import { BruinLineage, bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";

export const lineageCommand = async (lastRenderedDocumentUri:  Uri | undefined, flags: string[] = ['-o', 'json']) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const lineage = new BruinLineage(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  await lineage.displayLineage(lastRenderedDocumentUri.fsPath, {flags: flags});
  };
  