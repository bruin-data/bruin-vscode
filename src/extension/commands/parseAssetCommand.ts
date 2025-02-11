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
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  await parsed.parseAsset(lastRenderedDocumentUri.fsPath);
};

export const patchAssetCommand = async (body: object, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const patched = new BruinInternalPatch(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  await patched.patchAsset(body, lastRenderedDocumentUri.fsPath);
};

export const checkAssetValidityCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const parsedAsset = new BruinInternalParse(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath)!! as string
  );
  return await parsedAsset.checkAssetValidity(lastRenderedDocumentUri.fsPath);
};