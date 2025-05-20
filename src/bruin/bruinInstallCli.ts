import * as vscode from "vscode";
import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import { getBruinExecutablePath } from "../providers/BruinExecutableService";
import { compareVersions, findGitBashPath, getBruinVersion } from "./bruinUtils";
import * as fs from "fs";
import path = require("path");

const execAsync = promisify(exec);
const fsAccessAsync = promisify(fs.access);

export class BruinInstallCLI {
  private platform: string;
  private scriptPathSpecificVersion =
    "https://raw.githubusercontent.com/bruin-data/bruin/main/install.sh";
  private scriptPath =
    "https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh";

  constructor() {
    this.platform = os.platform();
  }

  private async executeCommand(command: string): Promise<void> {
    const workingDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

     let shellExec: vscode.ShellExecution;
    if (this.platform === "win32") {
      const gitBashPath = findGitBashPath();
      if (!gitBashPath) {
        throw new Error("Git Bash not found. Please install Git.");
      }
      // Use Git Bash to execute the command and ensure exit code is propagated
      shellExec = new vscode.ShellExecution(
        gitBashPath,
        ["-c", `${command}; exit $?`], 
        { cwd: workingDir }
      );
    } else {
      shellExec = new vscode.ShellExecution(`${command}; exit $?`, {
        cwd: workingDir,
      });
    }

    const task = new vscode.Task(
      { type: "shell" },
      vscode.TaskScope.Workspace,
      "Bruin Install/Update",
      "bruin",
      shellExec
    );

    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Shared,
      showReuseMessage: true,
      close: true,
    };

    return new Promise<void>((resolve, reject) => {
      const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (e.execution.task.name === "Bruin Install/Update") {
          disposable.dispose();
          const installStatus = await this.checkBruinCliInstallation();

          if (e.exitCode === 0 || installStatus.installed) {
            if (e.exitCode !== 0) {
              vscode.window.showWarningMessage(
                "Bruin CLI installed, but couldn't update PATH. Restart your shell or add it manually."
              );
            }
            resolve();
          } else {
            reject(new Error(`Failed to install/update Bruin CLI (exit code ${e.exitCode})`));
          }
        }
      });

      vscode.tasks.executeTask(task);
    });
  }


  private async getCommand(isUpdate: boolean, version?: string): Promise<string> {
    console.debug("getCommand called with", { isUpdate, version });
    let currentScriptPath = this.scriptPath;
    if (version) {
        currentScriptPath = this.scriptPathSpecificVersion;
    }
    const specificVersion = version ? ` v${version}` : "";

    return `curl -LsSL ${currentScriptPath} | sh -s --${specificVersion}`;
  }

  public async getBruinCliVersion(): Promise<string> {
    const versionInfo = await getBruinVersion();
    if (!versionInfo) {
      throw new Error("Failed to get Bruin CLI version");
    }
    return versionInfo.version;
  }

  public async checkBruinCLIVersion(): Promise<boolean> {
    const versionInfo = await getBruinVersion();
    if (!versionInfo) {
      throw new Error("Failed to get version info");
    }

    return !compareVersions(versionInfo.version, versionInfo.latest);
  }

  public async installBruinCli(onDone?: () => void): Promise<void> {
    const installCommand = await this.getCommand(false);
    console.log("installBruinCli:", { installCommand });
    await this.executeCommand(installCommand);

    if (onDone) {
      onDone();
    }
  }

  public async updateBruinCli(version?: string, onDone?: () => void): Promise<void> {
    const updateCommand = await this.getCommand(true, version);
    await this.executeCommand(updateCommand);

    if (onDone) {
      onDone(); // Notify the caller
    }
  }

  public async checkBruinCliInstallation(): Promise<{
    installed: boolean;
    isWindows: boolean;
    gitAvailable: boolean;
  }> {
    let installed = false;
    let gitAvailable = false;
    let bruinExecutable = getBruinExecutablePath();
    try {
      await execAsync(`${bruinExecutable} --version`);
      installed = true;
    } catch (error) {
      console.log("Bruin CLI --version command failed:", error);
      try {
        if (this.platform !== "win32") {
          const { stdout } = await execAsync(`which ${bruinExecutable}`);
          bruinExecutable = stdout.trim();
        }
        await fsAccessAsync(bruinExecutable, fs.constants.X_OK);
        installed = true;
      } catch (error) {
        console.log("Error checking Bruin CLI executable permissions:", error);
        installed = false;
      }
    }

    if (this.platform === "win32") {
      try {
        await execAsync("git --version");
        gitAvailable = true;
      } catch {
        gitAvailable = false;
      }
    } else {
      gitAvailable = true;
    }

    return {
      installed,
      isWindows: this.platform === "win32",
      gitAvailable,
    };
  }
}