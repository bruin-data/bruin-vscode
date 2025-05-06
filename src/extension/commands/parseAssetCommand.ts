import { Uri } from "vscode";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";
import { BruinInternalParse } from "../../bruin/bruinInternalParse";
import { BruinInternalPatch } from "../../bruin/bruinInternalPatch";

export const parseAssetCommand = async (lastRenderedDocumentUri: Uri | undefined) => {
  if (!lastRenderedDocumentUri) {
    return;
  }
  console.time("parseAssetCommand");
  console.warn("Getting default bruin exec", new Date().toISOString());
  const bruinExec = getBruinExecutablePath();
  console.warn("Got default bruin exec", new Date().toISOString());

  console.warn("BruinInternalParse before", new Date().toISOString());
  const parsed = new BruinInternalParse(bruinExec, "");
  await parsed.parseAsset(lastRenderedDocumentUri.fsPath);
  console.warn("BruinInternalParse after", new Date().toISOString());
  console.timeEnd("parseAssetCommand");
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
