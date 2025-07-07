import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { BruinEnvironmentManager } from "../../bruin/bruinEnvironments";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

/**
 * Create a new environment with a dummy connection
 */
export const createEnvironment = async (
  environmentName: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Creating environment:", environmentName);
  
  const bruinEnvironmentManager = new BruinEnvironmentManager(
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  
  await bruinEnvironmentManager.createEnvironment(environmentName);
}; 