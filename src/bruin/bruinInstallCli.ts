import * as vscode from "vscode";
import * as os from 'os';

export class BruinInstallCLI {
  private isWindows: boolean;

  constructor() {
    this.isWindows = os.platform() === 'win32';
  }

  private getInstallCommand(): string {
    return this.isWindows
      ? 'go install github.com/bruin-data/bruin@latest'
      : 'brew install bruin';
  }

  private getUpdateCommand(): string {
    return this.isWindows
      ? 'go install github.com/bruin-data/bruin@latest'
      : 'brew upgrade bruin';
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