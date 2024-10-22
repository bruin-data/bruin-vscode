import * as vscode from "vscode";
import * as os from "os";



export class BruinInstallCLI {
  private isWindows: boolean;
  private isMac: boolean;

  constructor() {
    this.isWindows = os.platform() === "win32";
    this.isMac = os.platform() === "darwin";
  }

  private getInstallCommand(): string {
    switch (os.platform()) {
      case this.isWindows: 
        return "powershell -ExecutionPolicy ByPass -c 'irm https://raw.githubusercontent.com/y-bruin/bruin/refs/heads/feature/powershell/powershell.ps1 | iex'";
      case this.isMac:
        return "brew install bruin-data/homebrew-tap/bruin";
      default:
        return "curl -LsSf https://raw.githubusercontent.com/y-bruin/bruin/refs/heads/feature/install_script/install.sh | sh -s -- -b /usr/local/bin";
    }
  }

  private getUpdateCommand(): string {
    switch (os.platform()) {
      case this.isWindows: 
        return "powershell -ExecutionPolicy ByPass -c 'irm https://raw.githubusercontent.com/y-bruin/bruin/refs/heads/feature/powershell/powershell.ps1 | iex'";
      case this.isMac:
        return "brew upgrade bruin";
      default:
        return "curl -LsSf https://raw.githubusercontent.com/y-bruin/bruin/refs/heads/feature/install_script/install.sh | sh -s -- -b /usr/local/bin";
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

  public async install(): Promise<void> {
    const command = this.getInstallCommand();
    await this.executeCommand(command);
    console.log("Bruin CLI installed");
  }

  public async update(): Promise<void> {
    const command = this.getUpdateCommand();
    await this.executeCommand(command);
    console.log("Bruin CLI updated");
  }

  public async installOrUpdate(isInstalled: boolean): Promise<void> {
    if (isInstalled) {
      await this.update();
    } else {
      await this.install();
    }
  }
}
