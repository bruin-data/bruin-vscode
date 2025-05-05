import { BruinEnvList } from "../../bruin/bruinSelectEnv";
import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const getEnvListCommand = async (lastRenderedDocumentUri:  Uri | undefined ) => {

  const getList = new BruinEnvList(
    getBruinExecutablePath(),
    await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!! as string
  );
  await getList.getEnvironmentsList();
  };
  