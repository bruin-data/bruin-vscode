import * as vscode from "vscode";

export const isEditorActive = (): boolean => !!vscode.window.activeTextEditor;

export const isFileExtensionSQL = (fileName: string): boolean => {
  fileName = fileName.toLowerCase();
  let fileExtension = fileName.split(".").pop() || "";

  if (fileExtension?.toLowerCase() === "sql") {
    return true;
  }

  return false;
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
