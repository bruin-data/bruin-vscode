import * as vscode from "vscode";
import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import { getDefaultBruinExecutablePath } from "../extension/configuration";
import { compareVersions, createIntegratedTerminal } from "./bruinUtils";

const execAsync = promisify(exec);

export class BruinInstallCLI {
  private platform: string;
  private scriptPath =
    "https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh";

  constructor() {
    this.platform = os.platform();
  }

  private async executeCommand(command: string): Promise<void> {
    const workingDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const terminal = await createIntegratedTerminal(workingDir);
    console.log("executeCommand:", { command });
    console.log("terminal:", { terminal });
    terminal.show(true);
    terminal.sendText(command);
  }

  private async getCommand(isUpdate: boolean): Promise<string> {
    let command = "";
    if (os.platform() === "win32") {
      command = "curl -LsSf " + this.scriptPath + " | sh";
    } else {
      command = "curl -LsSL " + this.scriptPath + " | sh";
    }

    return command;
  }

  public async checkBruinCLIVersion(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const bruinExecutable = getDefaultBruinExecutablePath();
      exec(`${bruinExecutable} version -o json`, (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing command: ${stderr}`);
          return;
        }

        try {
          const output = JSON.parse(stdout.trim());
          const currentVersion = output.version;
          const latestVersion = output.latest;

          const isUpToDate = compareVersions(currentVersion, latestVersion);
          resolve(isUpToDate);
        } catch (parseError) {
          reject("Failed to parse version information");
        }
      });
    });
  }

  public async installBruinCli(): Promise<void> {
    const installCommand = await this.getCommand(false);
    console.log("installBruinCli:", { installCommand });
    await this.executeCommand(installCommand);
  }

  public async updateBruinCli(): Promise<void> {
    const updateCommand = await this.getCommand(true);
    console.log("updateBruinCli:", { updateCommand });
    await this.executeCommand(updateCommand);
  }

  public async installOrUpdate(isInstalled: boolean): Promise<void> {
    if (isInstalled) {
      await this.updateBruinCli();
    } else {
      await this.installBruinCli();
    }
  }
  public async checkBruinCliInstallation(): Promise<{
    installed: boolean;
    isWindows: boolean;
    gitAvailable: boolean;
  }> {
    let installed = false;
    let gitAvailable = false;
    const bruinExecutable = getDefaultBruinExecutablePath();
    try {
      // Check if Bruin CLI is installed
      await execAsync(`${bruinExecutable} --version`);
      installed = true;
    } catch (error) {
      if (error instanceof Error) {
        console.log(`Bruin CLI not installed: ${error.message}`);
      } else {
        console.log(`Bruin CLI not installed: ${String(error)}`);
      }
      installed = false;
    }

    if (this.platform === "win32") {
      try {
        // Check if Git is available on Windows
        await execAsync("git --version");
        gitAvailable = true;
      } catch (error) {
        if (error instanceof Error) {
          console.log(`Git not available: ${error.message}`);
        } else {
          console.log(`Git not available: ${String(error)}`);
        }
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
