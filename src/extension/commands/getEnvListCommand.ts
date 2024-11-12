import { getDefaultBruinExecutablePath } from "../configuration";
import { BruinEnvList } from "../../bruin/bruinSelectEnv";
import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";

export const getEnvListCommand = async (lastRenderedDocumentUri:  Uri | undefined ) => {

  const getList = new BruinEnvList(
    getDefaultBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!! as string
  );
  await getList.getEnvironmentsList();
  };
  