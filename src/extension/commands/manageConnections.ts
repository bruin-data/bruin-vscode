import { getDefaultBruinExecutablePath } from "../configuration";
import { Uri } from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import { BruinConnections, BruinCreateConnection, BruinDeleteConnection } from "../../bruin/bruinConnections";

export const getConnections = async (lastRenderedDocumentUri: Uri | undefined) => {
  const bruinConnections = new BruinConnections(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!
  );
  await bruinConnections.getConnections();
};


export const deleteConnection = async (env: string, connectionName: string, lastRenderedDocumentUri: Uri | undefined) => {
  console.log('Deleting connection:', { env, connectionName });
  const bruinConnections = new BruinDeleteConnection(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!
  );
  await bruinConnections.deleteConnection(env, connectionName);
};

export const createConnection = async (env: string, connectionName: string, connectionType:string, credentials: any,lastRenderedDocumentUri: Uri | undefined) => {
  console.log('Creating connection');
  const bruinConnections = new BruinCreateConnection(
    getDefaultBruinExecutablePath(),
    bruinWorkspaceDirectory(lastRenderedDocumentUri!.fsPath)!!
  );
  await bruinConnections.createConnection(env, connectionName, connectionType, credentials);
};