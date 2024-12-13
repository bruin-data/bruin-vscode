import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { bruinWorkspaceDirectory } from "./bruinUtils";

export const findGlossaryFile = async (
  workspaceDir: string,
  glossaryFileNames = ["glossary.yaml", "glossary.yml"]
): Promise<string | undefined> => {
  try {
    // First, check if glossary is directly in the workspace root
    for (const fileName of glossaryFileNames) {
      const glossaryPath = path.join(workspaceDir, fileName);
      try {
        await fs.promises.access(glossaryPath, fs.constants.F_OK);
        return glossaryPath;
      } catch (err: any) {
        // Silently continue if file is not found
        if (err.code !== "ENOENT") {
          console.error("Unexpected error checking glossary:", err);
          return undefined;
        }
      }
    }
  } catch (error) {
    console.error("Error finding glossary file:", error);
    return undefined;
  }
};

export const openGlossary = async (
  workspaceDir: string,
  activeTextEditor: { viewColumn: vscode.ViewColumn },
  entityAttribute?: {
    entity?: string;
    attribute?: string;
  }
): Promise<void> => {
  try {
    // Get the current active text editor's file path
    if (!workspaceDir) {
      vscode.window.showErrorMessage("Could not determine Bruin workspace directory.");
      return;
    }

    // Find the glossary file
    const glossaryPath = await findGlossaryFile(workspaceDir);

    if (!glossaryPath) {
      vscode.window.showErrorMessage("Glossary file not found in the workspace.");
      return;
    }

    // Determine the view column
    const viewColumn = activeTextEditor
      ? activeTextEditor.viewColumn === vscode.ViewColumn.One
        ? vscode.ViewColumn.Two
        : vscode.ViewColumn.One
      : vscode.ViewColumn.Active;

    // Open the glossary file in the specified view column
    const glossaryUri = vscode.Uri.file(glossaryPath);
    const document = await vscode.workspace.openTextDocument(glossaryUri);
    await vscode.window.showTextDocument(document, {
      viewColumn: viewColumn,
      preserveFocus: true, // Keep focus on the current editor
    });

    // If specific entity and attribute are provided, attempt to find and highlight
    if (entityAttribute?.entity && entityAttribute?.attribute) {
      const textEditor = vscode.window.activeTextEditor;
      if (textEditor) {
        const text = textEditor.document.getText();
        const entityRegex = new RegExp(`\\b${entityAttribute.entity}:\\s*`, "i");
        const attributeRegex = new RegExp(`\\s*${entityAttribute.attribute}:`, "i");

        const entityMatch = text.match(entityRegex);
        const attributeMatch = text.match(attributeRegex);

        if (entityMatch || attributeMatch) {
          const startPos = textEditor.document.positionAt(
            entityMatch ? entityMatch.index! : attributeMatch!.index!
          );

          // Create a range to select
          const endPos = textEditor.document.positionAt(
            (entityMatch ? entityMatch.index! : attributeMatch!.index!) +
              (entityMatch ? entityMatch[0].length : attributeMatch![0].length)
          );

          // Reveal the range and select it
          textEditor.revealRange(
            new vscode.Range(startPos, endPos),
            vscode.TextEditorRevealType.InCenter
          );
          textEditor.selection = new vscode.Selection(startPos, endPos);
        }
      }
    }
  } catch (error) {
    console.error("Error opening glossary:", error);
    vscode.window.showErrorMessage("Failed to open glossary file.");
  }
};
