import { getDefaultBruinExecutablePath } from "../configuration";
import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import {
  BruinConnections,
  BruinCreateConnection,
  BruinDeleteConnection,
  BruinGetAllBruinConnections,
} from "../../bruin/bruinConnections";

export const getConnections = async (lastRenderedDocumentUri: Uri | undefined) => {
  const bruinConnections = new BruinConnections(
    getDefaultBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnections.getConnections();
};

export const getConnectionsListFromSchema = async (lastRenderedDocumentUri: Uri | undefined) => {
  const bruinConnections = new BruinGetAllBruinConnections(
    getDefaultBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnections.getConnectionsListFromSchema();
};

export const deleteConnection = async (
  env: string,
  connectionName: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Deleting connection:", { env, connectionName });
  const bruinConnections = new BruinDeleteConnection(
    getDefaultBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnections.deleteConnection(env, connectionName);
};

export const createConnection = async (
  env: string,
  connectionName: string,
  connectionType: string,
  credentials: any,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Creating connection");
  const bruinConnections = new BruinCreateConnection(
    getDefaultBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnections.createConnection(env, connectionName, connectionType, credentials);
};
