import {
    Disposable,
    Uri,
    ViewColumn,
    window,
    workspace,
    WorkspaceEdit,
    commands,
    Range,
    Position,
  } from "vscode";
  import { QueryPreviewPanel } from "./QueryPreviewPanel";
  import * as fs from "fs";
  import * as path from "path";
  
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
  
    public static async render(extensionUri: Uri, tableName: string, schemaName?: string, connectionName?: string, environmentName?: string) {
      try {
        const cleanTableName = tableName.replace(/\.sql$/, "");
        const connectionIdentifier = connectionName || 'default';
        const environmentIdentifier = environmentName || 'default';
        
        // Check if there's already an open document for this table
        const openDocuments = workspace.textDocuments;
        const existingDoc = openDocuments.find(doc => {
          const fileName = path.basename(doc.fileName);
          return fileName.startsWith(`bruin-${cleanTableName}-${connectionIdentifier}-${environmentIdentifier}-`) && fileName.endsWith('.sql');
        });
        
        if (existingDoc) {
          // If document already exists, just switch to it
          await window.showTextDocument(existingDoc, {
            viewColumn: ViewColumn.One,
            preview: false,
          });
          
          // Safely focus QueryPreview panel without recreating it
          await QueryPreviewPanel.focusSafely();
          return;
        }
        
        // Create logs directory in workspace for temporary SQL files
        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error("Workspace folder not found");
        }
        
        const tempDir = path.join(workspaceFolder.uri.fsPath, "logs");
        
        // Create logs directory if it doesn't exist (cross-platform compatible)
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFileName = `bruin-${cleanTableName}-${connectionIdentifier}-${environmentIdentifier}-${Date.now()}.sql`;
        const tempFilePath = path.join(tempDir, tempFileName);
        
        // Track temp file for cleanup
        this.tempFiles.add(tempFilePath);
        
        let initialContent = `-- environment: ${environmentName || 'default'}\n`;
        initialContent += `-- connection: ${connectionName || 'default'}\n`;
        if (schemaName) {
          initialContent += `SELECT * FROM ${this._sanitizeTableName(schemaName)}.${this._sanitizeTableName(cleanTableName)};\n\n`;
        } else {
          initialContent += `SELECT * FROM ${this._sanitizeTableName(cleanTableName)};\n\n`;
        }
  
        fs.writeFileSync(tempFilePath, initialContent);
        
        const uri = Uri.file(tempFilePath);
        const doc = await workspace.openTextDocument(uri);
        
        await window.showTextDocument(doc, {
          viewColumn: ViewColumn.One,
          preview: false,
          selection: new Range(new Position(3, 0), new Position(3, 0))
        });
  
        // Safely focus QueryPreview panel without recreating it
        await QueryPreviewPanel.focusSafely();
  
      } catch (error) {
        window.showErrorMessage(`Table details error: ${error}`);
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