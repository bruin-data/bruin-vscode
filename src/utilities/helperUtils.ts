import * as vscode from "vscode";
import * as fs from "fs";
export const isEditorActive = (): boolean => !!vscode.window.activeTextEditor;

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

export const isPythonBruinAsset = async (fileName: string): Promise<boolean> =>
  isBruinAsset(fileName, ["py"]);

export const isBruinAsset = async (
  fileName: string,
  validAssetExtentions: string[]
): Promise<boolean> => {
  if (!fileName) {
    return false;
  }
  // Ensure fileName is not undefined
  const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";

  if (!validAssetExtentions.includes(fileExtension)) {
    return false;
  }

  const bruinPattern = /(\"\"\"\s*@bruin\s*$)|(\/\*\s*@bruin\s*$)/m;

  try {
    const assetContent = fs.readFileSync(fileName, "utf8");
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

/* export const processLineageData =(lineageString : string): any => {
  if (lineageString.startsWith('"') && lineageString.endsWith('"')) {
  lineageString = lineageString.substring(1, lineageString.length - 1);
}
return lineageString.split('\\n'); 
}; */

export const processLineageData = (lineageString: { name: any }): any => {
  return lineageString.name;
};

/* {
  "name": "test_dataset.test",
  "upstream": [],
  "downstream": [
      {
          "name": "test_dataset.test3",
          "type": "bq.sql",
          "executable_file": {
              "name": "test3.sql",
              "path": "/Users/djamilabaroudi/Desktop/bruin-test/pipeline-one/assets/test3.sql",
              "content": ""
          },
          "definition_file": {
              "name": "test3.sql",
              "path": "/Users/djamilabaroudi/Desktop/bruin-test/pipeline-one/assets/test3.sql",
              "type": "comment"
          }
      }
  ]
} */
