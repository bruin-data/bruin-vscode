import { BRUIN_RUN_SQL_COMMAND, BRUIN_WHERE_COMMAND, BRUIN_WHICH_COMMAND } from "../constants";

// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Checks if the Bruin binary is available in the system path.
 * Throws an error if the binary is not found.
 * @returns {boolean} Returns true if the Bruin binary is available, false otherwise.
 */

export const isBruinBinaryAvailable = (): boolean => {
  try {
    const command = process.platform === "win32" ? BRUIN_WHERE_COMMAND : BRUIN_WHICH_COMMAND;
    let output = child_process.execSync(command);
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

/**
 * Builds the Bruin command based on the platform.
 * @param {string} cliCommand - The Bruin command to be executed in the CLI (e.g., "run", "render").
 * @returns {string} Returns the built Bruin command.
 */
export const buildCommand = (cliCommand: string): string => {
  switch (process.platform) {
    case "win32":
      return `cmd.exe /c bruin.exe ${cliCommand}`;
    default:
      return `bruin ${cliCommand}`;
  }
};

/**
 * Locates the Bruin workspace directory by searching for specific Bruin configuration files.
 *
 * @param {string} fsPath - The file system path where the search starts.
 * @returns {string | undefined} The directory path of the Bruin workspace if found, otherwise undefined.
 */

export const bruinWorkspaceDirectory = (fsPath: string, bruinRootFileNames=[".bruin.yaml", ".bruin.yml"]): string | undefined => {
  let dirname = fsPath;
  let iteration = 0;
  const maxIterations = 100;


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

export const getCurrentPipelinePath = (fsPath: string): string | undefined => {
  return bruinWorkspaceDirectory(fsPath, ["pipeline.yaml", "pipeline.yml"]);
};
/**
 * Runs the Bruin command "run" in the integrated terminal.
 * @param {string} assetPath - The path of the asset to be executed.
 * @param {string | undefined} workingDir - The working directory for the terminal.
 * @param {string} [flags] - Optional flags to be passed to the Bruin command.
 * @returns {Promise<void>} A promise that resolves when the command is executed.
 */

export const runInIntegratedTerminal = async (
  workingDir: string | undefined,
  assetPath?: string,
  flags?: string
) => {
  const command = `bruin ${BRUIN_RUN_SQL_COMMAND} ${flags} ${assetPath}`;

  const terminalName = "Bruin Terminal";
  let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
  if (!terminal) {
    terminal = vscode.window.createTerminal({ cwd: workingDir, name: terminalName });
  }
  terminal.show(true);
  terminal.sendText(command);
  await new Promise((resolve) => setTimeout(resolve, 1000));
};
