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
  escapeFilePath,
  runBruinCommand,


} from "../bruin";
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
import { openGlossary } from "../bruin/bruinGlossaryUtility";
import { QueryPreviewPanel } from "./QueryPreviewPanel";
import { getBruinExecutablePath } from "../providers/BruinExecutableService";
import path = require("path");
import { isBruinAsset } from "../utilities/helperUtils";

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
  private _disposables: Disposable[] = [];
  private _lastRenderedDocumentUri: Uri | undefined;
  private _flags: string = "";
  private _assetDetectionDebounceTimer: NodeJS.Timeout | undefined;

  /**
   * The BruinPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
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
        console.log("onDidChangeTextDocument", editor);
        if (editor && editor.document.uri.fsPath.endsWith(".bruin.yml")) {
          getEnvListCommand(this._lastRenderedDocumentUri);
          getConnections(this._lastRenderedDocumentUri);
        }
        if (editor && editor.document.uri) {

          this._lastRenderedDocumentUri = editor.document.uri;
          await this._handleAssetDetection(this._lastRenderedDocumentUri);

          renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri?.fsPath);
        }
      }),

      window.onDidChangeActiveTextEditor(async (editor) => {
        console.log("onDidChangeActiveTextEditor", editor);
        if (editor && editor.document.uri) {
          this._lastRenderedDocumentUri = editor.document.uri;

          console.log("Document URI active text editor", this._lastRenderedDocumentUri);
          
          // Send current file path to webview
          this._panel.webview.postMessage({
            command: "file-changed",
            filePath: this._lastRenderedDocumentUri.fsPath,
          });
          
          await this._handleAssetDetection(this._lastRenderedDocumentUri);
          renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri?.fsPath);
        }
      }),
      vscode.workspace.onDidRenameFiles((e) => {
        e.files.forEach((file) => {
          if (this._lastRenderedDocumentUri?.fsPath === file.oldUri.fsPath) {
            this._lastRenderedDocumentUri = file.newUri;
            console.log(`File renamed from ${file.oldUri.fsPath} to ${file.newUri.fsPath}`);
          }
        });
      })
    );

    if (window.activeTextEditor) {
      this._lastRenderedDocumentUri = window.activeTextEditor.document.uri;
    }
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
    this._lastRenderedDocumentUri = window.activeTextEditor?.document.uri;
    this._setWebviewMessageListener(this._panel.webview);
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
    const column = window.activeTextEditor ? ViewColumn.Beside : undefined;

    if (this.currentPanel) {
      this.currentPanel._panel.reveal(column, true);
    } else {
      const panel = window.createWebviewPanel(this.viewId, "Bruin", column || ViewColumn.Active, {
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

  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
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
    });

    webview.onDidReceiveMessage(
      async (message: any) => {
        const command = message.command;
        switch (command) {
          case "bruin.validateAll":
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
              console.error("No workspace folder found.");
              return;
            }

            const validatorAll = new BruinValidate(
              getBruinExecutablePath(),
              workspaceFolder.uri.fsPath
            );

            // Get default exclude tag
            const defaultExcludeTag = getDefaultExcludeTag();
            console.log("Using default exclude tag for validateAll:", defaultExcludeTag);
            await validatorAll.validate(workspaceFolder.uri.fsPath, {}, defaultExcludeTag);
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
              console.log("Using default exclude tag for validateCurrentPipeline:", excludeTag);
              await pipelineValidator.validate(currentPipelinePath, {}, excludeTag);
            } catch (error) {
              console.error("Error validating pipeline:", currentPipelinePath, error);
            }

            break;
          case "checkboxChange":
            this._checkboxState = message.payload.checkboxState;
            this._flags = message.payload.flags;
            await renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri?.fsPath);
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
            console.warn("Getting asset details message in the panel", new Date().toISOString());
            parseAssetCommand(this._lastRenderedDocumentUri);
            console.warn("Finish asset details message in the panel", new Date().toISOString());
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
            const escapedAssetPath = assetPath ? escapeFilePath(assetPath) : ""; 
            const assetWorkspaceDir = await bruinWorkspaceDirectory(assetPath);
            
            const command = [ "patch", "fill-asset-dependencies", escapedAssetPath];
            await runBruinCommand(command, assetWorkspaceDir,);  

            return;

          case "bruin.fillAssetColumn":
            if (!this._lastRenderedDocumentUri) {
              console.error("No active document to fill asset column.");
              this._panel.webview.postMessage({
                command: "fill-columns-response",
                status: "error",
                message: "No active document to fill asset column."
              });
              return;
            }
            
            try {
              const assetPathFillColumn = this._lastRenderedDocumentUri.fsPath;
              const escapedAssetPathFillColumn = assetPathFillColumn ? escapeFilePath(assetPathFillColumn) : ""; 
              const assetWorkspaceDirFillColumn = await bruinWorkspaceDirectory(assetPathFillColumn);

              const commandFillColumn = [ "patch", "fill-columns-from-db", escapedAssetPathFillColumn];
              await runBruinCommand(commandFillColumn, assetWorkspaceDirFillColumn);  

              // Send success response
              this._panel.webview.postMessage({
                command: "fill-columns-response",
                status: "success",
                message: "Columns filled successfully from database."
              });
              
              // Re-parse the asset to update the UI
              parseAssetCommand(this._lastRenderedDocumentUri);
              
            } catch (error) {
              console.error("Error filling columns from DB:", error);
              this._panel.webview.postMessage({
                command: "fill-columns-response",
                status: "error",
                message: `Failed to fill columns from database: ${error}`
              });
            }
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
            this.checkAndUpdateBruinCliStatus();
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
            BruinPanel.postMessage("lastRenderedDocument", {
              status: "success",
              message: this._lastRenderedDocumentUri?.fsPath,
            });
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

    try {
      // Check for config files first (highest priority)
      const isConfigFile =
        filePath.endsWith("pipeline.yml") ||
        filePath.endsWith("pipeline.yaml") ||
        filePath.endsWith(".bruin.yml") ||
        filePath.endsWith(".bruin.yaml");

      if (isConfigFile) {
        console.log("IsAssetDetection : File is a config file", filePath);
        this._panel.webview.postMessage({
          command: "clear-convert-message",
          isAsset: false,
          isConfig: true,
        });
        parseAssetCommand(fileUri);
        return;
      }

      const isAsset = await this._isAssetFile(filePath);
      console.log("IsAssetDetection : File is an asset", filePath, isAsset);
      if (isAsset) {
        this._panel.webview.postMessage({
          command: "clear-convert-message",
          isAsset: true,
        });
        console.log("IsAssetDetection : Sending clear message to the UI for asset:", filePath);
        parseAssetCommand(fileUri);
        return;
      }

      // Only check for conversion if it's NOT an asset and NOT a config file
      const inAssetsFolder = await this._isInAssetsFolder(filePath);
      const fileExt = this._getFileExtension(filePath);
      const isSupportedFileType = ["yml", "yaml", "py", "sql"].includes(fileExt);

      if (inAssetsFolder && isSupportedFileType) {
        this._panel.webview.postMessage({
          command: "non-asset-file",
          showConvertMessage: true,
          fileType: fileExt,
          filePath: filePath,
        });
      } else {
        console.log(
          "IsAssetDetection : File is not an asset but doesn't habve a supported extension or is not in the assets folder",
          filePath,
          inAssetsFolder,
          isSupportedFileType
        );
        this._panel.webview.postMessage({
          command: "non-asset-file",
          showConvertMessage: false,
        });
      }
    } catch (error) {
      console.error("Error in asset detection flow:", error);
    }
  }

  private async _isAssetFile(filePath: string): Promise<boolean> {
    console.log(`_isAssetFile: Checking if file is asset: ${filePath}`);

    if (filePath.endsWith(".asset.yml") || filePath.endsWith(".asset.yaml")) {
      console.log(`_isAssetFile: File identified as asset by extension: ${filePath}`);
      return true;
    }

    try {
      const isAsset = await isBruinAsset(filePath, [".sql", ".py", ".yml", ".yaml"]);
      console.log(`_isAssetFile: Asset check result for ${filePath}: ${isAsset}`);
      return isAsset;
    } catch (error) {
      console.error(`_isAssetFile: Error checking if file is asset (${filePath}):`, error);
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
      if (fileExt === "yml" || fileExt === "yaml") {
        // For YAML files, rename to *.asset.yml
        const newPath = filePath.replace(`.${fileExt}`, `.asset.${fileExt}`);
        await workspace.fs.rename(Uri.file(filePath), Uri.file(newPath), { overwrite: false });

        // Update the rendered document and parse it
        this._lastRenderedDocumentUri = Uri.file(newPath);
        parseAssetCommand(this._lastRenderedDocumentUri);
      } else if (fileExt === "py" || fileExt === "sql") {
        // For Python/SQL files, call convert command
        convertFileToAssetCommand(this._lastRenderedDocumentUri);
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
