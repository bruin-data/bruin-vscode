import * as vscode from 'vscode';

export class MaterializationValidator {
    
    /**
     * Validate materialization section and return diagnostics
     */
    public validateMaterialization(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        // Check if this is a pipeline.yml file
        const isPipelineFile = document.fileName.includes('pipeline.yml') || document.fileName.endsWith('pipeline.yaml');
        
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
        
        // Validate interval_modifiers placement based on file type
        this.validateIntervalModifiers(document, lines, diagnostics, isPipelineFile);
        
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
     * Validate interval_modifiers placement based on file type
     */
    private validateIntervalModifiers(
        document: vscode.TextDocument,
        lines: string[],
        diagnostics: vscode.Diagnostic[],
        isPipelineFile: boolean
    ): void {
        let topLevelIntervalModifiers = -1;
        let intervalModifiersUnderDefault = -1;
        let defaultStart = -1;
        
        // Find top-level interval_modifiers and default section
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.match(/^interval_modifiers:\s*$/)) {
                topLevelIntervalModifiers = i;
            }
            
            if (line.match(/^default:\s*$/)) {
                defaultStart = i;
            }
            
            // Look for interval_modifiers under default
            if (defaultStart !== -1 && line.match(/^\s+interval_modifiers:\s*$/)) {
                intervalModifiersUnderDefault = i;
            }
        }
        
        if (isPipelineFile) {
            // In pipeline.yml: interval_modifiers should be under default
            if (topLevelIntervalModifiers !== -1) {
                const range = new vscode.Range(topLevelIntervalModifiers, 0, topLevelIntervalModifiers, lines[topLevelIntervalModifiers].length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'In pipeline.yml, interval_modifiers should be nested under "default:" section.',
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostics.push(diagnostic);
            }
        } else {
            // In asset files: interval_modifiers should NOT be under default
            if (intervalModifiersUnderDefault !== -1) {
                const range = new vscode.Range(intervalModifiersUnderDefault, 0, intervalModifiersUnderDefault, lines[intervalModifiersUnderDefault].length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    'In asset files, interval_modifiers should be at the top level, not nested under "default:".',
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostics.push(diagnostic);
            }
        }
        
        // Validate content of interval_modifiers regardless of placement
        const intervalModifiersLine = topLevelIntervalModifiers !== -1 ? topLevelIntervalModifiers : intervalModifiersUnderDefault;
        if (intervalModifiersLine !== -1) {
            this.validateIntervalModifiersContent(document, lines, intervalModifiersLine, diagnostics);
        }
    }

    /**
     * Validate the content of interval_modifiers section
     */
    private validateIntervalModifiersContent(
        document: vscode.TextDocument,
        lines: string[],
        intervalModifiersStart: number,
        diagnostics: vscode.Diagnostic[]
    ): void {
        let intervalModifiersEnd = lines.length;
        
        // Find the end of interval_modifiers section
        for (let i = intervalModifiersStart + 1; i < lines.length; i++) {
            if (lines[i].match(/^\w+:\s*$/) || lines[i].match(/^\s*\w+:\s*$/)) {
                intervalModifiersEnd = i;
                break;
            }
        }
        
        // Validate content within interval_modifiers
        for (let i = intervalModifiersStart + 1; i < intervalModifiersEnd; i++) {
            const line = lines[i];
            
            // Check for "default:" key which is invalid in interval_modifiers content
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
}