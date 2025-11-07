import * as vscode from 'vscode';

export class TagValidator {
    
    /**
     * Validate tags section and return diagnostics for indentation issues
     */
    public validateTags(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        let tagsStart = -1;
        let tagsEnd = lines.length;
        
        // Find tags section boundaries
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^tags:\s*$/)) {
                tagsStart = i;
            } else if (tagsStart !== -1 && lines[i].match(/^\w+:\s*$/)) {
                tagsEnd = i;
                break;
            }
        }
        
        if (tagsStart !== -1) {
            this.validateTagIndentation(document, lines, tagsStart, tagsEnd, diagnostics);
        }
        
        return diagnostics;
    }
    
    /**
     * Validate that tag items are properly indented under tags:
     */
    private validateTagIndentation(
        document: vscode.TextDocument,
        lines: string[],
        start: number,
        end: number,
        diagnostics: vscode.Diagnostic[]
    ): void {
        for (let i = start + 1; i < end; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            
            if (trimmedLine.startsWith('-')) {
                // Get the indentation of this line
                const match = line.match(/^(\s*)-/);
                if (match) {
                    const indentation = match[1];
                    
                    if (indentation.length !== 2) {
                        const range = new vscode.Range(
                            new vscode.Position(i, 0),
                            new vscode.Position(i, line.length)
                        );
                        
                        const diagnostic = new vscode.Diagnostic(
                            range,
                            `Tag items should be indented with 2 spaces under 'tags:'. Expected format:\ntags:\n  - tag_name`,
                            vscode.DiagnosticSeverity.Warning
                        );
                        
                        diagnostic.source = 'bruin-tags';
                        diagnostic.code = 'incorrect-tag-indentation';
                        
                        diagnostics.push(diagnostic);
                    }
                }
            }

            else if (trimmedLine && !trimmedLine.startsWith('#')) {
                break;
            }
        }
    }
}