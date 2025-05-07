import { Uri } from "vscode";
import { BruinLineage, bruinWorkspaceDirectory } from "../../bruin";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const lineageCommand = async (lastRenderedDocumentUri:  Uri | undefined, flags: string[] = ['-o', 'json']) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const lineage = new BruinLineage(
    getBruinExecutablePath(),
    "",
  );
  await lineage.displayLineage(lastRenderedDocumentUri.fsPath, {flags: flags});
  };
  