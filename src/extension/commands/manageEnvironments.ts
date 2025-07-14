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

/**
 * Update an existing environment name
 */
export const updateEnvironment = async (
  currentName: string,
  newName: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Updating environment:", currentName, "to", newName);
  
  const bruinEnvironmentManager = new BruinEnvironments(
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  
  await bruinEnvironmentManager.update(currentName, newName);
}; 