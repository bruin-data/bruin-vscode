import { BRUIN_WHICH_COMMAND } from "../constants";
import * as vscode from 'vscode';
const { execSync } = require('child_process');

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


export { isBruinBinaryAvailable, isEditorActive, isFileExtensionSQL };