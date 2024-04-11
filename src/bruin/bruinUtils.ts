import { BRUIN_RUN_SQL_COMMAND, BRUIN_WHICH_COMMAND } from "../constants";

// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
export const isBruinBinaryAvailable = (): boolean => {
  try {
    let output = child_process.execSync(BRUIN_WHICH_COMMAND);
    console.log(output.toString());

    if (!output) {
      throw new Error("Bruin is not installed");
    }
  } catch (e) {
    console.log(e);
    return false;
  }
  return true;
};

export const buildCommand = (cliCommand: string): string => {
  switch (process.platform) {
    case "win32":
      return `cmd.exe /c bruin.exe ${cliCommand}`;
    default:
      return `bruin ${cliCommand}`;
  }
};

export const bruinWorkspaceDirectory = (fsPath: string): string | undefined => {
  let dirname = fsPath;
  let iteration = 0;
  const maxIterations = 100;

  const bruinRootFileNames = [".bruin.yaml", ".bruin.yml"];

  if (fs.statSync(fsPath).isFile()) {
    dirname = path.dirname(dirname);
  }
  do {
    for (const fileName of bruinRootFileNames) {
      const bruinWorkspace = path.join(dirname, fileName);
      try {
        fs.accessSync(bruinWorkspace, fs.constants.F_OK);
        return dirname;
      } catch (err) {
        // do nothing
      }
    }
    dirname = path.dirname(dirname);
  } while (++iteration < maxIterations && dirname !== "" && dirname !== "/");

  return undefined;
};

export const runInIntegratedTerminal= async(assetPath: string, workingDir: string | undefined, flags?: string) =>{
  const command = `bruin ${BRUIN_RUN_SQL_COMMAND} ${flags} ${assetPath}`;

  const terminalName = "Bruin Terminal";
  let terminal = vscode.window.terminals.find(t => t.name === terminalName);
  if (!terminal) {
      terminal = vscode.window.createTerminal({ cwd: workingDir, name: terminalName});
  }
  terminal.show(true); 
  terminal.sendText(command);
  await new Promise(resolve => setTimeout(resolve, 1000));
};