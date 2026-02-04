import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";
import { getUri } from "../utilities/getUri";
import { RunLogService } from "../bruin/runLogService";
import { bruinWorkspaceDirectory } from "../bruin/bruinUtils";
import { RunSummary } from "../types/runLog";
import { BruinLanguageServer } from "../language-server/bruinLanguageServer";

export class RunHistoryPanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewId = "bruin.runHistoryView";
  public static _view?: vscode.WebviewView;
  private disposables: vscode.Disposable[] = [];
  private fileWatcher?: vscode.FileSystemWatcher;
  private runLogService?: RunLogService;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  dispose() {
    this.fileWatcher?.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    RunHistoryPanel._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getWebviewContent(webviewView.webview);
    this._setWebviewMessageListener(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refreshRuns();
      }
    });

    this.setupFileWatcher();
    this.refreshRuns();
  }

  private async setupFileWatcher() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {return;}

    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    const workspaceRoot = activeFile
      ? await bruinWorkspaceDirectory(activeFile)
      : workspaceFolder.uri.fsPath;

    if (!workspaceRoot) {return;}

    this.runLogService = new RunLogService(workspaceRoot);
    const logsPattern = new vscode.RelativePattern(
      workspaceRoot,
      "logs/runs/**/*.json"
    );

    this.fileWatcher?.dispose();
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(logsPattern);
    this.fileWatcher.onDidCreate(() => this.refreshRuns());
    this.fileWatcher.onDidChange(() => this.refreshRuns());
    this.disposables.push(this.fileWatcher);
  }

  private async refreshRuns() {
    if (!RunHistoryPanel._view) {return;}

    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    if (activeFile) {
      const workspaceRoot = await bruinWorkspaceDirectory(activeFile);
      if (workspaceRoot) {
        this.runLogService = new RunLogService(workspaceRoot);
      }
    }

    if (!this.runLogService) {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        this.runLogService = new RunLogService(workspaceFolder.uri.fsPath);
      }
    }

    if (!this.runLogService) {return;}

    try {
      const runs = await this.runLogService.getAllRuns(50);
      const pipelines = await this.runLogService.getPipelines();
      RunHistoryPanel.postMessage("runs-loaded", { runs, pipelines });
    } catch (error) {
      console.error("Error loading runs:", error);
    }
  }

  private async loadRunDetails(filePath: string) {
    if (!this.runLogService) {return;}

    try {
      const details = await this.runLogService.getRunDetails(filePath);
      if (details) {
        RunHistoryPanel.postMessage("run-details-loaded", { details, filePath });
      }
    } catch (error) {
      console.error("Error loading run details:", error);
    }
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "codicon.css")
    );
    const stylesUri = getUri(webview, this._extensionUri, [
      "webview-ui", "build", "assets", "runHistory.css",
    ]);
    const stylesUriIndex = getUri(webview, this._extensionUri, [
      "webview-ui", "build", "assets", "index.css",
    ]);
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview-ui", "build", "assets", "runHistory.js")
    );
    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="
          default-src 'none';
          img-src ${webview.cspSource} https:;
          script-src 'nonce-${nonce}' ${webview.cspSource};
          style-src ${webview.cspSource} 'unsafe-inline';
          font-src ${webview.cspSource};
        ">
        <link rel="stylesheet" href="${stylesUri}">
        <link rel="stylesheet" href="${stylesUriIndex}">
        <link rel="stylesheet" href="${codiconsUri}">
        <title>Run History</title>
      </head>
      <body>
        <div id="app"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "bruin.refreshRuns":
          await this.refreshRuns();
          break;
        case "bruin.getRunDetails":
          await this.loadRunDetails(message.payload.filePath);
          break;
        case "bruin.filterByPipeline":
          if (this.runLogService && message.payload.pipeline) {
            const runs = await this.runLogService.getRunsForPipeline(
              message.payload.pipeline,
              50
            );
            RunHistoryPanel.postMessage("runs-loaded", {
              runs,
              pipelines: await this.runLogService.getPipelines(),
            });
          } else {
            await this.refreshRuns();
          }
          break;
        case "bruin.openAssetFile":
          await this.openAssetFile(message.payload.assetName, message.payload.runPath);
          break;
        case "bruin.copyRunCommand":
          await this.copyRunCommand(message.payload.cmdline);
          break;
        case "bruin.rerunCommand":
          await this.rerunCommand(message.payload.cmdline);
          break;
      }
    });
  }

  private async openAssetFile(assetName: string, runPath?: string) {
    try {
      let assetPath: string | null = null;
      const languageServer = BruinLanguageServer.getInstance();

      // Use runPath from cmdline as context (most accurate - same pipeline)
      if (runPath) {
        assetPath = await languageServer.findAssetFile(assetName, runPath);
      }

      // Fallback: try with active file
      if (!assetPath) {
        const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (activeFile && (activeFile.endsWith('.sql') || activeFile.endsWith('.py') || activeFile.endsWith('.yml'))) {
          assetPath = await languageServer.findAssetFile(assetName, activeFile);
        }
      }

      if (assetPath) {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(assetPath));
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showWarningMessage(`Could not find file for asset: ${assetName}`);
      }
    } catch (error) {
      vscode.window.showWarningMessage(`Error opening asset: ${assetName}`);
    }
  }

  private async copyRunCommand(cmdline: string[]) {
    if (!cmdline || cmdline.length === 0) {
      vscode.window.showWarningMessage("No command available to copy");
      return;
    }
    try {
      const command = cmdline.join(" ");
      await vscode.env.clipboard.writeText(command);
      vscode.window.showInformationMessage("Run command copied to clipboard");
    } catch (error) {
      console.error("Error copying run command:", error);
      vscode.window.showWarningMessage("Failed to copy run command");
    }
  }

  private async rerunCommand(cmdline: string[]) {
    if (!cmdline || cmdline.length === 0) {
      vscode.window.showWarningMessage("No command available to rerun");
      return;
    }
    try {
      const terminal = vscode.window.createTerminal("Bruin Run");
      terminal.show();
      terminal.sendText(cmdline.join(" "));
    } catch (error) {
      console.error("Error rerunning command:", error);
      vscode.window.showWarningMessage("Failed to rerun command");
    }
  }

  public static postMessage(command: string, payload: any) {
    if (this._view) {
      this._view.webview.postMessage({ command, payload });
    }
  }

  public static notifyNewRun(run: RunSummary) {
    this.postMessage("new-run", { run });
  }
}
