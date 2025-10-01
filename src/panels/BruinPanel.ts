/* eslint-disable @typescript-eslint/naming-convention */
import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, workspace } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import {
  BruinValidate,
  bruinWorkspaceDirectory,
  checkCliVersion,
  createIntegratedTerminal,
  getCurrentPipelinePath,
  runInIntegratedTerminal,
  runBruinCommandInIntegratedTerminal,
  escapeFilePath,


} from "../bruin";
import { BruinFill } from "../bruin/bruinFill";
import { BruinInit } from "../bruin/bruinInit";
import * as vscode from "vscode";
import { renderCommandWithFlags } from "../extension/commands/renderCommand";
import {
  convertFileToAssetCommand,
  parseAssetCommand,
  patchAssetCommand,
} from "../extension/commands/parseAssetCommand";
import { getEnvListCommand } from "../extension/commands/getEnvListCommand";
import { BruinInstallCLI } from "../bruin/bruinInstallCli";
import {
  createConnection,
  deleteConnection,
  getConnections,
  getConnectionsListFromSchema,
  testConnection,
} from "../extension/commands/manageConnections";
import { createEnvironment, deleteEnvironment, updateEnvironment } from "../extension/commands/manageEnvironments";
import { openGlossary } from "../bruin/bruinGlossaryUtility";
import { QueryPreviewPanel } from "./QueryPreviewPanel";
import { 
  getBruinExecutablePath
} from "../providers/BruinExecutableService";
import path = require("path");
import { isBruinAsset } from "../utilities/helperUtils";
import { BruinInternalParse } from "../bruin/bruinInternalParse";
import { BruinInternalListTemplates } from "../bruin/bruinInternalListTemplates";
import { BruinInternalAssetMetadata } from "../bruin/bruinInternalAssetMetadata";

import { getDefaultCheckboxSettings, getDefaultExcludeTag } from "../extension/configuration";
import { exec } from "child_process";
import { flowLineageCommand } from "../extension/commands/FlowLineageCommand";

