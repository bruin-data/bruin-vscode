import * as vscode from 'vscode';
import { BruinBlockDetector } from '../utils/bruinBlockDetector';

export class QueryValidator {

    /**
     * Validate query parameters and return diagnostics for multi-line queries
     */
    public validateQuery(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();

        if (document.languageId === 'yaml') {
            return this.validateYamlContent(text, 0, diagnostics);
        } else if (document.languageId === 'sql') {
            return this.validateSqlBruinBlocks(text, diagnostics);
        } else if (document.languageId === 'python') {
            return this.validatePythonBruinBlocks(text, diagnostics);
        }

        return diagnostics;
    }

    /**
     * Extract and validate Bruin blocks from SQL files
     */
    private validateSqlBruinBlocks(text: string, diagnostics: vscode.Diagnostic[]): vscode.Diagnostic[] {
        const blocks = BruinBlockDetector.extractSqlBruinBlocks(text);

        for (const block of blocks) {
            this.validateYamlContent(block.content, block.startLine, diagnostics);
        }

        return diagnostics;
    }

    /**
     * Extract and validate Bruin blocks from Python files
     */
    private validatePythonBruinBlocks(text: string, diagnostics: vscode.Diagnostic[]): vscode.Diagnostic[] {
        const blocks = BruinBlockDetector.extractPythonBruinBlocks(text);

        for (const block of blocks) {
            this.validateYamlContent(block.content, block.startLine, diagnostics);
        }

        return diagnostics;
    }

    /**
     * Validate YAML content for query parameter issues
     */
    private validateYamlContent(text: string, lineOffset: number, diagnostics: vscode.Diagnostic[]): vscode.Diagnostic[] {
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            const queryMatch = line.match(/^(\s*)query:(\s*)(.*)$/);

            if (queryMatch) {
                const indentation = queryMatch[1];
                const spaceAfterColon = queryMatch[2];
                const queryContent = queryMatch[3].trim();

                if (spaceAfterColon.length > 0 && queryContent.match(/^[|>][-+]?\s*$/)) {
                    continue;
                }

                let queryLineCount = 1;
                const queryIndentLevel = indentation.length;

                // Count subsequent lines that are part of this query
                // A line belongs to the query if its indentation is greater than the query: line
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];

                    // Skip empty lines
                    if (nextLine.trim() === '') {
                        continue;
                    }

                    // Check indentation - if it's less than or equal to query: indent, we've left the query block
                    const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;
                    if (nextIndent <= queryIndentLevel) {
                        break;
                    }

                    queryLineCount++;
                }

                // If query spans 5+ lines, suggest using pipe operator
                if (queryLineCount >= 7) {
                    const actualLineNumber = lineOffset + i;
                    const range = new vscode.Range(actualLineNumber, 0, actualLineNumber, line.length);
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        `Multi-line query (${queryLineCount} lines) should use 'query: |' (with space before pipe) to prevent YAML parsing issues with inline comments (--).`,
                        vscode.DiagnosticSeverity.Warning
                    );
                    diagnostic.code = 'bruin-multiline-query';
                    diagnostics.push(diagnostic);
                }
            }
        }

        return diagnostics;
    }
}
