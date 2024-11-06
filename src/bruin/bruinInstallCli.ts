import * as vscode from "vscode";
import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export class BruinInstallCLI {
  private platform: string;
  private scriptPath =
    "curl -LsSf https://raw.githubusercontent.com/bruin-data/bruin/refs/heads/main/install.sh | sh";
private static installMethod: string | null = null;
  constructor() {
    this.platform = os.platform();
  }

  private async getInstallMethodFromCommand(command: string): Promise<string> {
    if (command.startsWith("brew")) {
      BruinInstallCLI.installMethod = "brew";
      return "brew";
    } else {
      BruinInstallCLI.installMethod = "script";
      return "script";
    }
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

  private async getInstallCommand(): Promise<string> {
    let command = "";
    switch (this.platform) {
      case "win32":
        // Check for Git Bash, MinGW, or WSL
        try {
          await execAsync("bash --version");
          command = this.scriptPath;
        } catch {
          // Check for Git
          if (await this.isGitAvailable()) {
            console.log(
              "Git is available, but no Bash-like environment detected. Using Git to install."
            );
            command = this.scriptPath;
          } else {
            console.error(
              "Git is required to install Bruin CLI on Windows. Please install Git and try again."
            );
            throw new Error("Git is not installed");
          }
        }
        break;
      case "darwin":
        // Check for Brew, fall back to install script if not available
        try {
          await execAsync("brew --version");
          command = "brew install bruin";
        } catch {
          command = this.scriptPath;
        }
        break;
      case "linux":
        command = this.scriptPath;
        break;
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }

    // Check for curl, fall back to wget if not available
    try {
      await execAsync("which curl");
    } catch {
      command = command.replace("curl", "wget -qO-");
    }

    return command;
  }

  private async getUpdateCommand(): Promise<string> {
    let command = "";
  
    if (BruinInstallCLI.installMethod === "brew") {
      switch (this.platform) {
        case "darwin":
          // First, update the entire Brew system
          command = "brew upgrade && ";
          // Then, specifically update Bruin
          command += "brew upgrade bruin";
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } else {
      switch (this.platform) {
        case "win32":
        case "linux":
          command = this.scriptPath;
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    }
  
    // Check for curl, fall back to wget if not available
    try {
      await execAsync("which curl");
    } catch {
      command = command.replace("curl", "wget -qO-");
    }
  
    return command;
  }

  private async isGitAvailable(): Promise<boolean> {
    if (this.platform === "win32") {
      try {
        await execAsync("git --version");
        return true;
      } catch {
        console.error("Git is required to install Bruin CLI on Windows.");
        return false;
      }
    }
    return true;
  }

  public async installBruinCli(): Promise<void> {
    const installCommand = await this.getInstallCommand();
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
}
