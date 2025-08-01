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
        if (linePrefix.match(/^\s*$/) || linePrefix.match(/^\s*-\s*$/)) {
            // Full column template
            const fullColumnCompletion = new vscode.CompletionItem('- name: (full column)', vscode.CompletionItemKind.Snippet);
            fullColumnCompletion.detail = 'Complete column definition with all properties';
            fullColumnCompletion.insertText = new vscode.SnippetString(
                `- name: \${1:col_name}\n` +
                `  type: \${2:string}\n` +
                `  description: \${3:"Column description"}\n` +
                `  primary_key: \${4:false}\n` +
                `  update_on_merge: \${5:false}\n` +
                `  checks:\n` +
                `    - name: \${6:not_null}`
            );
            fullColumnCompletion.documentation = new vscode.MarkdownString(
                `**Complete Column Definition**\n\n` +
                `Creates a full column schema with all common properties`
            );
            completions.push(fullColumnCompletion);

            // Simple column template
            const simpleColumnCompletion = new vscode.CompletionItem('- name: (simple)', vscode.CompletionItemKind.Snippet);
            simpleColumnCompletion.detail = 'Simple column definition';
            simpleColumnCompletion.insertText = new vscode.SnippetString(
                `- name: \${1:col_name}\n` +
                `  type: \${2:string}\n` +
                `  description: \${3:"Column description"}`
            );
            simpleColumnCompletion.documentation = new vscode.MarkdownString(
                `**Simple Column Definition**\n\n` +
                `Creates a basic column with name, type, and description`
            );
            completions.push(simpleColumnCompletion);
            
            return completions;
        }

        // Column property completions
        const columnProperties = [
            { name: 'name', snippet: 'name: ${1:column_name}', description: 'Column name' },
            { name: 'type', snippet: 'type: ${1:string}', description: 'Column data type' },
            { name: 'description', snippet: 'description: ${1:"Column description"}', description: 'Column description' },
            { name: 'primary_key', snippet: 'primary_key: ${1:true}', description: 'Whether this column is a primary key' },
            { name: 'update_on_merge', snippet: 'update_on_merge: ${1:true}', description: 'Update this column on merge operations' },
            { 
                name: 'checks', 
                snippet: 'checks:\n  - name: ${1:not_null}', 
                description: 'Column validation checks' 
            }
        ];

        columnProperties.forEach(prop => {
            const completion = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            completion.detail = prop.description;
            completion.insertText = new vscode.SnippetString(prop.snippet);
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            completions.push(completion);
        });

        // Data type completions
        const dataTypes = ['string', 'integer', 'float', 'boolean', 'timestamp', 'date', 'json', 'array'];
        dataTypes.forEach(type => {
            const completion = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
            completion.detail = `Data type: ${type}`;
            completion.documentation = new vscode.MarkdownString(`**${type}** data type`);
            completions.push(completion);
        });

        // Check completions (if we're in a checks context)
        if (linePrefix.includes('name:') && this.isInChecksContext(document, position)) {
            const checkTypes = [
                'unique', 'not_null', 'positive', 'negative', 'accepted_values', 
                'min_length', 'max_length', 'regex', 'range'
            ];
            
            checkTypes.forEach(check => {
                const completion = new vscode.CompletionItem(check, vscode.CompletionItemKind.Value);
                completion.detail = `Column check: ${check}`;
                completion.documentation = new vscode.MarkdownString(`**${check}** validation check`);
                completions.push(completion);
            });
        }

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