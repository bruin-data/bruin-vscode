import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, workspace } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { BruinValidate, bruinWorkspaceDirectory, runInIntegratedTerminal } from "../bruin";
import { getDefaultBruinExecutablePath } from "../extension/configuration";
import * as vscode from "vscode";
import { renderCommandWithFlags } from "../extension/commands/renderCommand";
import { lineageCommand } from "../extension/commands/lineageCommand";

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
  public static readonly viewType = "vscodebruin:panel";
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
      window.onDidChangeWindowState((state) => {
        renderCommandWithFlags(this._flags);
      }),
      workspace.onDidChangeTextDocument((editor) => {
        if (editor && editor.document.uri) {
          this._lastRenderedDocumentUri = editor.document.uri;
          renderCommandWithFlags(this._flags);
          lineageCommand(this._lastRenderedDocumentUri);
        }
      }),
      window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.uri) {
          this._lastRenderedDocumentUri = editor.document.uri;
          renderCommandWithFlags(this._flags);
          lineageCommand(this._lastRenderedDocumentUri);
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

  public static postMessage(name: string, data: string | { status: string; message: string }) {
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
      const panel = window.createWebviewPanel(this.viewType, "Bruin", column || ViewColumn.Active, {
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
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Bruin Panel</title>
        </head>
        <body>
          <div id="app"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
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
          case "bruin.validate":
            if (!this._lastRenderedDocumentUri) {
              console.error("No active document to validate.");
              return;
            }

            const filePath = this._lastRenderedDocumentUri.fsPath;
            const bruinWorkspaceDir = bruinWorkspaceDirectory(filePath || "");

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
            runInIntegratedTerminal(bruinWorkspaceDirectory(fPath), fPath, message.payload);

            setTimeout(() => {
              this._panel.webview.postMessage({
                command: "runCompleted",
                message: "",
              });
            }, 1500);
            break;
          case "bruin.runAll":
            const workspaceF = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceF) {
              console.error("No workspace folder found.");
              return;
            }
            runInIntegratedTerminal(
              bruinWorkspaceDirectory(workspaceF?.uri.fsPath),
              message.payload
            );

            setTimeout(() => {
              this._panel.webview.postMessage({
                command: "runCompleted",
                message: "",
              });
            }, 1500);
            break;
          case "checkboxChange":
            this._flags = message.payload;
            await renderCommandWithFlags(this._flags, this._lastRenderedDocumentUri?.fsPath);
            break;

          case "bruin.getAssetLineage":
            if (!this._lastRenderedDocumentUri) {
              return;
            }
            this._lastRenderedDocumentUri;
            break;
        }
      },
      undefined,
      this._disposables
    );
  }
}
