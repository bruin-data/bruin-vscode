import { BRUIN_RUN_SQL_COMMAND, BRUIN_WHERE_COMMAND, BRUIN_WHICH_COMMAND } from "../constants";

import * as os from "os";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getDefaultBruinExecutablePath, getPathSeparator } from "../extension/configuration";

/**
 * Checks if the Bruin binary is available in the system path.
 * Throws an error if the binary is not found.
 * @returns {boolean} Returns true if the Bruin binary is available, false otherwise.
 */

export const isBruinBinaryAvailable = async (): Promise<boolean> => {
  try {
    const command = process.platform === "win32"? BRUIN_WHERE_COMMAND : BRUIN_WHICH_COMMAND;
    const output = await promisify(exec)(command);
    console.log(output.stdout);

    if (!output.stdout) {
      throw new Error("Bruin is not installed");
    }
  } catch (e) {
    console.log(e);
    return false;
  }
  return true;
};


/**
 * Replaces path separators in a given path string based on the user configuration and platform.
 *
 * @param {string} path - The original path string.
 * @returns {string} The path string with replaced path separators.
 */
export const replacePathSeparator = (path: string): string => {
  const pathSeparator = getPathSeparator();

  if (process.platform === "win32") {
    // Replace all occurrences of '\' with the user-defined path separator
    path = path.replace(/\\/g, pathSeparator);
  }

  return path;
};

/**
 * Locates the Bruin workspace directory by searching for specific Bruin configuration files.
 *
 * @param {string} fsPath - The file system path where the search starts.
 * @returns {string | undefined} The directory path of the Bruin workspace if found, otherwise undefined.
 */

export const bruinWorkspaceDirectory = async (
  fsPath: string,
  bruinRootFileNames = [".bruin.yaml", ".bruin.yml"]
): Promise<string | undefined> => {
  let dirname = fsPath;
  let iteration = 0;
  const maxIterations = 100;

  if ((await fs.promises.stat(fsPath)).isFile()) {
    dirname = path.dirname(dirname);
  }
  do {
    for (const fileName of bruinRootFileNames) {
      const bruinWorkspace = path.join(dirname, fileName);
      try {
        await fs.promises.access(bruinWorkspace, fs.constants.F_OK);
        return dirname.replace(/\\/g, "/");
      } catch (err) {
        // do nothing
      }
    }
    dirname = path.dirname(dirname);
  } while (++iteration < maxIterations && dirname!== "" && dirname!== "/");

  return undefined;
};


const escapeFilePath = (filePath: string): string => {
  // Convert Windows-style paths to Unix-style paths for Git Bash
  if (process.platform === 'win32' && process.env.SHELL?.includes('bash')) {
    filePath = filePath.replace(/\\/g, '/');
    if (filePath[1] === ':') {
      filePath = `/${filePath[0].toLowerCase()}${filePath.slice(2)}`;
    }
  }
  // Escape quotes
  filePath = filePath.replace(/"/g, '\\"');

  // Wrap the path in quotes for safety
  return `"${filePath}"`;
};


export const getCurrentPipelinePath = async (fsPath: string): Promise<string | undefined> => {
  return await bruinWorkspaceDirectory(fsPath, ["pipeline.yaml", "pipeline.yml"]);
};

export const homedir = os.homedir();
export const commonGitPaths = [
  path.join(homedir, "AppData", "Local", "Programs", "Git", "bin", "bash.exe"),
  path.join(homedir, "AppData", "Local", "Programs", "Git", "usr", "bin", "bash.exe"),
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files\\Git\\usr\\bin\\bash.exe"  
];

export const findGitBashPath = (): string | undefined => {
  for (const gitPath of commonGitPaths) {
    if (fs.existsSync(gitPath)) {
      return gitPath;
    }
  } 

  try {
    // Run the 'where git' command to find the Git installation path
    const gitPath = execSync('where git').toString().trim();
    const gitDir = path.dirname(gitPath);

    // Adjust the path to point to the 'bin' directory instead of 'cmd'
    const bashPath = path.join(gitDir, '..', 'bin', 'bash.exe');
    vscode.window.showInformationMessage(`Git Bash path: ${bashPath}`);
    if (fs.existsSync(bashPath)) {
      return bashPath;
    }
  } catch (error) {
    console.error('Error finding Git Bash path:', error);
  }

  return undefined;
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
): Promise<void> => {
  const escapedAssetPath = assetPath? escapeFilePath(assetPath) : "";
  const bruinExecutable = getDefaultBruinExecutablePath();
  let command = "";
  const terminal = await createIntegratedTerminal(workingDir);
  // if termianl is cmd or powershell, use bruin run sql command
  if((terminal.creationOptions as  vscode.TerminalOptions).shellPath?.includes("bash")){
    command = `bruin ${BRUIN_RUN_SQL_COMMAND} ${flags} ${escapedAssetPath}`;
  }
  else{
    command = `${bruinExecutable} ${BRUIN_RUN_SQL_COMMAND} ${flags} ${escapedAssetPath}`;
  }
  terminal.show(true);
  terminal.sendText(command);
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

export const createIntegratedTerminal = async (workingDir: string | undefined): Promise<vscode.Terminal> => {
  const terminalName = "Bruin Terminal";
  let terminal = vscode.window.terminals.find((t) => t.name === terminalName);

  if (!terminal) {
    let shellPath: string | undefined;
    let shellArgs: string[] | undefined;

    // Check for Git Bash or MINGW64 on Windows
    if (process.platform === "win32") {
      shellPath = findGitBashPath();;
      if (!shellPath) {
        // Check for WSL on Windows
        const wslPath = "wsl.exe";
        if (fs.existsSync(wslPath)) {
          shellPath = wslPath;
          shellArgs = ["-d", "Ubuntu"]; // Assuming Ubuntu as the default WSL distro
        } else {
          // Neither Git Bash, MINGW64, nor WSL is found, display an alert to the user
          vscode.window.showWarningMessage(
            "Neither Git Bash, MINGW64, nor Windows Subsystem for Linux (WSL) was found on your system. " +
            "Please install one of them to use the integrated terminal."
          );
          return vscode.window.createTerminal({ name: terminalName }); // Exit the function without creating a terminal
        }
      }
    } else {
      // For non-Windows platforms, use the default shell
      shellPath = undefined;
    }

    const terminalOptions: vscode.TerminalOptions = {
      name: terminalName,
      cwd: workingDir,
      shellPath,
      shellArgs,
    };

    terminal = vscode.window.createTerminal(terminalOptions);
  }

  return terminal;
};

export const compareVersions = (current: string, latest: string): boolean => {
  const currentParts = current.replace('v', '').split('.').map(Number);
  const latestParts = latest.replace('v', '').split('.').map(Number);

  for (let i = 0; i < currentParts.length; i++) {
    if (currentParts[i] < latestParts[i]) {
      return false;
    } else if (currentParts[i] > latestParts[i]) {
      return true;
    }
  }

  return true; // Versions are equal
};
export { BruinInstallCLI } from './bruinInstallCli';