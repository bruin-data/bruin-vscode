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
            return this.getAllCustomCheckCompletions(document, position);
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
        
        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i];
            
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
     * Get all custom check completions (combines new check + properties)
     */
    private getAllCustomCheckCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Always add new custom check option (with smart positioning)
        const newCheckCompletion = this.createNewCustomCheckCompletion(document, position);
        completions.push(newCheckCompletion);
        
        // Add individual property completions if we're inside a custom check
        if (this.isAtCustomCheckPropertyLevel(document, position)) {
            const propertyCompletions = this.getCustomCheckPropertyCompletions();
            completions.push(...propertyCompletions);
        }
        
        return completions;
    }

    /**
     * Create new custom check completion with smart positioning
     */
    private createNewCustomCheckCompletion(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem {
        const checkCompletion = new vscode.CompletionItem('New custom check', vscode.CompletionItemKind.Snippet);
        checkCompletion.detail = 'Add a new custom check';
        
        // Create snippet with absolute indentation (ignore current cursor position)
        // Start with newline and explicit 2-space indentation for custom_checks items
        const snippet = '\n  - name: ${1:check_name}\n' +
                       '    description: ${2:Check description}\n' +
                       '    value: ${3:0}\n' +
                       '    count: ${4:0}\n' +
                       '    query: |\n' +
                       '        ${5:SELECT\n          *\n        FROM\n          table}$0';
        
        const snippetString = new vscode.SnippetString(snippet);
        checkCompletion.insertText = snippetString;
        checkCompletion.documentation = new vscode.MarkdownString('**New Custom Check**\n\nAdd a new custom check with proper indentation');
        
        // Try to prevent auto-indentation
        checkCompletion.keepWhitespace = true;
        
        return checkCompletion;
    }


    /**
     * Get custom check property completions
     */
    private getCustomCheckPropertyCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Add individual property completions (for when inside a custom check)
        const customCheckProperties = [
            { name: 'name', snippet: 'name: ${1:check_name}', description: 'Custom check name' },
            { name: 'description', snippet: 'description: ${1:Check description}', description: 'Description of the custom check' },
            { name: 'value', snippet: 'value: ${1:0}', description: 'Expected value for the check' },
            { name: 'count', snippet: 'count: ${1:0}', description: 'Expected count for the check' },
            { name: 'query', snippet: 'query: |\n    ${1:SELECT\n      *\n    FROM\n      table}', description: 'SQL query for the custom check' }
        ];

        customCheckProperties.forEach(prop => {
            const completion = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            completion.detail = prop.description;
            completion.insertText = new vscode.SnippetString(prop.snippet);
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            completions.push(completion);
        });

        return completions;
    }
}