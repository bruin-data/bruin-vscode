import { Uri } from "vscode";
import * as vscode from "vscode";
import { bruinWorkspaceDirectory } from "../../bruin";
import {
  BruinConnections,
  BruinCreateConnection,
  BruinDeleteConnection,
  BruinGetAllBruinConnections,
  BruinTestConnection,
} from "../../bruin/bruinConnections";
import { BruinIngestrSources } from "../../bruin/bruinIngestrSources";
import { getBruinExecutablePath } from "../../providers/BruinExecutableService";

/**
 * Get working directory for Bruin commands with fallback to workspace root
 */
async function getWorkingDirectory(lastRenderedDocumentUri: Uri | undefined): Promise<string> {
  try {
    if (lastRenderedDocumentUri) {
      const workspaceDir = await bruinWorkspaceDirectory(lastRenderedDocumentUri.fsPath);
      if (workspaceDir) {
        return workspaceDir;
      }
    }
    
    // Fallback to the first workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return workspaceFolder.uri.fsPath;
    }
    
    throw new Error("No workspace found");
  } catch (error) {
    console.error("Error getting working directory:", error);
    throw new Error(`Failed to determine working directory: ${error}`);
  }
}

export const getConnections = async (lastRenderedDocumentUri: Uri | undefined) => {
  try {
    const workingDirectory = await getWorkingDirectory(lastRenderedDocumentUri);
    const bruinConnections = new BruinConnections(getBruinExecutablePath(), workingDirectory);
    await bruinConnections.getConnections();
  } catch (error) {
    console.error("Error getting connections:", error);
    throw error;
  }
};

export const getConnectionsListFromSchema = async (lastRenderedDocumentUri: Uri | undefined) => {
  try {
    const workingDirectory = await getWorkingDirectory(lastRenderedDocumentUri);
    const bruinConnections = new BruinGetAllBruinConnections(getBruinExecutablePath(), workingDirectory);
    await bruinConnections.getConnectionsListFromSchema();
  } catch (error) {
    console.error("Error getting connections list from schema:", error);
    throw error;
  }
};

export const deleteConnection = async (
  env: string,
  connectionName: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  try {
    console.log("Deleting connection:", { env, connectionName });
    const workingDirectory = await getWorkingDirectory(lastRenderedDocumentUri);
    const bruinConnections = new BruinDeleteConnection(getBruinExecutablePath(), workingDirectory);
    await bruinConnections.deleteConnection(env, connectionName);
  } catch (error) {
    console.error("Error deleting connection:", error);
    throw error;
  }
};

export const createConnection = async (
  env: string,
  connectionName: string,
  connectionType: string,
  credentials: any,
  lastRenderedDocumentUri: Uri | undefined
) => {
  try {
    console.log("Creating connection");
    const workingDirectory = await getWorkingDirectory(lastRenderedDocumentUri);
    const bruinConnections = new BruinCreateConnection(getBruinExecutablePath(), workingDirectory);
    await bruinConnections.createConnection(env, connectionName, connectionType, credentials);
  } catch (error) {
    console.error("Error creating connection:", error);
    throw error;
  }
};

export const testConnection = async ( 
  env: string,
  connectionName: string,
  connectionType: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  try {
    console.log("Testing connection");
    const workingDirectory = await getWorkingDirectory(lastRenderedDocumentUri);
    const bruinConnection = new BruinTestConnection(getBruinExecutablePath(), workingDirectory);
    await bruinConnection.testConnection(env, connectionName, connectionType);
  } catch (error) {
    console.error("Error testing connection:", error);
    throw error;
  }
};

export const getIngestrSourceTables = async (
  sourceType: string,
  lastRenderedDocumentUri: Uri | undefined
) => {
  try {
    console.log("Getting ingestr source tables for type:", sourceType);
    const workingDirectory = await getWorkingDirectory(lastRenderedDocumentUri);
    const bruinIngestrSources = new BruinIngestrSources(getBruinExecutablePath(), workingDirectory);
    await bruinIngestrSources.getIngestrSources(sourceType);
  } catch (error) {
    console.error("Error getting ingestr source tables:", error);
    throw error;
  }
};