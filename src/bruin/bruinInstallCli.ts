/* import * as vscode from "vscode";
import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export class BruinInstallCLI {
  private platform: string;
  private scriptPath =
    "curl -LsSf https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh | sh";

  constructor() {
    this.platform = os.platform();
  }

  private async executeCommand(command: string): Promise<void> {
    const terminalName = "Bruin Terminal";
    let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({ name: terminalName });
    }
    terminal.show(true);
    terminal.sendText(command);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async isBrewAvailable(): Promise<boolean> {
    try {
      await execAsync("brew --version");
      return true;
    } catch {
      return false;
    }
  }

  private async isBruinInstalledWithBrew(): Promise<boolean> {
    const brewListOutput = await execAsync("brew list --versions");
    return brewListOutput.stdout.includes("bruin");
  }

  private async getUpdateCommand(): Promise<string> {
    if (this.platform === "darwin") {
      if (await this.isBrewAvailable()) {
        if (await this.isBruinInstalledWithBrew()) {
          return "brew update && brew upgrade bruin";
        } else {
          throw new Error("Bruin not installed with Brew on Mac");
        }
      } else {
        return this.scriptPath;
      }
    } else {
      return this.scriptPath;
    }
  }

  private async getInstallCommand(): Promise<string> {
    if (this.platform === "darwin") {
      if (await this.isBrewAvailable()) {
        return "brew install bruin";
      } else {
        return this.scriptPath;
      }
    } else {
      return this.scriptPath;
    }
  }

  public async installBruinCli(): Promise<void> {
    const installCommand = await this.getInstallCommand();
    console.log("installBruinCli:", { installCommand });
    await this.executeCommand(installCommand);
  }

  public async updateBruinCli(): Promise<void> {
    const updateCommand = await this.getUpdateCommand();
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

    try {
      // Check if Bruin CLI is installed
      await execAsync("bruin --version");
      installed = true;
    } catch {
      installed = false;
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
} */

  import * as vscode from "vscode";
import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import { get } from "http";
import { getDefaultBruinExecutablePath } from "../extension/configuration";

const execAsync = promisify(exec);

export class BruinInstallCLI {
  private platform: string;
  private scriptPath =
    "curl -LsSf https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh | sh";

  constructor() {
    this.platform = os.platform();
  }

  private async executeCommand(command: string): Promise<void> {
    const terminalName = "Bruin Terminal";
    let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({ name: terminalName });
    }
    terminal.show(true);
    terminal.sendText(command);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async getCommand(isUpdate: boolean): Promise<string> {
    let command = this.scriptPath;

    // Check for curl, fall back to wget if not available
    try {
      await execAsync("which curl");
    } catch {
      command = command.replace("curl", "wget -qO-");
    }

    return command;
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
    let bruinExecutable = getDefaultBruinExecutablePath();
    try {
      // Check if Bruin CLI is installed
      await execAsync(`${bruinExecutable} --version`);
      installed = true;
    } catch {
      installed = false;
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