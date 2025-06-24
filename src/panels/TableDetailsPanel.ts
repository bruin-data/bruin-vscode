import {
  Disposable,
  Uri,
  ViewColumn,
  window,
  workspace,
  WorkspaceEdit,
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
      
      const tempDir = os.tmpdir();
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