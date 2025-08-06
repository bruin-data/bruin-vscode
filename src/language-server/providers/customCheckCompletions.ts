import * as vscode from 'vscode';

export class CustomCheckCompletions {
    /**
     * Check if we're in a custom_checks section
     */
    public isInCustomChecksSection(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const currentLine = position.line;
        const lines = text.split('\n');
        const currentLineText = lines[currentLine];
        
        // If we're on a top-level property line (no indentation), we're NOT in custom_checks
        if (currentLineText.match(/^\w+:\s*$/)) {
            return false;
        }
        
        let customChecksLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^custom_checks:\s*$/)) {
                customChecksLineIndex = i;
                break;
            }
        }
        
        if (customChecksLineIndex === -1) {
            return false;
        }
        
        let nextSectionLineIndex = lines.length;
        for (let i = customChecksLineIndex + 1; i < lines.length; i++) {
            if (lines[i].match(/^\w+:\s*$/)) {
                nextSectionLineIndex = i;
                break;
            }
        }
        
        const inCustomChecksSection = currentLine > customChecksLineIndex && currentLine < nextSectionLineIndex;
        const onCustomChecksLine = currentLine === customChecksLineIndex && position.character > lines[customChecksLineIndex].indexOf(':');
        
        // Additional check: if we're indented (part of custom_checks content)
        const isIndentedContent = currentLineText.match(/^\s+/) && !currentLineText.match(/^\w+:\s*$/);
        
        return (inCustomChecksSection && isIndentedContent) || onCustomChecksLine;
    }

    /**
     * Get custom check completions
     */
    public getCustomCheckCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);

        if (linePrefix.match(/^\s*$/)) {
            return this.getCustomCheckPropertyCompletions();
        }
        
        if (linePrefix.match(/^\s*-\s*$/)) {
            const nameCompletion = new vscode.CompletionItem('name', vscode.CompletionItemKind.Property);
            nameCompletion.detail = 'Custom check name';
            nameCompletion.insertText = new vscode.SnippetString('name: ${1:check_name}');
            nameCompletion.documentation = new vscode.MarkdownString('**name**\n\nCustom check name');
            return [nameCompletion];
        }

        const context = this.detectCustomCheckContext(document, position, linePrefix);
        
        switch (context.type) {
            case 'check_property':
                return this.getCustomCheckPropertyCompletions();
            case 'name_value':
            case 'description_value':
            case 'query_value':
            case 'value_value':
            case 'count_value':
                return [];
            default:
                return [];
        }
    }

    /**
     * Detect the current context within a custom check definition
     */
    private detectCustomCheckContext(document: vscode.TextDocument, position: vscode.Position, linePrefix: string): 
        { type: string, field?: string } {
        
        const fieldValueMatch = linePrefix.match(/^\s*(name|value|count|description|query):\s*(.*)$/);
        if (fieldValueMatch) {
            const fieldName = fieldValueMatch[1];
            const fieldValue = fieldValueMatch[2];
            
            if (fieldValue.trim() !== '') {
                return { type: 'no_completion' };
            }
            
            switch (fieldName) {
                case 'name':
                    return { type: 'name_value' };
                case 'description':
                    return { type: 'description_value' };
                case 'query':
                    return { type: 'query_value' };
                case 'value':
                    return { type: 'value_value' };
                case 'count':
                    return { type: 'count_value' };
                default:
                    return { type: 'no_completion' };
            }
        }

        const checkPropertyMatch = linePrefix.match(/^\s{2,4}$/);
        if (checkPropertyMatch && this.isAtCustomCheckPropertyLevel(document, position)) {
            return { type: 'check_property' };
        }

        return { type: 'no_completion' };
    }

    /**
     * Check if we're at the custom check property level (inside a custom check item)
     */
    private isAtCustomCheckPropertyLevel(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        
        // Look backwards for the nearest custom check item (- name:)
        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i];
            
            // If we find a custom check item, we're inside it
            if (line.match(/^\s*-\s+name:/)) {
                return true;
            }
            
            // If we hit another top-level section or another list item at the same level, we're not inside a custom check
            if (line.match(/^(custom_checks:|depends:|materialization:|type:|name:|description:|columns:)/) || 
                line.match(/^\s*-\s+/) && !line.includes('name:')) {
                return false;
            }
        }
        return false;
    }

    /**
     * Get custom check item completions (for new custom check)
     */
    private getCustomCheckItemCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Add a complete custom check structure
        const checkCompletion = new vscode.CompletionItem('- name:', vscode.CompletionItemKind.Snippet);
        checkCompletion.detail = 'Add a new custom check';
        checkCompletion.insertText = new vscode.SnippetString(
            '- name: ${1:check_name}\n' +
            '  description: ${2:Check description}\n' +
            '  value: ${3:0}\n' +
            '  count: ${4:0}\n' +
            '  query: |\n' +
            '    ${5:SELECT\n      *\n    FROM\n      table}'
        );
        checkCompletion.documentation = new vscode.MarkdownString('**Custom Check**\n\nAdd a new custom check with name, description, and query');
        completions.push(checkCompletion);

        return completions;
    }

    /**
     * Get custom check property completions
     */
    private getCustomCheckPropertyCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        const customCheckProperties = [
            { name: '- name:', snippet: '- name: ${1:check_name}\n  description: ${2:Check description}\n  value: ${3:0}\n  count: ${4:0}\n  query: |\n    ${5:SELECT\n      *\n    FROM\n      table}', description: 'Add a new custom check' },
            { name: 'name', snippet: 'name: ${1:check_name}', description: 'Custom check name' },
            { name: 'description', snippet: 'description: ${1:Check description}', description: 'Description of the custom check' },
            { name: 'value', snippet: 'value: ${1:0}', description: 'Expected value for the check' },
            { name: 'count', snippet: 'count: ${1:0}', description: 'Expected count for the check' },
            { name: 'query', snippet: 'query: |\n    ${1:SELECT\n      *\n    FROM\n      table}', description: 'SQL query for the custom check' }
        ];

        customCheckProperties.forEach(prop => {
            const itemKind = prop.name === '- name:' ? vscode.CompletionItemKind.Snippet : vscode.CompletionItemKind.Property;
            const completion = new vscode.CompletionItem(prop.name, itemKind);
            completion.detail = prop.description;
            completion.insertText = new vscode.SnippetString(prop.snippet);
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            completions.push(completion);
        });

        return completions;
    }

    /**
     * Get boolean value completions
     */
    private getBooleanCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        ['true', 'false'].forEach(value => {
            const completion = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
            completion.detail = `Boolean value: ${value}`;
            completion.documentation = new vscode.MarkdownString(`**${value}** boolean value`);
            completions.push(completion);
        });

        return completions;
    }
}