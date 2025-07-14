import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { BruinEnvironments } from "../../bruin/bruinEnvironments";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

/**
 * Create a new environment with a dummy connection
 */
export const createEnvironment = async (
  environmentName: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Creating environment:", environmentName);
  
  const bruinEnvironmentManager = new BruinEnvironments(
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  
  await bruinEnvironmentManager.create(environmentName);
};

/**
 * Delete an existing environment
 */
export const deleteEnvironment = async (
  environmentName: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Deleting environment:", environmentName);
  
  const bruinEnvironmentManager = new BruinEnvironments(
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  
  await bruinEnvironmentManager.delete(environmentName);
}; 