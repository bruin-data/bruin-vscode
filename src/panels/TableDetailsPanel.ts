import {
  Disposable,
  Uri,
  ViewColumn,
  window,
  workspace,
  WorkspaceEdit,
  commands,
} from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export class TableDetailsPanel {
  private static tempFiles: Set<string> = new Set();

  public static initialize(subscriptions: Disposable[]) {
    // Cleanup temp files on dispose
    subscriptions.push({
      dispose: () => {
        this.cleanup();
      }
    });
  }

  public static async render(extensionUri: Uri, tableName: string) {
    try {
      const cleanTableName = tableName.replace(/\.sql$/, "");
      
      // Check if there's already an open document for this table
      const openDocuments = workspace.textDocuments;
      const existingDoc = openDocuments.find(doc => {
        const fileName = path.basename(doc.fileName);
        return fileName.startsWith(`bruin-${cleanTableName}-`) && fileName.endsWith('.sql');
      });
      
      if (existingDoc) {
        // If document already exists, just switch to it
        await window.showTextDocument(existingDoc, {
          viewColumn: ViewColumn.One,
          preview: false,
        });
        
        // Open QueryPreview panel automatically
        await commands.executeCommand('bruin.QueryPreviewView.focus');
        return;
      }
      
      // Create temp directory in workspace
      const workspaceFolder = workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("Workspace folder not found");
      }
      
      const tempDir = path.join(workspaceFolder.uri.fsPath, ".bruin-temp");
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFileName = `bruin-${cleanTableName}-${Date.now()}.sql`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      // Track temp file for cleanup
      this.tempFiles.add(tempFilePath);
      
      const initialContent = `-- Table: ${cleanTableName}

SELECT * FROM ${this._sanitizeTableName(cleanTableName)};

`;

      fs.writeFileSync(tempFilePath, initialContent);
      
      const uri = Uri.file(tempFilePath);
      const doc = await workspace.openTextDocument(uri);
      
      await window.showTextDocument(doc, {
        viewColumn: ViewColumn.One,
        preview: false,
      });

      // Open QueryPreview panel automatically after opening the table
      await commands.executeCommand('bruin.QueryPreviewView.focus');

    } catch (error) {
      window.showErrorMessage(`Table detayları açılırken hata: ${error}`);
    }
  }

  private static cleanup() {
    this.tempFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Temp file cleanup error: ${error}`);
      }
    });
    this.tempFiles.clear();
  }

  private static _sanitizeTableName(tableName: string): string {
    return tableName.replace(/[^a-zA-Z0-9_.]/g, "");
  }
} 