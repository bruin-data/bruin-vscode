import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
export const isEditorActive = (): boolean => !!vscode.window.activeTextEditor;

export interface Environment {
  name: string;
}

export interface Input {
  selectedEnvironment: string;
  environments: Environment[];
}

// Function to transform the input object to an array of environment names
export function transformToEnvironmentsArray(input: string): string[] {
  const envResult = JSON.parse(input);
  if (!envResult || !envResult.environments) {
    return [];
  }

  return envResult.environments.map((env: { name: string }) => env.name);
}

export const isFileExtensionSQL = (fileName: string): boolean => {
  fileName = fileName.toLowerCase();

  if (!fileName) {
    return false;
  }

  // Ensure fileName is not undefined
  let fileExtension = fileName.split(".").pop() || "";

  if (fileExtension?.toLowerCase() === "sql") {
    return true;
  }

  return false;
};

export const getFileExtension = (fileName: string) => {
  // If file starts with a dot, return everything
  if (fileName.startsWith(".")) {
    return fileName.toLowerCase();
  }

  const match = fileName.match(/(\.[^.]+(?:\.[^.]+)?$)/);
  return match ? match[1].toLowerCase() : "";
};

export const isPythonBruinAsset = async (fileName: string): Promise<boolean> =>
  isBruinAsset(fileName, [".py"]);

export const isBruinPipeline = async (fileName: string): Promise<boolean> => {
  const baseName = path.basename(fileName);
  const isPipelineFile = baseName === "pipeline.yml" || baseName === "pipeline.yaml"; // Check for both extensions

  if (isPipelineFile) {
    return true;
  }
  return false;
};
export function isConfigFile(filePath: string): boolean {
  const configSuffixes = [
    "pipeline.yml",
    "pipeline.yaml",
    ".bruin.yml",
    ".bruin.yaml"
  ];
  return configSuffixes.some(suffix => filePath.endsWith(suffix));
}
export const isYamlBruinAsset = async (fileName: string): Promise<boolean> =>
  isBruinAsset(fileName, [".asset.yml", ".asset.yaml"]);

export const isBruinYaml = async (fileName: string): Promise<boolean> => {
  return getFileExtension(fileName) === ".bruin.yml" ? true : false;
};

export const isBruinAsset = async (
  fileName: string,
  validAssetExtentions: string[]
): Promise<boolean> => {
  if (!fileName) {
    return false;
  }
  // Ensure fileName is not undefined
  const fileExtension = getFileExtension(fileName);

  if (!validAssetExtentions.includes(fileExtension)) {
    return false;
  }

  const bruinPattern = /(\"\"\"\s*@bruin\s*$)|(\/\*\s*@bruin\s*$)/m;

  try {
    const assetContent = fs.readFileSync(fileName, "utf8");
    const bruinAsset =
      bruinPattern.test(assetContent) ||
      fileExtension === ".asset.yml" ||
      fileExtension === ".asset.yaml";

    return bruinAsset;
  } catch (err) {
    console.error(`[isBruinAsset] Error reading file ${fileName}:`, err);
    return false;
  }
};

export const encodeHTML = (str: string) => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const removeAnsiColors = (str: string): string => {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
};

/* export const processLineageData =(lineageString : string): any => {
  if (lineageString.startsWith('"') && lineageString.endsWith('"')) {
  lineageString = lineageString.substring(1, lineageString.length - 1);
}
return lineageString.split('\\n'); 
}; */

export const processLineageData = (lineageString: { name: any }): any => {
  return lineageString.name;
};

export function getDependsSectionOffsets(document: vscode.TextDocument) {
  const text = document.getText();
  const dependsStart = text.indexOf("depends:");
  if (dependsStart === -1) {
    return { start: -1, end: -1 };
  }

  let dependsEnd = text.length;
  const lines = text.split("\n");
  const startLine = document.positionAt(dependsStart).line;

  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (trimmedLine === "" || (!trimmedLine.startsWith("-") && !line.startsWith(" "))) {
      dependsEnd = document.offsetAt(new vscode.Position(i, 0));
      break;
    }
  }

  return { start: dependsStart, end: dependsEnd };
}

export function isChangeInDependsSection(
  change: vscode.TextDocumentContentChangeEvent,
  document: vscode.TextDocument
) {
  const { start, end } = getDependsSectionOffsets(document);
  if (start === -1 || end === -1) {
    return false;
  }

  const changeStartOffset = document.offsetAt(change.range.start);
  const changeEndOffset = document.offsetAt(change.range.end);

  return (
    (changeStartOffset >= start && changeStartOffset <= end) ||
    (changeEndOffset >= start && changeEndOffset <= end)
  );
}

/**
 * Filter and concatenate flags for a command.
 *
 * @param {string} flags - A space-separated string of flags.
 * @param {string[]} excludeFlags - Flags to be excluded from the result.
 * @returns {string[]} - An array of concatenated flags.
 */
export function prepareFlags(flags: string, excludeFlags: string[] = []): string[] {
  const baseFlags = ["-o", "json"];
  const filteredFlags = flags
    .split(" ")
    .filter((flag) => flag !== "" && !excludeFlags.includes(flag));
  return baseFlags.concat(filteredFlags);
}

type ConnectionType =
  | "aws"
  | "athena"
  | "google_cloud_platform"
  | "snowflake"
  | "postgres"
  | "redshift"
  | "mssql"
  | "databricks"
  | "synapse"
  | "mongo"
  | "mysql"
  | "notion"
  | "hana"
  | "shopify"
  | "gorgias"
  | "generic";

export interface Connection {
  type: ConnectionType;
  name: string | null;
  environment: string;
  [key: string]: any; // This allows for any additional properties
}

/**
 * Extracts non-null connections from the JSON object.
 * param {any} json - The JSON object to extract connections from.
 * returns {Connection[]} - An array of connections.
 *
 * @param json
 * @returns
 * */

export const extractNonNullConnections = (json: any): Connection[] => {
  const connections: Connection[] = [];

  // Ensure json and environments exist
  if (!json || !json.environments) {
    return connections; // Return empty if environments key is missing
  }

  // Iterate through each environment
  Object.keys(json.environments).forEach((environmentName) => {
    const environmentConnections = json.environments[environmentName].connections;

    // Iterate through each connection type within the environment
    Object.keys(environmentConnections).forEach((connectionType: string) => {
      const connection = environmentConnections[connectionType];

      if (Array.isArray(connection)) {
        connection.forEach((conn) => {
          if (conn) {
            connections.push({
              environment: environmentName,
              type: connectionType as ConnectionType,
              ...conn, // Spread all properties of the connection
            });
          }
        });
      } else if (connection !== null) {
        connections.push({
          environment: environmentName,
          type: connectionType as ConnectionType,
          ...connection, // Spread all properties of the connection
        });
      }
    });
  });

  return connections;
};
