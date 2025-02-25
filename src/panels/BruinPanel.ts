import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, workspace } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import {
  BruinValidate,
  bruinWorkspaceDirectory,
  getCurrentPipelinePath,
  runInIntegratedTerminal,
} from "../bruin";
import { getDefaultBruinExecutablePath } from "../extension/configuration";
import * as vscode from "vscode";
import { renderCommandWithFlags } from "../extension/commands/renderCommand";
import { lineageCommand } from "../extension/commands/lineageCommand";
import { parseAssetCommand, patchAssetCommand } from "../extension/commands/parseAssetCommand";
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
  public static readonly viewId = "markdown.preview";
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private _lastRenderedDocumentUri: Uri | undefined;
  private _flags: string = "";

  /**
   * The BruinPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    const iconPath = Uri.joinPath(extensionUri, "img", "bruin-logo-sm128.png");
    panel.iconPath = { light: iconPath, dark: iconPath };

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._disposables.push(
      workspace.onDidChangeTextDocument((editor) => {
        if (editor && editor.document.uri.fsPath.endsWith(".bruin.yml")) {
          getEnvListCommand(this._lastRenderedDocumentUri);
          getConnections(this._lastRenderedDocumentUri);
        }
        if (editor && editor.document.uri) {
          if (editor.document.uri.fsPath === "tasks") {
            return;
          }
          this._lastRenderedDocumentUri = !this.relevantFileExtensions.some((ext) =>
            editor.document.uri.fsPath.endsWith(ext)
          )
            ? this._lastRenderedDocumentUri
            : editor.document.uri;

          //renderCommand(extensionUri);
          renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri?.fsPath);
          lineageCommand(this._lastRenderedDocumentUri);
          parseAssetCommand(this._lastRenderedDocumentUri);
        }
      }),
      window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.uri) {
          if (editor.document.uri.fsPath === "tasks") {
            return;
          }
          this._lastRenderedDocumentUri = !this.relevantFileExtensions.some((ext) =>
            editor.document.uri.fsPath.endsWith(ext)
          )
            ? this._lastRenderedDocumentUri
            : editor.document.uri;

          console.log("Document URI active text editor", this._lastRenderedDocumentUri);

          //renderCommand(extensionUri);
          renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri?.fsPath);
          lineageCommand(this._lastRenderedDocumentUri);
          parseAssetCommand(this._lastRenderedDocumentUri);
        }
      })
    );

    // Ensure initial state is set based on the currently active editor
    if (window.activeTextEditor) {
      this._lastRenderedDocumentUri = window.activeTextEditor.document.uri;
    }
    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Set the last rendered document URI to the current active editor document URI
    this._lastRenderedDocumentUri = window.activeTextEditor?.document.uri;

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
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
    "sql",
    "py",
    "asset.yml",
    "asset.yaml",
    "pipeline.yml",
    "pipeline.yaml",
    ".bruin.yml",
    ".bruin.yaml",
  ];

  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);
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
              getDefaultBruinExecutablePath(),
              workspaceFolder.uri.fsPath
            );

            await validatorAll.validate(workspaceFolder.uri.fsPath);
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

            const bruinWorkspaceDirc = await bruinWorkspaceDirectory(currAssetPath || "");
            const pipelineValidator = new BruinValidate(
              getDefaultBruinExecutablePath(),
              bruinWorkspaceDirc || ""
            );

            try {
              // if the promess is rejected, the error will be catched and logged
              await pipelineValidator.validate(currentPipelinePath);
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
            const bruinWorkspaceDir = await bruinWorkspaceDirectory(filePath || "");
            console.log(
              "Validating asset:",
              filePath,
              "in workspace:",
              bruinWorkspaceDir,
              "with bruin exec:",
              getDefaultBruinExecutablePath()
            );
            const validator = new BruinValidate(
              getDefaultBruinExecutablePath(),
              bruinWorkspaceDir!!
            );
            await validator.validate(filePath);
            break;
          case "bruin.runSql":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const fPath = this._lastRenderedDocumentUri?.fsPath;
            runInIntegratedTerminal(
              await bruinWorkspaceDirectory(fPath),
              fPath,
              message.payload,
              "bruin"
            );

            setTimeout(() => {
              this._panel.webview.postMessage({
                command: "runCompleted",
                message: "",
              });
            }, 1500);
            break;
          case "bruin.runContinue":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const runPath = this._lastRenderedDocumentUri?.fsPath;
            runInIntegratedTerminal(
              await bruinWorkspaceDirectory(runPath),
              runPath,
              message.payload,
              "bruin"
            );
            break;
          case "bruin.runCurrentPipeline":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            const currfilePath = this._lastRenderedDocumentUri.fsPath;
            const currentPipeline = getCurrentPipelinePath(currfilePath || "");

            runInIntegratedTerminal(
              await bruinWorkspaceDirectory(currfilePath),
              await currentPipeline,
              message.payload,
              "bruin"
            );

            setTimeout(() => {
              this._panel.webview.postMessage({
                command: "runCompleted",
                message: "",
              });
            }, 1500);
            break;
          case "bruin.getAssetLineage":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            lineageCommand(this._lastRenderedDocumentUri);
            break;

          case "bruin.getAssetDetails":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            parseAssetCommand(this._lastRenderedDocumentUri);
            break;

          case "bruin.setAssetDetails":
            const assetData = message.payload;
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            console.log("Setting asset data :", assetData);
            patchAssetCommand(assetData, this._lastRenderedDocumentUri);
            break;

          case "bruin.getEnvironmentsList":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            getEnvListCommand(this._lastRenderedDocumentUri);
            break;
          case "checkBruinCliInstallation":
            this.checkAndUpdateBruinCliStatus();
            break;
          case "checkInstallationsInfo":
            this.checkInstallationsInfo();
            break;
          case "bruinInstallOrUpdateCLI":
            await this.installOrUpdateBruinCli();
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
  private async installOrUpdateBruinCli() {
    try {
      const bruinInstaller = new BruinInstallCLI();
      const { installed } = await bruinInstaller.checkBruinCliInstallation();
      console.log("Bruin CLI installed:", installed);
      await bruinInstaller.installOrUpdate(installed);
      await this.checkAndUpdateBruinCliStatus();
    } catch (error) {
      console.error("Error installing/updating Bruin CLI:", error);
      vscode.window.showErrorMessage("Failed to install/update Bruin CLI. Please try again.");
    }
  }
  private _checkboxState: { [key: string]: boolean } = {};
}
