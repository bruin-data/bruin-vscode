import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinInternalParse } from "../../bruin/bruinInternalParse";
import { BruinInternalPatch } from "../../bruin/bruinInternalPatch";

export const parseAssetCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const parsed = new BruinInternalParse(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!!
  );
  await parsed.parseAsset(lastRenderedDocumentUri.fsPath);
};

export const patchAssetCommand = async (body: object, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const patched = new BruinInternalPatch(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!!
  );
  await patched.patchAsset(body, lastRenderedDocumentUri.fsPath);
};
