import { Uri } from "vscode";
import { BruinRender, BruinRenderUnmaterliazed, bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinQueryOutput } from "../../bruin/queryCommand";


export const getQueryOutput = async (environment: string, limit: string, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const output = new BruinQueryOutput(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  const queryResult = await output.getOutput(environment, lastRenderedDocumentUri.fsPath, limit);
  return queryResult;
};

