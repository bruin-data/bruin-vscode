import * as vscode from "vscode";
import * as fs from "fs";
export const isEditorActive = (): boolean => !!vscode.window.activeTextEditor;

export const isFileExtensionSQL = (fileName: string): boolean => {
  fileName = fileName.toLowerCase();
  let fileExtension = fileName.split(".").pop() || "";

  if (fileExtension?.toLowerCase() === "sql") {
    return true;
  }

  return false;
};

export const isPythonBruinAsset = async (fileName: string): Promise<boolean> => isBruinAsset(fileName, ["py"]);

export const isBruinAsset = async (fileName: string, validAssetExtentions: string[]): Promise<boolean> => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

  if (!validAssetExtentions.includes(fileExtension)) {
    return false;
  }

  const bruinPattern = /(\"\"\"\s*@bruin\s*$)|(\/\*\s*@bruin\s*$)/m;
  
  try {
    const assetContent = await fs.readFileSync(fileName, 'utf8');
    return bruinPattern.test(assetContent);
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
