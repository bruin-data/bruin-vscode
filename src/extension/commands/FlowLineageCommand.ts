import { Uri } from "vscode";
import { BruinLineageInternalParse } from "../../bruin/bruinFlowLineage";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const flowLineageCommand = async (lastRenderedDocumentUri:  Uri | undefined ) => {
   if (!lastRenderedDocumentUri) {
    return;
  }
  const flowLineage = new BruinLineageInternalParse(
    getBruinExecutablePath(),
    ""
  );
  await flowLineage.parseAssetLineage(lastRenderedDocumentUri.fsPath);
  };
  