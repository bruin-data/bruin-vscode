import { Uri } from "vscode";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";
import { BruinInternalParse } from "../../bruin/bruinInternalParse";
import { BruinInternalPatch } from "../../bruin/bruinInternalPatch";

export const parseAssetCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const bruinExec = getBruinExecutablePath();
  const parsed = new BruinInternalParse(
    bruinExec, ""
  );
  await parsed.parseAsset(lastRenderedDocumentUri.fsPath);
};

export const patchAssetCommand = async (body: object, lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const patched = new BruinInternalPatch(
    getBruinExecutablePath(),
     ""
  );
  await patched.patchAsset(body, lastRenderedDocumentUri.fsPath);
};

export const convertFileToAssetCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  const patched = new BruinInternalPatch(
    getBruinExecutablePath(),
     ""
  );
  await patched.convertFileToAsset(lastRenderedDocumentUri.fsPath);
};