/**
 * This class manages the state and behavior of Bruin webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering Bruin webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class BruinPanel {
  public static currentPanel: BruinPanel | undefined;
  public static readonly viewId = "bruin.panel";
  private readonly _panel: WebviewPanel;
  private readonly _extensionUri: Uri;
  private _disposables: Disposable[] = [];
  private _lastRenderedDocumentUri: Uri | undefined;
  private _flags: string = "";
  private _assetDetectionDebounceTimer: NodeJS.Timeout | undefined;
  private _renderDebounceTimer: NodeJS.Timeout | undefined;
  private _cliInstalled: boolean | null = null;
  private _initialSettingsOnlyMode: boolean = false;
  private _hasRecreatedFromSettingsOnly: boolean = false;

  /**
   * The BruinPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    const defaultSettings = getDefaultCheckboxSettings();
    this._checkboxState = {
      "Full-Refresh": false, // This remains explicitly false
      "Interval-modifiers": defaultSettings.defaultIntervalModifiers,
      "Exclusive-End-Date": defaultSettings.defaultExclusiveEndDate,
      "Push-Metadata": defaultSettings.defaultPushMetadata,
    };
    const iconPath = Uri.joinPath(extensionUri, "img", "bruin-logo-sm128.png");
    panel.iconPath = { light: iconPath, dark: iconPath };
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._disposables.push(
      workspace.onDidChangeTextDocument(async (editor) => {

        if (editor && editor.document.uri.fsPath.endsWith(".bruin.yml")) {
          getEnvListCommand(this._lastRenderedDocumentUri);
          getConnections(this._lastRenderedDocumentUri);
        }
        if (editor && editor.document.uri) {

          this._lastRenderedDocumentUri = editor.document.uri;
          await this._handleAssetDetection(this._lastRenderedDocumentUri);
          // Keep SQL preview up to date while typing without recreating the panel
          this._scheduleSqlPreviewRender(this._lastRenderedDocumentUri);
        }
      }),

      // Watch for external changes to .bruin.yml files (e.g., from bruin init)
      workspace.createFileSystemWatcher("**/.bruin.yml").onDidChange(async (uri) => {

        getEnvListCommand(this._lastRenderedDocumentUri);
        getConnections(this._lastRenderedDocumentUri);
        
        // Also refresh the activity bar connections
        vscode.commands.executeCommand('bruin.refreshConnections');
      }),

      window.onDidChangeActiveTextEditor(async (editor) => {
        // One-time recreation only if the panel was originally created in settings-only (no active editor)
        // and we are seeing the first active editor. Ignore subsequent focus toggles.
        if (this._initialSettingsOnlyMode && !this._hasRecreatedFromSettingsOnly && editor && editor.document?.uri) {
          const extUri = this._extensionUri;
          this._hasRecreatedFromSettingsOnly = true;
          setTimeout(() => {
            try {
              this.dispose();
            } finally {
              BruinPanel.render(extUri);
            }
          }, 0);
          return;
        }

        if (editor && editor.document.uri) {
          const newFilePath = editor.document.uri.fsPath;
          const previousFilePath = this._lastRenderedDocumentUri?.fsPath;
          
          this._lastRenderedDocumentUri = editor.document.uri;

          // Skip refresh if returning to the same .bruin.yml file to preserve UI state
          const isBruinConfigFile = newFilePath.endsWith(".bruin.yml") || newFilePath.endsWith(".bruin.yaml");
          const isSameBruinFile = isBruinConfigFile && newFilePath === previousFilePath;
          
          if (isSameBruinFile) {
            // Don't refresh if returning to the same .bruin.yml file
            return;
          }

          // Send current file path to webview
          this._panel.webview.postMessage({
            command: "file-changed",
            filePath: newFilePath,
          });
          
          await this._handleAssetDetection(this._lastRenderedDocumentUri);
        }
      }),
      vscode.workspace.onDidRenameFiles((e) => {
        e.files.forEach((file) => {
          if (this._lastRenderedDocumentUri?.fsPath === file.oldUri.fsPath) {
            this._lastRenderedDocumentUri = file.newUri;
    
          }
        });
      }),

      vscode.workspace.onDidCreateFiles(async (e) => {
        for (const file of e.files) {
          const filePath = file.fsPath;
          const fileExt = this._getFileExtension(filePath);
          const isSupportedFileType = ["py", "sql", "yml", "yaml"].includes(fileExt);
          const inAssetsFolder = await this._isInAssetsFolder(filePath);
          
          if (inAssetsFolder && isSupportedFileType) {
            if (window.activeTextEditor && window.activeTextEditor.document.uri.fsPath === filePath) {
              this._lastRenderedDocumentUri = file;
              this._panel.webview.postMessage({
                command: "file-changed",
                filePath: filePath,
              });
              await this._handleAssetDetection(file);
            }
          }
        }
      })
    );

    // Capture initial mode to know if we started from Welcome/settings-only
    this._initialSettingsOnlyMode = !window.activeTextEditor;
    if (window.activeTextEditor) {
      this._lastRenderedDocumentUri = window.activeTextEditor.document.uri;
    }
    
    this._initializeWebview(extensionUri);
  }

  private async _initializeWebview(extensionUri: Uri): Promise<void> {
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, null);
    this._lastRenderedDocumentUri = window.activeTextEditor?.document.uri;
    this._setWebviewMessageListener(this._panel.webview);
    
    this._checkCliStatus();
  }
  private async _checkCliStatus(): Promise<void> {
    try {
      const bruinInstaller = new BruinInstallCLI();
      const detectionTimeoutMs = 2000;
      const timeoutPromise = new Promise<{ installed: boolean; isWindows: boolean; gitAvailable: boolean }>((resolve) => {
        setTimeout(() => resolve({ installed: false, isWindows: process.platform === 'win32', gitAvailable: false }), detectionTimeoutMs);
      });
      const { installed, isWindows, gitAvailable } = await Promise.race([
        bruinInstaller.checkBruinCliInstallation(),
        timeoutPromise,
      ]);
      this._cliInstalled = installed;
      this._panel.webview.postMessage({
        command: "bruinCliInstallationStatus",
        installed,
        isWindows,
        gitAvailable,
      });
      if (installed && this._lastRenderedDocumentUri) {
        const cliFilePath = this._lastRenderedDocumentUri.fsPath;
        const isActualAsset = await this._isAssetFile(cliFilePath);
        
        if (isActualAsset) {
          parseAssetCommand(this._lastRenderedDocumentUri);
        } else {
          await this._handleAssetDetection(this._lastRenderedDocumentUri);
        }
        getEnvListCommand(this._lastRenderedDocumentUri);
      }
    } catch (error) {
      this._cliInstalled = false;
      this._panel.webview.postMessage({
        command: "bruinCliInstallationStatus",
        installed: false,
        isWindows: process.platform === "win32",
        gitAvailable: false,
      });
    }
  }


  public static restore(panel: WebviewPanel, extensionUri: Uri): BruinPanel {
    const bruinPanel = new BruinPanel(panel, extensionUri);
    bruinPanel._panel.webview.postMessage({
      command: 'setDefaultCheckboxStates',
      payload: bruinPanel._checkboxState
    });
    return bruinPanel;
  }

  public static postMessage(
    name: string,
    data: string | { status: string; message: string | any },
    panelType?: string
  ) {
    if (BruinPanel.currentPanel?._panel) {
      BruinPanel.currentPanel._panel.webview.postMessage({
        command: name,
        payload: data,
      });
    }
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static render(extensionUri: Uri) {
    const column = ViewColumn.Beside;

    if (this.currentPanel) {
      this.currentPanel._panel.reveal(column, true);
    } else {
      const panel = window.createWebviewPanel(this.viewId, "Bruin", column, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          Uri.joinPath(extensionUri, "img"),
          Uri.joinPath(extensionUri, "out"),
          Uri.joinPath(extensionUri, "webview-ui/build"),
        ],
      });

      this.currentPanel = new BruinPanel(panel, extensionUri);
    }
    if (this.currentPanel) {
      this.currentPanel._panel.webview.postMessage({
        command: "setDefaultCheckboxStates",
        payload: this.currentPanel._checkboxState,
      });
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    BruinPanel.currentPanel = undefined;

    // Clear any pending asset detection timer
    if (this._assetDetectionDebounceTimer) {
      clearTimeout(this._assetDetectionDebounceTimer);
      this._assetDetectionDebounceTimer = undefined;
    }

    // Clear any pending SQL render timer
    if (this._renderDebounceTimer) {
      clearTimeout(this._renderDebounceTimer);
      this._renderDebounceTimer = undefined;
    }

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the Vue webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private readonly relevantFileExtensions = [
    ".sql",
    ".py",
    ".yml",
    ".yaml",
    ".asset.yml",
    ".asset.yaml",
    "pipeline.yml",
    "pipeline.yaml",
    ".bruin.yml",
    ".bruin.yaml",
  ];

  private _getWebviewContent(webview: Webview, extensionUri: Uri, initialCliStatus: boolean | null = null): string {
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "webview-ui", "build", "assets", "codicon.css")
    );
    const scriptUriCustomElt = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "webview-ui", "build", "assets", "custom-elements.js")
    );

    const stylesUriCustomElt = getUri(webview, extensionUri, [
      "webview-ui",
      "build",
      "assets",
      "custom-elements.css",
    ]);
    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="
            default-src 'none';
            img-src ${webview.cspSource} https:;
            script-src 'nonce-${nonce}' ${webview.cspSource} https://cdn.rudderlabs.com/ https://cdn.rudderstack.com/ https://api.rudderstack.com;
            connect-src https://api.rudderstack.com https://getbruinbumlky.dataplane.rudderstack.com;
            style-src ${webview.cspSource} 'unsafe-inline';
            font-src ${webview.cspSource};
         ">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <link rel="stylesheet" href="${stylesUriCustomElt}">
          <link rel="stylesheet" href="${codiconsUri}">
          <title>Bruin Panel</title>
          <script nonce="${nonce}">
            // Set initial CLI status before Vue app loads (null = unknown)
            window.initialBruinCliStatus = ${initialCliStatus === null ? 'null' : initialCliStatus};
          </script>
        </head>
        <body>
          <div id="app"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}">
                window.onerror = function(message, source, lineno, colno, error) {
                console.error('Webview error:', message, 'at line:', lineno, 'source:', source, 'error:', error);
              };
          </script>
          <script type="module" nonce="${nonce}" src="${scriptUriCustomElt}">
                window.onerror = function(message, source, lineno, colno, error) {
                console.error('Webview error:', message, 'at line:', lineno, 'source:', source, 'error:', error);
              };
          </script>        
        </body>
      </html>
    `;
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    this._panel.webview.postMessage({
      command: "init",
      panelType: "bruin",
      lastRenderedDocument: this._lastRenderedDocumentUri
        ? this._lastRenderedDocumentUri.fsPath
        : null,
      checkboxState: this._checkboxState,
      settingsOnlyMode: !window.activeTextEditor,
    });

    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        switch (command) {
          case "bruin.validateAll":
            let bruinWorkspaceDir: string | undefined;
            
            if (this._lastRenderedDocumentUri) {
              bruinWorkspaceDir = await bruinWorkspaceDirectory(this._lastRenderedDocumentUri.fsPath);
            }
            
            if (!bruinWorkspaceDir) {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              if (!workspaceFolder) {
                console.error("No workspace folder found.");
                return;
              }
              bruinWorkspaceDir = await bruinWorkspaceDirectory(workspaceFolder.uri.fsPath);
            }

            if (!bruinWorkspaceDir) {
              console.error("No Bruin workspace directory found. Make sure .bruin.yml exists in the project.");
              return;
            }

            const validatorAll = new BruinValidate(
              getBruinExecutablePath(),
              bruinWorkspaceDir
            );

            const defaultExcludeTag = getDefaultExcludeTag();
            await validatorAll.validate(bruinWorkspaceDir, {}, defaultExcludeTag);
            break;
          case "bruin.checkTelemtryPreference":
            const config = workspace.getConfiguration("bruin");
            const telemetryEnabled = config.get<boolean>("telemetry.enabled");
            this._panel.webview.postMessage({
              command: "setTelemetryPreference",
              payload: telemetryEnabled,
            });
            break;
          case "bruin.validateCurrentPipeline":
            if (!this._lastRenderedDocumentUri) {
              console.error("No active document to validate.");
              return;
            }
            const currAssetPath = this._lastRenderedDocumentUri.fsPath;
            const currentPipelinePath = await getCurrentPipelinePath(currAssetPath || "");

            if (!currentPipelinePath) {
              console.error("No pipeline found for the current asset.");
              return;
            }

            const pipelineValidator = new BruinValidate(getBruinExecutablePath(), "");

            try {
              // Get default exclude tag
              const excludeTag = getDefaultExcludeTag();
              // Pass the exclude tag to validate method
      
              await pipelineValidator.validate(currentPipelinePath, {}, excludeTag);
            } catch (error) {
              console.error("Error validating pipeline:", currentPipelinePath, error);
            }

            break;
            case "checkboxChange":
              this._checkboxState = message.payload.checkboxState;
              this._flags = message.payload.flags;
              // Validate current file before rendering with flags
              if (this._lastRenderedDocumentUri?.fsPath && window.activeTextEditor?.document.uri.fsPath === this._lastRenderedDocumentUri.fsPath) {
                await renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri.fsPath);
              }
              break;

          case "bruin.validate":
            if (!this._lastRenderedDocumentUri) {
              console.error("No active document to validate.");
              return;
            }

            const filePath = this._lastRenderedDocumentUri.fsPath;
            console.log(
              "Validating asset:",
              filePath,
              "in workspace:",
              "",
              "with bruin exec:",
              getBruinExecutablePath()
            );
            const validator = new BruinValidate(getBruinExecutablePath(), "");
            
            
            await validator.validate(filePath);
            break;
          case "bruin.runSql":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const fPath = this._lastRenderedDocumentUri?.fsPath;
            runInIntegratedTerminal("", fPath, message.payload, "bruin");
            break;
          case "bruin.runContinue":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const runPath = this._lastRenderedDocumentUri?.fsPath;
            runInIntegratedTerminal(await "", runPath, message.payload, "bruin");
            break;
          case "bruin.runCurrentPipeline":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const currfilePath = this._lastRenderedDocumentUri.fsPath;
            const currentPipeline = getCurrentPipelinePath(currfilePath || "");

            runInIntegratedTerminal("", await currentPipeline, message.payload, "bruin");
            break;

          case "bruin.getAssetDetails":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const assetFilePath = this._lastRenderedDocumentUri.fsPath;
            const isActualAsset = await this._isAssetFile(assetFilePath);
            
            if (isActualAsset) {
              parseAssetCommand(this._lastRenderedDocumentUri);
            }
            break;

          case "bruin.setAssetDetails":
            const assetData = message.payload;
            const source = message.source;
        
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            console.log("Setting asset data :", assetData, "source:", source);
            patchAssetCommand(assetData, this._lastRenderedDocumentUri);
            break;

          case "bruin.fillAssetDependency":
            if (!this._lastRenderedDocumentUri) {
              console.error("No active document to fill asset dependency.");
              return;
            }
            const assetPath = this._lastRenderedDocumentUri.fsPath;
            const assetWorkspaceDir = await bruinWorkspaceDirectory(assetPath);
            
            if (!assetWorkspaceDir) {
              console.error("Could not find Bruin workspace directory.");
              BruinPanel.postMessage("fill-dependencies-message", {
                status: "error",
                message: "Could not find Bruin workspace directory. Make sure you're in a Bruin project.",
              });
              return;
            }

            const fillDependencies = new BruinFill(
              getBruinExecutablePath(),
              assetWorkspaceDir
            );
            await fillDependencies.fillDependencies(assetPath);

            return;

          case "bruin.fillAssetColumn":
            if (!this._lastRenderedDocumentUri) {
              console.error("No active document to fill asset column.");
              return;
            }
            const assetPathFillColumn = this._lastRenderedDocumentUri.fsPath;
            const assetWorkspaceDirFillColumn = await bruinWorkspaceDirectory(assetPathFillColumn);

            if (!assetWorkspaceDirFillColumn) {
              console.error("Could not find Bruin workspace directory.");
              BruinPanel.postMessage("fill-columns-message", {
                status: "error",
                message: "Could not find Bruin workspace directory. Make sure you're in a Bruin project.",
              });
              return;
            }

            const fillColumns = new BruinFill(
              getBruinExecutablePath(),
              assetWorkspaceDirFillColumn
            );
            await fillColumns.fillColumns(assetPathFillColumn);

            return;

          

          case "bruin.getEnvironmentsList":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            getEnvListCommand(this._lastRenderedDocumentUri);
            break;
          case "bruin.setSelectedEnvironment":
            const envData = message.payload;
            console.log("Setting selected environment :", envData);
            QueryPreviewPanel.postMessage("set-environment", {
              status: "success",
              message: envData,
            });
            break;
          case "bruin.updateQueryDates":
            const { startDate, endDate } = message.payload;
            console.log(
              `BruinPanel: Sending dates to QueryPreviewPanel - start: ${startDate}, end: ${endDate}`
            );
            QueryPreviewPanel.postMessage("update-query-dates", {
              status: "success",
              message: {
                startDate,
                endDate,
              },
            });
            break;
          case "checkBruinCliInstallation":
            await this.checkAndUpdateBruinCliStatus();
            break;
          case "checkInstallationsInfo":
            this.checkInstallationsInfo();
            break;
          case "bruin.installBruinCli":
            await this.installBruinCli();
            break;

          case "bruin.getConnectionsList":
            getConnections(this._lastRenderedDocumentUri);
            break;

          case "bruin.getConnectionsSchema":
            getConnectionsListFromSchema(this._lastRenderedDocumentUri);
            break;
          case "bruinConnections.fileSelected":
            const fileUri = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              filters: {
                serviceAccountFiles: ["json"],
              },
            });
            console.log("Selected file URI", fileUri);
            if (fileUri && fileUri.length > 0) {
              const selectedFileUri = fileUri[0];
              BruinPanel.postMessage("selectedFilePath", {
                status: "success",
                message: {
                  fileName: vscode.workspace.asRelativePath(selectedFileUri),
                  filePath: selectedFileUri.fsPath,
                },
              });
            }
            break;
          case "getLastRenderedDocument":
            // Ensure UI receives a fresh CLI installation status after it's ready
            await this.checkAndUpdateBruinCliStatus();
            BruinPanel.postMessage("lastRenderedDocument", {
              status: "success",
              message: this._lastRenderedDocumentUri?.fsPath,
            });
            
            if (this._lastRenderedDocumentUri) {
              await this._handleAssetDetection(this._lastRenderedDocumentUri);
            }
            break;

          case "bruin.editConnection":
            const { oldConnection, newConnection } = message.payload;
            try {
              // Delete the old connection
              await deleteConnection(
                oldConnection.environment,
                oldConnection.name,
                this._lastRenderedDocumentUri
              );

              // Create the new connection
              await createConnection(
                newConnection.environment,
                newConnection.name,
                newConnection.type,
                newConnection.credentials,
                this._lastRenderedDocumentUri
              );

              // Fetch updated connections list
              await getConnections(this._lastRenderedDocumentUri);

              this._panel.webview.postMessage({
                command: "connection-edited-message",
                payload: { status: "success", message: "Connection updated successfully" },
              });
            } catch (error) {
              console.error("Error editing connection:", error);
              this._panel.webview.postMessage({
                command: "connection-edited-message",
                payload: { status: "error", message: "Failed to edit connection" },
              });
            }
            break;
          case "bruin.deleteConnection":
            const { name, environment } = message.payload;
            deleteConnection(environment, name, this._lastRenderedDocumentUri);
            break;
          case "bruin.createConnection":
            await createConnection(
              message.payload.environment,
              message.payload.name,
              message.payload.type,
              message.payload.credentials,
              this._lastRenderedDocumentUri
            );
            // After creating the connection, fetch the updated list
            await getConnections(this._lastRenderedDocumentUri);
            break;
          case "bruin.testConnection":
            const connectionData = message.payload;
            await testConnection(
              connectionData.environment,
              connectionData.name,
              connectionData.type,
              this._lastRenderedDocumentUri
            );
            console.log("Testing connection:", connectionData);
            break;
          case "bruin.openDocumentationLink":
            vscode.env.openExternal(vscode.Uri.parse(message.payload));
            break;
          case "bruin.openGlossary":
            const activeTextEditor = vscode.window.activeTextEditor;

            const workspaceDir = this._lastRenderedDocumentUri
              ? await bruinWorkspaceDirectory(this._lastRenderedDocumentUri.fsPath)
              : undefined;

            if (!workspaceDir) {
              console.error("Cannot determine Bruin workspace directory.");
              vscode.window.showErrorMessage("Unable to determine the Bruin workspace directory.");
              return;
            }

            if (!activeTextEditor) {
              // Fallback to using the first workspace folder if no active text editor
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders && workspaceFolders.length > 0) {
                try {
                  openGlossary(
                    workspaceDir,
                    { viewColumn: ViewColumn.Two }, // Default to ViewColumn.Two
                    message.payload
                  );
                } catch (error) {
                  console.error("Error opening glossary with fallback:", error);
                  vscode.window.showErrorMessage("Failed to open glossary.");
                }
              } else {
                console.error("No workspace folders available.");
                vscode.window.showErrorMessage("No workspace is currently open.");
              }
              return;
            }

            try {
              openGlossary(
                workspaceDir,
                { viewColumn: activeTextEditor.viewColumn ?? ViewColumn.One },
                message.payload
              );
            } catch (error) {
              console.error("Error opening glossary:", error);
              vscode.window.showErrorMessage("Failed to open glossary file.");
            }
            break;
          case "bruin.checkBruinCLIVersion":
            const versionStatus = await checkCliVersion();
            this._panel.webview.postMessage({
              command: "bruinCliVersionStatus",
              versionStatus,
            });
            break;
          case "bruin.updateBruinCli":
            await this.updateBruinCli();
            break;
          case "bruin.installSpecificVersion":
            const version = message.version;
            console.log("Installing specific version:", version);
            await this.updateBruinCli(version);
            break;
          case "bruin.convertToAsset":
            if (this._lastRenderedDocumentUri) {
              await this._convertToAsset(this._lastRenderedDocumentUri.fsPath);
            }
            break;
          case "bruin.getPipelineAssets":
            console.log("Getting pipeline assets");
            flowLineageCommand(this._lastRenderedDocumentUri, "BruinPanel");
            break;
          case "bruin.createEnvironment":
            const { environmentName } = message.payload;
            console.log("Creating environment:", environmentName);
            try {
              await createEnvironment(environmentName, this._lastRenderedDocumentUri);
              // Refresh the environments list after creation
              await getEnvListCommand(this._lastRenderedDocumentUri);
              BruinPanel.postMessage("environment-created-message", {
                status: "success",
                message: `Environment "${environmentName}" created successfully`
              });
            } catch (error) {
              const errorMessage = String(error);
              let userMessage = `Failed to create environment: ${errorMessage}`;
              
              // Check for outdated CLI version
              if (errorMessage.includes("No help topic for 'create'")) {
                userMessage = "It seems like your CLI version may be outdated. Please update it to use the create command.";
              }
              
              BruinPanel.postMessage("environment-created-message", {
                status: "error",
                message: userMessage
              });
            }
            break;
          case "bruin.deleteEnvironment":
            const { environmentName: deleteEnvName } = message.payload;
            console.log("Deleting environment:", deleteEnvName);
            try {
              await deleteEnvironment(deleteEnvName, this._lastRenderedDocumentUri);
              // Refresh the environments list after deletion
              await getEnvListCommand(this._lastRenderedDocumentUri);
              BruinPanel.postMessage("environment-deleted-message", {
                status: "success",
                message: `Environment "${deleteEnvName}" deleted successfully`
              });
            } catch (error) {
              const errorMessage = String(error);
              let userMessage = `Failed to delete environment: ${errorMessage}`;
              
              // Check for outdated CLI version
              if (errorMessage.includes("No help topic for 'delete'")) {
                userMessage = "It seems like your CLI version may be outdated. Please update it to use the delete command.";
              }
              
              BruinPanel.postMessage("environment-deleted-message", {
                status: "error",
                message: userMessage
              });
            }
            break;
          case "bruin.updateEnvironment":
            const { currentName, newName } = message.payload;
            console.log("Updating environment:", currentName, "to", newName);
            try {
              await updateEnvironment(currentName, newName, this._lastRenderedDocumentUri);
              // Refresh the environments list after update
              await getEnvListCommand(this._lastRenderedDocumentUri);
              BruinPanel.postMessage("environment-updated-message", {
                status: "success",
                message: `Environment "${currentName}" updated to "${newName}" successfully`
              });
            } catch (error) {
              const errorMessage = String(error);
              let userMessage = `Failed to update environment: ${errorMessage}`;
              
              // Check for outdated CLI version
              if (errorMessage.includes("No help topic for 'update'")) {
                userMessage = "It seems like your CLI version may be outdated. Please update it to use the update command.";
              }
              
              BruinPanel.postMessage("environment-updated-message", {
                status: "error",
                message: userMessage
              });
            }
            break;
          case "bruin.getTemplatesList":
            try {
              console.log("Getting templates list");
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
              const templatesCommand = new BruinInternalListTemplates(
                getBruinExecutablePath(),
                workspaceFolder
              );
              const templatesResponse = await templatesCommand.listTemplates();
              
              BruinPanel.postMessage("templates-list-message", {
                status: "success",
                message: templatesResponse
              });
            } catch (error) {
              console.error("Error getting templates list:", error);
              BruinPanel.postMessage("templates-list-message", {
                status: "error",
                message: `Failed to get templates list: ${error}`
              });
            }
            break;
          case "bruin.initProject":
            try {
              console.log("Initializing project with template:", message.payload.templateName, "inPlace:", message.payload.inPlace);
              
              // Ask user to select folder for new project
              const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: "Select folder for new project"
              });
              
              if (!folderUri || folderUri.length === 0) {
                BruinPanel.postMessage("project-init-message", {
                  status: "cancelled",
                  message: "Project creation cancelled"
                });
                return;
              }
              
              const selectedFolder = folderUri[0].fsPath;
              const templateName = message.payload.templateName;
              const inPlace = message.payload.inPlace || false;
              
              // Close existing Bruin terminal to ensure we create a new one with correct working directory
              const existingTerminal = vscode.window.terminals.find(t => t.name === "Bruin Terminal");
              if (existingTerminal) {
                existingTerminal.dispose();
                // Wait a bit for the terminal to be properly disposed
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // Use BruinInit class to initialize project
              const bruinInit = new BruinInit(getBruinExecutablePath(), selectedFolder);
              const result = await bruinInit.initProject(templateName, undefined, inPlace);
            
              const successMessage = inPlace 
                ? `Project '${templateName}' created directly in ${selectedFolder}`
                : `Project '${templateName}' created successfully in ${selectedFolder}`;
              
              BruinPanel.postMessage("project-init-message", {
                status: "success",
                message: successMessage
              });
              
            } catch (error) {
              console.error("Error initializing project:", error);
              BruinPanel.postMessage("project-init-message", {
                status: "error",
                message: `Failed to initialize project: ${error}`
              });
            }
            break;
          case "bruin.refocusActiveEditor":
            if (window.activeTextEditor && this._lastRenderedDocumentUri) {
              await this._handleAssetDetection(this._lastRenderedDocumentUri);
            }
            break;
          case "bruin.showPipelineLineage":
            if (this._lastRenderedDocumentUri) {
              await flowLineageCommand(this._lastRenderedDocumentUri);
            }
            break;
          case "bruin.getAssetMetadata":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const metadataAssetPath = this._lastRenderedDocumentUri.fsPath;
            const isAssetForMetadata = await this._isAssetFile(metadataAssetPath);
            
            if (isAssetForMetadata) {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
              const assetMetadata = new BruinInternalAssetMetadata(
                getBruinExecutablePath(),
                workspaceFolder
              );
              await assetMetadata.getAssetMetadata(metadataAssetPath);
            }
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  // check the OS if its windows or mac or linux
  private async checkInstallationsInfo() {
    const platform = process.platform;
    const packageJson = require("../../package.json");
    const extensionVersion = packageJson.version;

    const bruinInstaller = new BruinInstallCLI();
    const cliVersion = await bruinInstaller.getBruinCliVersion();
    this._panel.webview.postMessage({
      command: "installationInfo",
      platform,
      cliVersion,
      extensionVersion,
    });
  }

  private async checkAndUpdateBruinCliStatus() {
    const bruinInstaller = new BruinInstallCLI();
    const { installed, isWindows, gitAvailable } = await bruinInstaller.checkBruinCliInstallation();
    this._panel.webview.postMessage({
      command: "bruinCliInstallationStatus",
      installed,
      isWindows,
      gitAvailable,
    });
  }
  public getCheckboxFlags(): string {
    return Object.entries(this._checkboxState)
      .filter(([_, checked]) => checked)
      .map(([name, _]) => `--${name.toLowerCase()}`)
      .join(" ");
  }
  private async installBruinCli() {
    try {
      const bruinInstaller = new BruinInstallCLI();
      await bruinInstaller.installBruinCli(async () => {
        const versionStatus = await checkCliVersion();
        this._panel.webview.postMessage({
          command: "bruinCliVersionStatus",
          versionStatus,
        });
      });
      
      // Recheck after installation
      await this.checkAndUpdateBruinCliStatus();
    } catch (error) {
      console.error("Error installing/updating Bruin CLI:", error);
      vscode.window.showErrorMessage("Failed to install/update Bruin CLI. Please try again.");
    }
  }
  private async updateBruinCli(version?: string) {
    try {
      const bruinInstaller = new BruinInstallCLI();
      await bruinInstaller.updateBruinCli(version ?? "", async () => {
        const versionStatus = await checkCliVersion();
        this._panel.webview.postMessage({
          command: "bruinCliVersionStatus",
          versionStatus,
        });
      });
      
      // Recheck after update
      await this.checkAndUpdateBruinCliStatus();
    } catch (error) {
      console.error("Error updating Bruin CLI:", error);
      vscode.window.showErrorMessage("Failed to update Bruin CLI. Please try again.");
    }
  }
  private async _handleAssetDetection(fileUri: Uri | undefined): Promise<void> {
    if (!fileUri) {
      return;
    }

    const filePath = fileUri.fsPath;

    // Clear any existing timer to prevent overlapping calls
    if (this._assetDetectionDebounceTimer) {
      clearTimeout(this._assetDetectionDebounceTimer);
    }

    const isFileSwitch = this._lastRenderedDocumentUri?.fsPath !== filePath;
    
    if (isFileSwitch) {
      await this._performAssetDetection(filePath, fileUri);
    } else {
      this._assetDetectionDebounceTimer = setTimeout(async () => {
        if (window.activeTextEditor?.document.uri.fsPath === filePath) {
          await this._performAssetDetection(filePath, fileUri);
        }
      }, 500);
    }
  }

  private async _performAssetDetection(filePath: string, fileUri: Uri): Promise<void> {
    try {
      console.log("_performAssetDetection: Starting detection for", filePath);
      
      // Check for config files first (highest priority)
      const isConfigFile =
        filePath.endsWith("pipeline.yml") ||
        filePath.endsWith("pipeline.yaml") ||
        filePath.endsWith(".bruin.yml") ||
        filePath.endsWith(".bruin.yaml");

      if (isConfigFile) {
        console.log("_performAssetDetection: File is a config file", filePath);
        this._panel.webview.postMessage({
          command: "clear-convert-message",
          isAsset: false,
          isConfig: true,
          filePath: filePath
        });
        if (this._cliInstalled) {
          parseAssetCommand(fileUri);
        }
        return;
      }

      const isAsset = await this._isAssetFile(filePath);
      console.log("_performAssetDetection: CLI determined file is an asset:", filePath, isAsset);
      if (isAsset) {
        this._panel.webview.postMessage({
          command: "clear-convert-message",
          isAsset: true,
          filePath: filePath
        });
        console.log("_performAssetDetection: Sending clear message to the UI for asset:", filePath);
        if (this._cliInstalled) {
          parseAssetCommand(fileUri);
        }
        return;
      }

      // Only check for conversion if it's NOT an asset and NOT a config file
      const inAssetsFolder = await this._isInAssetsFolder(filePath);
      const fileExt = this._getFileExtension(filePath);
      const isSupportedFileType = ["yml", "yaml", "py", "sql"].includes(fileExt);

      if (inAssetsFolder && isSupportedFileType && this._cliInstalled) {
        this._panel.webview.postMessage({
          command: "non-asset-file",
          showConvertMessage: true,
          fileType: fileExt,
          filePath: filePath,
        });
      } else {
        this._panel.webview.postMessage({
          command: "non-asset-file",
          showConvertMessage: false,
          filePath: filePath,
        });
        if (this._cliInstalled) {
          parseAssetCommand(fileUri);
        }
      }
    } catch (error) {
      console.error("_performAssetDetection: Error in asset detection flow:", error);
      // On error, clear convert message to prevent stale UI
      this._panel.webview.postMessage({
        command: "clear-convert-message",
        isAsset: false,
        filePath: filePath
      });
    }
  }

  private _scheduleSqlPreviewRender(fileUri: Uri | undefined): void {
    if (!fileUri) return;
    const filePath = fileUri.fsPath;

    // debounce to avoid flooding render calls while typing
    if (this._renderDebounceTimer) {
      clearTimeout(this._renderDebounceTimer);
    }
    this._renderDebounceTimer = setTimeout(async () => {
      try {
        // Use existing flags state to keep preview consistent
        await renderCommandWithFlags(this._flags, filePath);
      } catch (err) {
        console.error("Debounced SQL render failed:", err);
      }
    }, 200);
  }

  private async _isAssetFile(filePath: string): Promise<boolean> {

    try {
      // Primary method: Use CLI internal parse command
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
      const parser = new BruinInternalParse(
        getBruinExecutablePath(),
        workspaceFolder
      );
      
      const isAsset = await parser.checkIfAsset(filePath);
      console.log(`_isAssetFile: CLI asset check result for ${filePath}: ${isAsset}`);
      
      if (isAsset) {
        return true;
      }
      
      // Fallback: If CLI says it's not an asset, use regex-based detection
      // This helps with malformed files that CLI can't parse but are still assets
      console.log(`_isAssetFile: CLI returned false, checking with regex fallback for ${filePath}`);
      const fileExt = this._getFileExtension(filePath);
      const validExtensions = [".sql", ".py", ".yml", ".yaml"];
      
      if (validExtensions.includes(`.${fileExt}`)) {
        const fallbackResult = await isBruinAsset(filePath, validExtensions);
        console.log(`_isAssetFile: Regex fallback result for ${filePath}: ${fallbackResult}`);
        return fallbackResult;
      }
      
      return false;
    } catch (error) {
      console.error(`_isAssetFile: Error checking if file is asset (${filePath}):`, error);
      
      // Last resort fallback: try regex detection even on error
      try {
        const fileExt = this._getFileExtension(filePath);
        const validExtensions = [".sql", ".py", ".yml", ".yaml"];
        
        if (validExtensions.includes(`.${fileExt}`)) {
          const fallbackResult = await isBruinAsset(filePath, validExtensions);
          console.log(`_isAssetFile: Error fallback result for ${filePath}: ${fallbackResult}`);
          return fallbackResult;
        }
      } catch (fallbackError) {
        console.error(`_isAssetFile: Fallback also failed for ${filePath}:`, fallbackError);
      }
      
      return false;
    }
  }

  private async _isInAssetsFolder(filePath: string): Promise<boolean> {
    const normalizedPath = this._normalizePath(filePath);
    const isInAssets = normalizedPath.includes("/assets/");
    console.log(`_isInAssetsFolder: Path ${filePath} in assets folder: ${isInAssets}`);
    return isInAssets;
  }

  private _normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/").toLowerCase();
  }

  private _getFileExtension(filePath: string): string {
    const parts = filePath.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  }

  private async _convertToAsset(filePath: string): Promise<void> {
    const fileExt = this._getFileExtension(filePath);

    try {
      console.log("_convertToAsset: Starting conversion for", filePath);
      
      // First, clear the convert message immediately to provide user feedback
      this._panel.webview.postMessage({
        command: "clear-convert-message",
        isAsset: false,
        filePath: filePath
      });

      if (fileExt === "yml" || fileExt === "yaml") {
        // For YAML files, rename to *.asset.yml
        const newPath = filePath.replace(`.${fileExt}`, `.asset.${fileExt}`);
        console.log("_convertToAsset: Renaming", filePath, "to", newPath);
        
        await workspace.fs.rename(Uri.file(filePath), Uri.file(newPath), { overwrite: false });

        // Update the rendered document and wait a bit for file system to settle
        this._lastRenderedDocumentUri = Uri.file(newPath);
        
        // Give file system time to settle before checking asset status
        setTimeout(async () => {
          console.log("_convertToAsset: Parsing converted asset", newPath);
          parseAssetCommand(this._lastRenderedDocumentUri!);
          
          // Trigger asset detection to ensure UI is updated correctly
          await this._handleAssetDetection(this._lastRenderedDocumentUri!);
        }, 300);
        
      } else if (fileExt === "py" || fileExt === "sql") {
        // For Python/SQL files, call convert command
        console.log("_convertToAsset: Converting", filePath, "using CLI command");
        convertFileToAssetCommand(this._lastRenderedDocumentUri);
        
        // Give conversion time to complete before re-checking
        setTimeout(async () => {
          await this._handleAssetDetection(this._lastRenderedDocumentUri!);
        }, 500);
      }
    } catch (error) {
      console.error("_convertToAsset: Error converting to asset:", error);
      this._panel.webview.postMessage({
        command: "conversion-error",
        error: `Failed to convert file: ${error}`,
      });
    }
  }
  private _checkboxState: { [key: string]: boolean } = {};
}
