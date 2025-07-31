import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';

export interface BruinBlock {
    start: number;
    end: number;
}

/**
 * Find all Bruin blocks in a document
 * Bruin blocks are defined by slash-star @bruin ... @bruin star-slash comments
 */
export function findBruinBlocks(text: string): BruinBlock[] {
    const blocks: BruinBlock[] = [];
    const bruinStartRegex = /\/\*\s*@bruin/g;
    const bruinEndRegex = /@bruin\s*\*\//g;
    
    let startMatch;
    while ((startMatch = bruinStartRegex.exec(text)) !== null) {
        const start = startMatch.index + startMatch[0].length;
        
        bruinEndRegex.lastIndex = start;
        const endMatch = bruinEndRegex.exec(text);
        
        if (endMatch) {
            const end = endMatch.index;
            blocks.push({ start, end });
        }
    }
    
    return blocks;
}

/**
 * Check if a given position is inside a Bruin block
 */
export function isInBruinBlock(document: TextDocument, position: Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const blocks = findBruinBlocks(text);
    
    return blocks.some(block => offset >= block.start && offset <= block.end);
}