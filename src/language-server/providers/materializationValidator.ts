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
        
        if (materializationStart !== -1) {
            // Validate the materialization section
            this.validateRequiredFields(document, lines, materializationStart, materializationEnd, diagnostics);
        }
        
        // Also validate interval_modifiers section
        this.validateIntervalModifiers(document, lines, diagnostics);
        
        // Check for invalid top-level "default:" with interval_modifiers
        this.validateTopLevelDefault(document, lines, diagnostics);
        
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

    /**
     * Validate interval_modifiers section to prevent invalid "default:" nesting
     */
    private validateIntervalModifiers(
        document: vscode.TextDocument,
        lines: string[],
        diagnostics: vscode.Diagnostic[]
    ): void {
        let intervalModifiersStart = -1;
        let intervalModifiersEnd = lines.length;
        
        // Find interval_modifiers section boundaries
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^\s*interval_modifiers:\s*$/)) {
                intervalModifiersStart = i;
            } else if (intervalModifiersStart !== -1 && lines[i].match(/^\w+:\s*$/)) {
                intervalModifiersEnd = i;
                break;
            }
        }
        
        if (intervalModifiersStart === -1) {
            return; // No interval_modifiers section found
        }
        
        // Check for invalid "default:" usage within interval_modifiers
        for (let i = intervalModifiersStart + 1; i < intervalModifiersEnd; i++) {
            const line = lines[i];
            
            // Check for "default:" key which is invalid
            if (line.match(/^\s+default:\s*$/)) {
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'Invalid "default:" key in interval_modifiers. Use "start:" and "end:" directly.',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            }
            
            // Check for other invalid keys (anything that's not start or end)
            const invalidKeyMatch = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*$/);
            if (invalidKeyMatch && !['start', 'end'].includes(invalidKeyMatch[1])) {
                const range = new vscode.Range(i, 0, i, line.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Invalid key "${invalidKeyMatch[1]}" in interval_modifiers. Only "start" and "end" are allowed.`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            }
            
            // Stop if we hit another top-level property
            if (line.match(/^\w+:\s*$/)) {
                break;
            }
        }
    }

    /**
     * Validate against invalid top-level "default:" usage
     */
    private validateTopLevelDefault(
        document: vscode.TextDocument,
        lines: string[],
        diagnostics: vscode.Diagnostic[]
    ): void {
        let defaultStart = -1;
        let defaultEnd = lines.length;
        
        // Find top-level default section
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^default:\s*$/)) {
                defaultStart = i;
            } else if (defaultStart !== -1 && lines[i].match(/^\w+:\s*$/)) {
                defaultEnd = i;
                break;
            }
        }
        
        if (defaultStart === -1) {
            return; // No default section found
        }
        
        // Check if interval_modifiers is under default section
        for (let i = defaultStart + 1; i < defaultEnd; i++) {
            const line = lines[i];
            
            if (line.match(/^\s+interval_modifiers:\s*$/)) {
                const range = new vscode.Range(defaultStart, 0, defaultStart, lines[defaultStart].length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'Invalid "default:" section. interval_modifiers should be at the top level, not nested under "default:".',
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
                break;
            }
            
            // Stop if we hit another top-level property
            if (line.match(/^\w+:\s*$/)) {
                break;
            }
        }
    }
}