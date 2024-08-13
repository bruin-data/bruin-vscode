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
  const match = fileName.match(/\.(.+)/);
  return match ? match[1].toLowerCase() : "";
};

export const isPythonBruinAsset = async (fileName: string): Promise<boolean> =>
  isBruinAsset(fileName, ["py"]);

export const isBruinPipeline = async (fileName: string): Promise<boolean> => {
  console.log("this is a pipleine" + path.basename(fileName) === "pipeline.yml" ? true : false);
  return path.basename(fileName) === "pipeline.yml" ? true : false;
};
export const isYamlBruinAsset = async (fileName: string): Promise<boolean> =>
  isBruinAsset(fileName, ["asset.yml", "asset.yaml"]);

export const isBruinYaml = async (fileName: string): Promise<boolean> => {
  return getFileExtension(fileName) === "bruin.yml" ? true : false;
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
      fileExtension === "asset.yml" ||
      fileExtension === "asset.yaml";

    return bruinAsset;
  } catch (err) {
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
