import { BRUIN_WHICH_COMMAND, BRUIN_WHERE_COMMAND } from "../constants";
import * as vscode from 'vscode';
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const isBruinBinaryAvailable = () : boolean =>{
    const command = process.platform === 'win32' ? BRUIN_WHERE_COMMAND : BRUIN_WHICH_COMMAND;
        try {
            let output = execSync(command);
            if(!output){
                throw new Error('Bruin is not installed');
            }
        } catch(e){
            console.log(e);
            return false;
        }
        return true;
};

// check if there is an active editor
const isEditorActive = () : boolean => {
    // insure that the function always returns a boolean, hence the double negation
    return !!vscode.window.activeTextEditor;
};

const isFileExtensionSQL = (fileName: string) : boolean => {
    fileName = fileName.toLowerCase();
    let fileExtension = fileName.split('.').pop();

    if(fileExtension === "sql"){
        return true;
    }
    return false;
};

const buildCommand = (cliCommand: string): string =>{
switch (process.platform) {
    case 'win32':
        return `cmd.exe /c bruin.exe ${cliCommand}`;
    default:   
        return `bruin ${cliCommand}`;
  }
}

 const bruinWorkspaceDirectory = (fsPath: string) : string | undefined =>{
    let dirname = fsPath;
    let iteration = 0;
    const maxIterations = 100;
  
    const  bruinRootFileNames = [
      ".bruin.yaml",
      ".bruin.yml"
    ];
  
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

const commandExecution = (cliCommand: string, workingDirectory?: string | undefined): Promise<{ stderr?: string; stdout?: string }> => {
    const command =  buildCommand(cliCommand);
  
    return new Promise((resolve) => {
        child_process.exec(command, {
                cwd: workingDirectory,
                timeout: 60000,
            }, (error: child_process.ExecException | null, stdout: string) => {
            if (error) {
                return resolve({ stderr: stdout });
            }
            return resolve({ stdout });
        });
    });
};

const encodeHTML = (str = '') => {
    if (typeof str !== 'string') {
        console.warn('encodeHTML received a non-string input:', str);
        return '';
    }

    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
};

  

export { 
    isBruinBinaryAvailable, 
    isEditorActive, 
    isFileExtensionSQL, 
    commandExecution, 
    encodeHTML, 
    buildCommand,
    bruinWorkspaceDirectory 
    };