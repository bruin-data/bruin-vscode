import * as vscode from 'vscode';

export class ColumnCompletions {
    /**
     * Check if we're in a columns section
     */
    public isInColumnsSection(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const currentLine = position.line;
        
        // Find the columns: line
        const lines = text.split('\n');
        let columnsLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^columns:\s*$/)) {
                columnsLineIndex = i;
                break;
            }
        }
        
        if (columnsLineIndex === -1) {
            return false;
        }
        
        // Find the next top-level section (non-indented line that ends with :)
        let nextSectionLineIndex = lines.length;
        for (let i = columnsLineIndex + 1; i < lines.length; i++) {
            if (lines[i].match(/^\w+:\s*$/)) {
                nextSectionLineIndex = i;
                break;
            }
        }
        
        // Check if we're between the columns: line and the next section
        const inColumnsSection = currentLine > columnsLineIndex && currentLine < nextSectionLineIndex;
        
        // Also check if we're on the same line as columns: but after the colon
        const onColumnsLine = currentLine === columnsLineIndex && position.character > lines[columnsLineIndex].indexOf(':');
        
        return inColumnsSection || onColumnsLine;
    }

    /**
     * Get column schema completions
     */
    public getColumnSchemaCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);

        // Check if we're at the start of a new column (after columns: or after another column)
        if (linePrefix.match(/^\s*$/)) {
            return this.getColumnPropertyCompletions();
        }
        
        // Special case: if they typed "- " they probably want to start with name
        if (linePrefix.match(/^\s*-\s*$/)) {
            const nameCompletion = new vscode.CompletionItem('name', vscode.CompletionItemKind.Property);
            nameCompletion.detail = 'Column name';
            nameCompletion.insertText = new vscode.SnippetString('name: ${1:column_name}');
            nameCompletion.documentation = new vscode.MarkdownString('**name**\n\nColumn name');
            return [nameCompletion];
        }

        // Detect current context and provide appropriate completions
        const context = this.detectColumnContext(document, position, linePrefix);
        
        switch (context.type) {
            case 'column_property':
                return this.getColumnPropertyCompletions();
            case 'type_value':
                return this.getDataTypeCompletions();
            case 'boolean_value':
                return this.getBooleanCompletions();
            case 'checks_property':
                return this.getChecksCompletions();
            case 'check_name':
                return this.getCheckTypeCompletions();
            case 'name_value':
                return []; // No suggestions for name values
            case 'description_value':
                return []; // No suggestions for description values
            default:
                return [];
        }
    }


    /**
     * Detect the current context within a column definition
     */
    private detectColumnContext(document: vscode.TextDocument, position: vscode.Position, linePrefix: string): 
        { type: string, field?: string } {
        
        // Check if we're completing a field value (after colon and optional space)
        const fieldValueMatch = linePrefix.match(/^\s*(name|type|description|nullable|primary_key|update_on_merge|owner):\s*(.*)$/);
        if (fieldValueMatch) {
            const fieldName = fieldValueMatch[1];
            const fieldValue = fieldValueMatch[2];
            
            // If there's already a value, don't provide completions
            if (fieldValue.trim() !== '') {
                return { type: 'no_completion' };
            }
            
            switch (fieldName) {
                case 'type':
                    return { type: 'type_value' };
                case 'nullable':
                case 'primary_key':
                case 'update_on_merge':
                    return { type: 'boolean_value' };
                case 'name':
                    return { type: 'name_value' };
                case 'description':
                    return { type: 'description_value' };
                default:
                    return { type: 'no_completion' };
            }
        }

        // Check if we're in a checks context
        if (this.isInChecksContext(document, position)) {
            // Check if we're completing a check name (after "name:")
            if (linePrefix.match(/^\s*-?\s*name:\s*$/)) {
                return { type: 'check_name' };
            }
            return { type: 'checks_property' };
        }

        // Check if we're at column property level (same indentation as name)
        const columnPropertyMatch = linePrefix.match(/^\s{2,4}$/); // 2-4 spaces indentation
        if (columnPropertyMatch && this.isAtColumnPropertyLevel(document, position)) {
            return { type: 'column_property' };
        }

        return { type: 'no_completion' };
    }

    /**
     * Check if we're at the column property level (same indentation as name, type, etc.)
     */
    private isAtColumnPropertyLevel(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        
        // Look backwards to find the nearest column definition
        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i];
            // If we hit a column item (- name:), we're in a column definition
            if (line.match(/^\s*-\s+name:/)) {
                return true;
            }
            // If we hit another top-level property or columns:, we're not in a column
            if (line.match(/^(columns:|depends:|materialization:|type:|name:|description:)/)) {
                return false;
            }
        }
        return false;
    }

    /**
     * Get column property completions
     */
    private getColumnPropertyCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        const columnProperties = [
            { name: 'name', snippet: 'name: ${1:column_name}', description: 'Column name' },
            { name: 'type', snippet: 'type: ${1:string}', description: 'Column data type' },
            { name: 'description', snippet: 'description: ${1:"Column description"}', description: 'Column description' },
            { name: 'nullable', snippet: 'nullable: ${1:true}', description: 'Whether this column can be null' },
            { name: 'update_on_merge', snippet: 'update_on_merge: ${1:false}', description: 'Update this column on merge operations' },
            { name: 'primary_key', snippet: 'primary_key: ${1:true}', description: 'Whether this column is a primary key' },
            { name: 'owner', snippet: 'owner: ${1:"owner_name"}', description: 'Owner of this column' },
            { name: 'checks', snippet: 'checks:\n    - name: ${1:not_null}', description: 'Column validation checks' }
        ];

        columnProperties.forEach(prop => {
            const completion = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            completion.detail = prop.description;
            completion.insertText = new vscode.SnippetString(prop.snippet);
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            completions.push(completion);
        });

        return completions;
    }

    /**
     * Get data type completions
     */
    private getDataTypeCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const dataTypes = ['string', 'integer', 'float', 'boolean', 'timestamp', 'date', 'json', 'array'];
        
        dataTypes.forEach(type => {
            const completion = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
            completion.detail = `Data type: ${type}`;
            completion.documentation = new vscode.MarkdownString(`**${type}** data type`);
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

    /**
     * Get checks property completions
     */
    private getChecksCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        const checkCompletion = new vscode.CompletionItem('- name:', vscode.CompletionItemKind.Snippet);
        checkCompletion.detail = 'Add a new check';
        checkCompletion.insertText = new vscode.SnippetString('- name: ${1:not_null}');
        checkCompletion.documentation = new vscode.MarkdownString('**Check Item**\n\nAdd a new validation check');
        completions.push(checkCompletion);

        return completions;
    }

    /**
     * Get check type completions
     */
    private getCheckTypeCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const checkTypes = [
            'unique', 'not_null', 'positive', 'negative'
        ];
        
        // Add regular check types
        checkTypes.forEach(check => {
            const completion = new vscode.CompletionItem(check, vscode.CompletionItemKind.Value);
            completion.detail = `Column check: ${check}`;
            completion.documentation = new vscode.MarkdownString(`**${check}** validation check`);
            completions.push(completion);
        });

        // Add special handling for accepted_values with value array structure
        const acceptedValuesCompletion = new vscode.CompletionItem('accepted_values', vscode.CompletionItemKind.Snippet);
        acceptedValuesCompletion.detail = 'Column check: accepted_values with value array';
        acceptedValuesCompletion.insertText = new vscode.SnippetString(
            `accepted_values\n  value:\n    - "\${1:value1}"\n    - "\${2:value2}"`
        );
        acceptedValuesCompletion.documentation = new vscode.MarkdownString(
            `**accepted_values** validation check\n\n` +
            `Validates that column values are within a specified list of accepted values`
        );
        completions.push(acceptedValuesCompletion);

        // Add special handling for pattern with value string
        const patternCompletion = new vscode.CompletionItem('pattern', vscode.CompletionItemKind.Snippet);
        patternCompletion.detail = 'Column check: pattern with regex value';
        patternCompletion.insertText = new vscode.SnippetString(
            `pattern\n  value: '\${1:}'`
        );
        patternCompletion.documentation = new vscode.MarkdownString(
            `**pattern** validation check\n\n` +
            `Validates that column values match a specified regular expression pattern`
        );
        completions.push(patternCompletion);

        return completions;
    }

    /**
     * Check if we're in a checks context
     */
    private isInChecksContext(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        
        // Look backwards for 'checks:'
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i];
            if (line.match(/^\s*checks:\s*$/)) {
                return true;
            }
            // If we hit another column property, we're not in checks
            if (line.match(/^\s*\w+:\s*$/) && !line.includes('checks:')) {
                return false;
            }
        }
        return false;
    }
} 