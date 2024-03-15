import * as vscode from 'vscode';
import { getLanguageDelimiters } from '../utils/delimiters';


export const bruinFoldingRangeProvider  = (
    document: vscode.TextDocument
) => {

    let ranges : vscode.FoldingRange[] = [];
    
    
    let {startFoldingRegionDelimiter, endFoldingRegionDelimiter} = getLanguageDelimiters(document.languageId);

    let foldingRegionStart = -1;
    for(let i=0; i< document.lineCount; i++){
        let textLine : string = document.lineAt(i).text;
        if(startFoldingRegionDelimiter.test(textLine) && foldingRegionStart === -1){
            foldingRegionStart = i;
        }
        else if(endFoldingRegionDelimiter.test(textLine) && foldingRegionStart !== -1){
            ranges.push(new vscode.FoldingRange(foldingRegionStart, i, vscode.FoldingRangeKind.Region));
        }
    }

return ranges;
};