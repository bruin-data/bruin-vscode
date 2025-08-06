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
        this.validateRequiredFields(document, lines, materializationStart, materializationEnd, diagnostics);
        
        return diagnostics;
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
        
        
        // Validate strategy requirements
        if (strategy) {
            const strategiesRequiringIncrementalKey = [
                'delete+insert', 'time_interval', 'scd2_by_time'
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