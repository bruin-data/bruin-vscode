import * as vscode from "vscode";
import { bruinWorkspaceDirectory } from "./bruinUtils";

export class BruinInstallCLI {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'brew upgrade bruin' command string on macOS and Linux, and '' on Windows.
   */
  protected bruinCommand(): string {
    return "brew upgrade bruin";
  }

  /**
   * Installs or updates the Bruin CLI.
   *
   * @returns {Promise<void>} A promise that resolves when the installation or update process completes.
   */
  public async installOrUpdate(): Promise<void> {
    
    const terminalName = "Bruin Terminal";
    let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({  name: terminalName });
    }
    terminal.show(true);
    terminal.sendText(this.bruinCommand());
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Bruin CLI installed or updated");
  }
}
