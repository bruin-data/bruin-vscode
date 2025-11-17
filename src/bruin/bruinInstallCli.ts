import * as vscode from "vscode";
import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import { getBruinExecutablePath } from "../providers/BruinExecutableService";
import { parseVersion, versionGte, findGitBashPath, getBruinVersion } from "./bruinUtils";
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
  
    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      'Bruin Install/Update',
      'bruin',
      new vscode.ShellExecution(command, { cwd: workingDir })
    );
  
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Shared,
      showReuseMessage: true,
      close: false,
    };
  
    return new Promise<void>((resolve, reject) => {
      const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution.task.name === 'Bruin Install/Update') {
          disposable.dispose();
          if (e.exitCode === 0) {
            resolve();
          } else {
            reject(new Error(`Bruin install failed with exit code ${e.exitCode}`));
          }
        }
      });
  
      vscode.tasks.executeTask(task);
    });
  }

  private async getCommand(isUpdate: boolean, version?: string): Promise<string> {
    console.debug("getCommand called with", { isUpdate, version });
    this.scriptPath = version ? this.scriptPathSpecificVersion : this.scriptPath;
    const specificVersion = version ? ` v${version}` : "";
    if (os.platform() === "win32") {
      const gitBashPath = findGitBashPath();

      if (!gitBashPath) {
        throw new Error("Git Bash not found. Please install Git or configure the Git Bash path in settings.");
      }

      const terminalProfile = this.getTerminalProfile();
      if (terminalProfile && terminalProfile.toLowerCase().includes("bash")) {
        return `curl -LsSL ${this.scriptPath} | sh -s --${specificVersion}`;
      } else {
        const tempDir = os.tmpdir();
        const batchFilePath = path.join(tempDir, 'bruin-install.bat');

        const batchContent =
          '@echo off\r\n' +
          `"${gitBashPath}" -c "curl -LsSL ${this.scriptPath} | sh -s --${specificVersion}"\r\n`;

        fs.writeFileSync(batchFilePath, batchContent);
        return batchFilePath;
      }
    } else {
      return `curl -LsSL ${this.scriptPath} | sh -s --${specificVersion}`;
    }
  }

  private getTerminalProfile(): string | undefined {
    const config = vscode.workspace.getConfiguration('terminal.integrated.defaultProfile');
    return config.get<string>('windows');
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
  
    const currentVersion = parseVersion(versionInfo.version);
    const latestVersion = parseVersion(versionInfo.latest);
    return versionGte(currentVersion, latestVersion);
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
      // Check if Bruin CLI is installed by running the --version command
      await execAsync(`${bruinExecutable} --version`);
      installed = true;
    } catch (error) {
      // If the --version command fails, check if the executable file exists
      console.log("Bruin CLI --version command failed:", error);
      // If the --version command fails, check if the executable file exists
      try {
        if (this.platform !== "win32") {
          // Use 'which' command to find the full path of the executable on Unix-based systems
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
        // Check if Git is available on Windows
        await execAsync("git --version");
        gitAvailable = true;
      } catch {
        gitAvailable = false;
      }
    } else {
      // On non-Windows platforms, assume Git is available if Bruin CLI is installed
      gitAvailable = true;
    }

    return {
      installed,
      isWindows: this.platform === "win32",
      gitAvailable,
    };
  }
}