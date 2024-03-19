import { BRUIN_WHICH_COMMAND } from "../constants";
import * as vscode from 'vscode';
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/naming-convention
import * as child_process from 'child_process';

const isBruinBinaryAvailable = () : boolean =>{
    // check if bruin is installed
    // if not, prompt  a message to install    
    try {
        let output = execSync(BRUIN_WHICH_COMMAND);
        console.log(output.toString());

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


const commandExecution = (cliCommand: string, workingDirectory?: string | undefined): Promise<{ stderr?: string; stdout?: string }> => {
    const isWindows = process.platform === 'win32';
    return new Promise((resolve) => {
        child_process.exec(cliCommand, {
                cwd: workingDirectory,
                timeout: 1000,
            }, (error: child_process.ExecException | null, stdout: string) => {
            if (error) {
                return resolve({ stderr: error.message });
            }
            return resolve({ stdout });
        });
    });
};

const encodeHTML = (str: string) => {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  };
  

export { isBruinBinaryAvailable, isEditorActive, isFileExtensionSQL, commandExecution, encodeHTML };