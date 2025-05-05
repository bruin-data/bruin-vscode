import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import {
  BruinConnections,
  BruinCreateConnection,
  BruinDeleteConnection,
  BruinGetAllBruinConnections,
  BruinTestConnection,
} from "../../bruin/bruinConnections";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

export const getConnections = async (lastRenderedDocumentUri: Uri | undefined) => {
  const bruinConnections = new BruinConnections(
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnections.getConnections();
};

export const getConnectionsListFromSchema = async (lastRenderedDocumentUri: Uri | undefined) => {
  const bruinConnections = new BruinGetAllBruinConnections(
    getBruinExecutablePath(),
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
    getBruinExecutablePath(),
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
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnections.createConnection(env, connectionName, connectionType, credentials);
};


 export const testConnection = async ( 
  env: string,
  connectionName: string,
  connectionType: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  console.log("Testing connection");
  const bruinConnection = new BruinTestConnection(
    getBruinExecutablePath(),
    (await bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!) as string
  );
  await bruinConnection.testConnection(env, connectionName, connectionType);
};

