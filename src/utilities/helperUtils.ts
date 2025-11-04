import * as vscode from "vscode";
import * as fs from "fs";
import path = require("path");
export const isEditorActive = (): boolean => !!vscode.window.activeTextEditor;
import * as cronParser from "cron-parser";

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

export const getFileExtension = (filePath: string) => {
  // Normalize path separators to ensure cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Extract the filename using posix
  const fileName = path.posix.basename(normalizedPath);
  
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
  isBruinAsset(fileName, [".asset.yml", ".asset.yaml", ".task.yml", ".task.yaml"]);

export const isBruinYaml = async (fileName: string): Promise<boolean> => {
  return getFileExtension(fileName) === ".bruin.yml" ? true : false;
};

export const isBruinSqlAsset = async (fileName: string): Promise<boolean> => {
  const isSqlAsset = isBruinAsset(fileName, [".sql"]);
  return isSqlAsset;
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
      [".asset.yml", ".asset.yaml", ".task.yml", ".task.yaml"].includes(fileExtension);

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
export function prepareFlags(
  flags: string,
  excludeFlags: string[] = [],
  excludeFlagsWithValues: string[] = []
): string[] {
  const baseFlags = ["-o", "json"];
  const tokens = flags.split(" ").filter((t) => t !== "");

  const result: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // Skip simple excludes
    if (excludeFlags.includes(token)) {
      continue;
    }
    // Skip flag-with-value pairs (and consume the following value token if present)
    if (excludeFlagsWithValues.includes(token)) {
      // consume next token if it's not another flag
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        i += 1; // skip value
      }
      continue;
    }
    result.push(token);
  }

  return baseFlags.concat(result);
}

// Build a safe set of flags for the render command: only allow known, value-carrying flags
export function buildRenderFlags(flags: string): string[] {
  const baseFlags = ["-o", "json"];
  const tokens = (flags || "").split(" ").filter((t) => t !== "");
  const allowedValueFlags = new Set(["--start-date", "--end-date", "--var"]);
  const allowedBooleanFlags = new Set<string>(["--apply-interval-modifiers", "--full-refresh"]);

  const result: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (allowedValueFlags.has(token)) {
      // must have a value next
      if (i + 1 < tokens.length) {
        result.push(token, tokens[i + 1]);
        i += 1;
      }
      continue;
    }
    if (allowedBooleanFlags.has(token)) {
      result.push(token);
    }
    // everything else (including tag-related tokens or stray values) is dropped
  }

  return baseFlags.concat(result);
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

export const cronToHumanReadable = (cronExpression: string): string => {
  // Handle predefined schedules
  const predefinedSchedules = {
    hourly: "Every hour",
    daily: "Every day at midnight",
    weekly: "Every Monday at midnight", 
    monthly: "Every 1st of the month at midnight",
    yearly: "Every January 1st at midnight"
  };

  if (cronExpression in predefinedSchedules) {
    return predefinedSchedules[cronExpression as keyof typeof predefinedSchedules];
  }

  // Handle cron expressions
  try {
    const parsed = cronParser.parseExpression(cronExpression);
    const fields = cronExpression.split(' ');
    
    if (fields.length !== 5) {
      return `Invalid cron expression: ${cronExpression}`;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
    
    // Build human readable description
    let description = "Run";
    
    // Handle frequency
    if (dayOfWeek !== '*' && dayOfMonth === '*') {
      // Weekly schedule
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayNumbers = dayOfWeek.split(',').map(d => parseInt(d));
      const dayNames = dayNumbers.map(d => days[d]).join(', ');
      description += ` every ${dayNames}`;
    } else if (dayOfMonth !== '*' && dayOfWeek === '*') {
      // Monthly schedule
      if (dayOfMonth === '1') {
        description += " on the 1st of every month";
      } else if (dayOfMonth === '2') {
        description += " on the 2nd of every month";
      } else if (dayOfMonth === '3') {
        description += " on the 3rd of every month";
      } else {
        description += ` on the ${dayOfMonth}th of every month`;
      }
    } else if (dayOfMonth === '*' && dayOfWeek === '*') {
      // Daily schedule
      description += " every day";
    } else {
      description += " on schedule";
    }
    
    // Handle time
    if (hour === '*' && minute === '*') {
      description += " every minute";
    } else if (hour === '*') {
      // Handle minute patterns
      if (minute === '0') {
        description += " every hour";
      } else if (minute.startsWith('*/')) {
        const interval = minute.substring(2);
        description += ` every ${interval} minutes`;
      } else if (minute.includes(',')) {
        const minutes = minute.split(',').map(m => m.trim());
        description += ` at ${minutes.join(', ')} minutes past every hour`;
      } else {
        description += ` at ${minute} minutes past every hour`;
      }
    } else {
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      const time = `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;
      description += ` at ${time}`;
    }
    
    return description;
  } catch (error) {
    return `Invalid cron expression: ${cronExpression}`;
  }
};

