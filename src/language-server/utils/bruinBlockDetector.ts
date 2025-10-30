import * as vscode from 'vscode';

/**
 * Utility class for detecting Bruin blocks in SQL and Python files
 */
export class BruinBlockDetector {
    /**
     * Check if position is inside a Bruin block
     */
    public static isInBruinBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const offset = document.offsetAt(position);
        const languageId = document.languageId;
        const fileName = document.fileName;

        if (languageId === 'sql') {
            return this.isInSqlBruinBlock(text, offset);
        } else if (languageId === 'python') {
            return this.isInPythonBruinBlock(text, offset);
        } else if (fileName.endsWith('.asset.yml') || fileName.endsWith('.task.yml')) {
            return true;
        }

        // For other file types, don't allow completions
        return false;
    }

    /**
     * Check if position is inside SQL Bruin block
     */
    private static isInSqlBruinBlock(text: string, offset: number): boolean {
        // Find all SQL Bruin blocks: /* @bruin ... @bruin */
        const startPattern = /\/\*\s*@bruin/g;
        const endPattern = /@bruin\s*\*\//g;
        
        let startMatch;
        let endMatch;
        const blocks: Array<{start: number, end: number}> = [];
        
        // Find start positions
        while ((startMatch = startPattern.exec(text)) !== null) {
            const startPos = startMatch.index;
            
            // Find corresponding end position
            endPattern.lastIndex = startPos;
            endMatch = endPattern.exec(text);
            
            if (endMatch) {
                blocks.push({
                    start: startPos,
                    end: endMatch.index + endMatch[0].length
                });
            }
        }
        
        // Check if offset is within any block
        return blocks.some(block => offset >= block.start && offset <= block.end);
    }

    /**
     * Check if position is inside Python Bruin block
     */
    private static isInPythonBruinBlock(text: string, offset: number): boolean {
        // Find all Python Bruin blocks: """@bruin ... @bruin"""
        const startPattern = /"""\s*@bruin/g;
        const endPattern = /@bruin\s*"""/g;
        
        let startMatch;
        let endMatch;
        const blocks: Array<{start: number, end: number}> = [];
        
        // Find start positions
        while ((startMatch = startPattern.exec(text)) !== null) {
            const startPos = startMatch.index;
            
            // Find corresponding end position
            endPattern.lastIndex = startPos;
            endMatch = endPattern.exec(text);
            
            if (endMatch) {
                blocks.push({
                    start: startPos,
                    end: endMatch.index + endMatch[0].length
                });
            }
        }
        
        // Check if offset is within any block
        return blocks.some(block => offset >= block.start && offset <= block.end);
    }

    /**
     * Extract all Bruin blocks from SQL files with their content and positions
     */
    public static extractSqlBruinBlocks(text: string): Array<{content: string, startLine: number, endLine: number}> {
        const blocks: Array<{content: string, startLine: number, endLine: number}> = [];
        const bruinBlockPattern = /\/\*\s*@bruin\n([\s\S]*?)\n@bruin\s*\*\//g;
        let match;

        while ((match = bruinBlockPattern.exec(text)) !== null) {
            const blockContent = match[1];
            const blockStartOffset = match.index + match[0].indexOf('\n') + 1;
            const blockEndOffset = match.index + match[0].lastIndexOf('\n');
            const blockStartLine = text.substring(0, blockStartOffset).split('\n').length - 1;
            const blockEndLine = text.substring(0, blockEndOffset).split('\n').length - 1;

            blocks.push({
                content: blockContent,
                startLine: blockStartLine,
                endLine: blockEndLine
            });
        }

        return blocks;
    }

    /**
     * Extract all Bruin blocks from Python files with their content and positions
     */
    public static extractPythonBruinBlocks(text: string): Array<{content: string, startLine: number, endLine: number}> {
        const blocks: Array<{content: string, startLine: number, endLine: number}> = [];
        const bruinBlockPattern = /"""\s*@bruin\n([\s\S]*?)\n@bruin\s*"""/g;
        let match;

        while ((match = bruinBlockPattern.exec(text)) !== null) {
            const blockContent = match[1];
            const blockStartOffset = match.index + match[0].indexOf('\n') + 1;
            const blockEndOffset = match.index + match[0].lastIndexOf('\n');
            const blockStartLine = text.substring(0, blockStartOffset).split('\n').length - 1;
            const blockEndLine = text.substring(0, blockEndOffset).split('\n').length - 1;

            blocks.push({
                content: blockContent,
                startLine: blockStartLine,
                endLine: blockEndLine
            });
        }

        return blocks;
    }
}