import { Uri } from "vscode";
import { BruinRender, BruinRenderUnmaterliazed, bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinQueryOutput } from "../../bruin/queryCommand";


export const getQueryOutput = async (connection: string, query: string, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const output = new BruinQueryOutput(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  const queryResult = await output.getOutput(connection, query);
  return queryResult;
};


export const getRenderedQuery = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return undefined;
  }

  const render = new BruinRenderUnmaterliazed(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );

  const result = await render.getRenderedQuery(lastRenderedDocumentUri.fsPath);
  return { query: result.query };
};
