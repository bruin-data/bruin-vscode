import * as vscode from 'vscode';

export class MaterializationValidator {
    
    /**
     * Validate materialization section and return diagnostics
     */
    public validateMaterialization(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        let materializationStart = -1;
        let materializationEnd = lines.length;
        
        // Find materialization section boundaries
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^materialization:\s*$/)) {
                materializationStart = i;
            } else if (materializationStart !== -1 && lines[i].match(/^\w+:\s*$/)) {
                materializationEnd = i;
                break;
            }
        }
        
        if (materializationStart === -1) {
            return diagnostics; // No materialization section found
        }
        
        // Validate the materialization section
        this.validateIndentation(document, lines, materializationStart, materializationEnd, diagnostics);
        this.validateRequiredFields(document, lines, materializationStart, materializationEnd, diagnostics);
        
        return diagnostics;
    }
    
    /**
     * Validate indentation in materialization section
     */
    private validateIndentation(
        document: vscode.TextDocument,
        lines: string[],
        start: number,
        end: number,
        diagnostics: vscode.Diagnostic[]
    ): void {
        for (let i = start + 1; i < end; i++) {
            const line = lines[i];
            if (line.trim() === '') continue; // Skip empty lines
            
            // Check if line starts with proper indentation (2 spaces for properties, 4+ for array items)
            const hasCorrectPropertyIndent = line.match(/^  \w+:/);
            const hasCorrectArrayIndent = line.match(/^    -/);
            const hasAnyIndent = line.match(/^\s/);
            
            if (!hasAnyIndent) {
                // Line should be indented but isn't
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'Expected indentation for materialization property',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            } else if (!hasCorrectPropertyIndent && !hasCorrectArrayIndent && line.match(/^\s+\w+:/)) {
                // Line has indentation but not the correct amount
                const range = new vscode.Range(i, 0, i, line.indexOf(line.trim()));
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'Incorrect indentation. Use 2 spaces for materialization properties',
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostics.push(diagnostic);
            }
        }
    }
    
    /**
     * Validate required fields based on strategy
     */
    private validateRequiredFields(
        document: vscode.TextDocument,
        lines: string[],
        start: number,
        end: number,
        diagnostics: vscode.Diagnostic[]
    ): void {
        let hasType = false;
        let strategy: string | null = null;
        let hasIncrementalKey = false;
        let hasTimeGranularity = false;
        let typeLineIndex = -1;
        let strategyLineIndex = -1;
        
        // Parse materialization section
        for (let i = start + 1; i < end; i++) {
            const line = lines[i];
            
            const typeMatch = line.match(/^\s*type:\s*(\w+)/);
            if (typeMatch) {
                hasType = true;
                typeLineIndex = i;
            }
            
            const strategyMatch = line.match(/^\s*strategy:\s*([a-zA-Z_+]+)/);
            if (strategyMatch) {
                strategy = strategyMatch[1];
                strategyLineIndex = i;
            }
            
            if (line.match(/^\s*incremental_key:/)) {
                hasIncrementalKey = true;
            }
            
            if (line.match(/^\s*time_granularity:/)) {
                hasTimeGranularity = true;
            }
        }
        
        // Validate type is present
        if (!hasType) {
            const range = new vscode.Range(start, 0, start, lines[start].length);
            const diagnostic = new vscode.Diagnostic(
                range,
                'Materialization section requires a "type" field',
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
        }
        
        // Validate strategy requirements
        if (strategy) {
            const strategiesRequiringIncrementalKey = [
                'delete+insert', 'merge', 'time_interval', 'scd2_by_time', 'scd2_by_column'
            ];
            
            if (strategiesRequiringIncrementalKey.includes(strategy) && !hasIncrementalKey) {
                const range = new vscode.Range(strategyLineIndex, 0, strategyLineIndex, lines[strategyLineIndex].length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Strategy "${strategy}" requires an "incremental_key" field`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            }
            
            if (strategy === 'time_interval' && !hasTimeGranularity) {
                const range = new vscode.Range(strategyLineIndex, 0, strategyLineIndex, lines[strategyLineIndex].length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Strategy "time_interval" requires a "time_granularity" field`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            }
        }
    }
}