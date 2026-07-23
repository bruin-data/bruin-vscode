import * as vscode from "vscode";
import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import { findGitBashPath } from "./bruinUtils";

const DAC_INSTALL_SCRIPT = "https://getbruin.com/install/dac";
const TASK_NAME = "DAC Install";

/** Shell command that installs (or updates) dac, routed through Git Bash on Windows. */
function installCommand(): string {
  const base = `curl -LsSL ${DAC_INSTALL_SCRIPT} | sh`;
  if (os.platform() !== "win32") {
    return base;
  }
  const gitBashPath = findGitBashPath();
  if (!gitBashPath) {
    throw new Error("Git Bash not found. Install Git or set its path in settings.");
  }
  const profile = vscode.workspace
    .getConfiguration("terminal.integrated.defaultProfile")
    .get<string>("windows");
  if (profile && profile.toLowerCase().includes("bash")) {
    return base;
  }
  const batchFilePath = path.join(os.tmpdir(), "dac-install.bat");
  fs.writeFileSync(batchFilePath, `@echo off\r\n"${gitBashPath}" -c "${base}"\r\n`);
  return batchFilePath;
}

/** Runs the dac install script in a VS Code task; resolves when it exits 0. */
export async function installDac(): Promise<void> {
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const task = new vscode.Task(
    { type: "shell" },
    vscode.TaskScope.Workspace,
    TASK_NAME,
    "dac",
    new vscode.ShellExecution(installCommand(), { cwd })
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    close: false,
  };
  await new Promise<void>((resolve, reject) => {
    const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.name !== TASK_NAME) {
        return;
      }
      disposable.dispose();
      if (e.exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`dac install failed with exit code ${e.exitCode}`));
      }
    });
    vscode.tasks.executeTask(task);
  });
}
