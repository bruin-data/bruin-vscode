import * as vscode from 'vscode';

/**
 * Language server for Bruin asset autocomplete within comment blocks
 */
export class BruinAssetLanguageServer {
    /**
     * Register the asset language server providers with VSCode
     */
    public registerProviders(context: vscode.ExtensionContext): void {
        const assetCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' }, 
            new BruinAssetCompletionProvider(),
            ' ', ':', '\n', '-'
        );

        context.subscriptions.push(assetCompletionProvider);
    }
}

/**
 * Completion provider for Bruin asset structure within comment blocks
 */
class BruinAssetCompletionProvider implements vscode.CompletionItemProvider {
    private assetTypes = {
        sql: ['bq.sql', 'sf.sql', 'pg.sql', 'rs.sql', 'ms.sql'],
        python: ['python']
    };

    private materializationTypes = ['null', 'table', 'view'];
    private tableStrategies = [
        'create+replace', 
        'delete+insert', 
        'append', 
        'merge', 
        'time_interval', 
        'ddl', 
        'scd2_by_time', 
        'scd2_by_column'
    ];

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        // Check if we're inside a Bruin asset comment block
        if (!this.isInBruinAssetBlock(document, position)) {
            return [];
        }

        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.substring(0, position.character);

        // Determine what kind of completion to provide
        if (this.isAfterColon(beforeCursor, 'type')) {
            return this.getAssetTypeCompletions();
        } else if (this.isAfterColon(beforeCursor, 'materialization')) {
            return []; // materialization is a block, not a value
        } else if (this.isAfterColon(beforeCursor, 'depends')) {
            return []; // depends is a block, not a value
        } else if (this.isAfterColon(beforeCursor, 'columns')) {
            return []; // columns is a block, not a value
        } else if (this.shouldShowTopLevelCompletions(document, position, beforeCursor)) {
            return this.getTopLevelAssetCompletions();
        } else if (this.isInMaterializationBlock(document, position)) {
            return this.getMaterializationCompletions(beforeCursor);
        } else if (this.isInDependsBlock(document, position)) {
            return this.getDependsCompletions(beforeCursor);
        } else if (this.isInColumnsBlock(document, position)) {
            return this.getColumnsCompletions(beforeCursor);
        }

        return [];
    }

    private isInBruinAssetBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const currentOffset = document.offsetAt(position);
        
        // Find the nearest @bruin comment blocks
        const bruinStartRegex = /\/\*\s*@bruin/g;
        const bruinEndRegex = /@bruin\s*\*\//g;
        
        let startMatch;
        let lastStartOffset = -1;
        
        // Find the last @bruin start before current position
        while ((startMatch = bruinStartRegex.exec(text)) !== null) {
            if (startMatch.index < currentOffset) {
                lastStartOffset = startMatch.index;
            } else {
                break;
            }
        }
        
        if (lastStartOffset === -1) {
            return false;
        }
        
        // Find the next @bruin end after the start
        bruinEndRegex.lastIndex = lastStartOffset;
        const endMatch = bruinEndRegex.exec(text);
        
        if (endMatch && currentOffset < endMatch.index + endMatch[0].length) {
            return true;
        }
        
        return false;
    }

    private isAfterColon(beforeCursor: string, keyword: string): boolean {
        const regex = new RegExp(`${keyword}:\\s*$`);
        return regex.test(beforeCursor.trim());
    }

    private shouldShowTopLevelCompletions(document: vscode.TextDocument, position: vscode.Position, beforeCursor: string): boolean {
        const currentLine = document.lineAt(position.line).text;
        const currentIndent = currentLine.length - currentLine.trimLeft().length;
        
        // If the line is empty or only whitespace and has no indentation (or minimal indentation)
        if (beforeCursor.trim() === '' && currentIndent <= 2) {
            return true;
        }
        
        // If we're starting to type a top-level keyword
        const trimmed = beforeCursor.trim();
        if (trimmed.match(/^(type|description|materialization|depends|columns)$/)) {
            return true;
        }
        
        return false;
    }

    private isTopLevelAssetContext(beforeCursor: string): boolean {
        const trimmed = beforeCursor.trim();
        // Empty line or line with only whitespace
        if (trimmed === '') {
            return true;
        }
        // Line that starts typing a top-level key but hasn't finished
        if (trimmed.match(/^(type|description|materialization|depends|columns)$/)) {
            return true;
        }
        return false;
    }

    private isInMaterializationBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
        return this.isInBlock(document, position, 'materialization');
    }

    private isInDependsBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
        return this.isInBlock(document, position, 'depends');
    }

    private isInColumnsBlock(document: vscode.TextDocument, position: vscode.Position): boolean {
        return this.isInBlock(document, position, 'columns');
    }

    private isInBlock(document: vscode.TextDocument, position: vscode.Position, blockName: string): boolean {
        const lines = document.getText().split('\n');
        let inBlock = false;
        let blockIndent = 0;
        
        for (let i = 0; i <= position.line; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            const currentIndent = line.length - line.trimLeft().length;
            
            if (trimmed.startsWith(`${blockName}:`)) {
                inBlock = true;
                blockIndent = currentIndent;
            } else if (inBlock && trimmed) {
                // Check if we've hit another top-level key or a key at the same level as the block
                if (currentIndent <= blockIndent && !line.startsWith(' '.repeat(blockIndent + 1))) {
                    // Check if this is another top-level key (type:, description:, depends:, etc.)
                    if (trimmed.match(/^(type|description|materialization|depends|columns):/)) {
                        inBlock = false;
                    }
                }
            }
            
            if (i === position.line && inBlock) {
                // Double-check: if current line is at same indent as block and is a different key, we're not in block
                const currentLine = lines[position.line];
                const currentTrimmed = currentLine.trim();
                const currentLineIndent = currentLine.length - currentLine.trimLeft().length;
                
                if (currentLineIndent <= blockIndent && 
                    currentTrimmed.match(/^(type|description|materialization|depends|columns):/) &&
                    !currentTrimmed.startsWith(`${blockName}:`)) {
                    return false;
                }
                
                return true;
            }
        }
        
        return false;
    }

    private getAssetTypeCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        Object.entries(this.assetTypes).forEach(([category, types]) => {
            types.forEach(type => {
                const completion = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
                completion.detail = `${category.toUpperCase()} asset type`;
                completion.documentation = new vscode.MarkdownString(
                    `Asset type for ${category} assets: **${type}**`
                );
                completions.push(completion);
            });
        });
        
        return completions;
    }

    private getMaterializationCompletions(beforeCursor: string): vscode.CompletionItem[] {
        if (this.isAfterColon(beforeCursor, 'type')) {
            return this.getMaterializationTypeCompletions();
        } else if (this.isAfterColon(beforeCursor, 'strategy')) {
            return this.getStrategyCompletions();
        } else if (this.isTopLevelAssetContext(beforeCursor)) {
            return this.getMaterializationKeywords();
        }
        
        return [];
    }

    private getMaterializationTypeCompletions(): vscode.CompletionItem[] {
        return this.materializationTypes.map(type => {
            const completion = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
            completion.detail = 'Materialization type';
            completion.documentation = new vscode.MarkdownString(
                this.getTypeDocumentation(type)
            );
            return completion;
        });
    }

    private getStrategyCompletions(): vscode.CompletionItem[] {
        return this.tableStrategies.map(strategy => {
            const completion = new vscode.CompletionItem(strategy, vscode.CompletionItemKind.Value);
            completion.detail = 'Table strategy';
            completion.documentation = new vscode.MarkdownString(
                this.getStrategyDocumentation(strategy)
            );
            return completion;
        });
    }

    private getMaterializationKeywords(): vscode.CompletionItem[] {
        const keywords = [
            { name: 'type', detail: 'Materialization type (null, table, view)' },
            { name: 'strategy', detail: 'Table materialization strategy' },
            { name: 'incremental_key', detail: 'Column used for incremental updates' }
        ];

        return keywords.map(keyword => {
            const completion = new vscode.CompletionItem(`${keyword.name}:`, vscode.CompletionItemKind.Property);
            completion.detail = keyword.detail;
            completion.insertText = `${keyword.name}: `;
            completion.command = {
                command: 'editor.action.triggerSuggest',
                title: 'Trigger Suggest'
            };
            return completion;
        });
    }

    private getDependsCompletions(beforeCursor: string): vscode.CompletionItem[] {
        if (beforeCursor.trim().startsWith('-')) {
            // This would ideally connect to the pipeline data to get actual dependencies
            // For now, return an empty array - this could be enhanced later
            return [];
        }
        
        if (beforeCursor.trim() === '') {
            const completion = new vscode.CompletionItem('- ', vscode.CompletionItemKind.Snippet);
            completion.detail = 'Add dependency';
            completion.insertText = '- ';
            return [completion];
        }
        
        return [];
    }

    private getColumnsCompletions(beforeCursor: string): vscode.CompletionItem[] {
        if (beforeCursor.trim().startsWith('-')) {
            // Inside a column definition
            const columnKeywords = [
                { name: 'name', detail: 'Column name' },
                { name: 'type', detail: 'Column data type' },
                { name: 'description', detail: 'Column description' },
                { name: 'checks', detail: 'Column validation checks' }
            ];

            return columnKeywords.map(keyword => {
                const completion = new vscode.CompletionItem(`${keyword.name}:`, vscode.CompletionItemKind.Property);
                completion.detail = keyword.detail;
                completion.insertText = `${keyword.name}: `;
                return completion;
            });
        }
        
        if (beforeCursor.trim() === '') {
            const completion = new vscode.CompletionItem('- name:', vscode.CompletionItemKind.Snippet);
            completion.detail = 'Add column definition';
            completion.insertText = '- name: ';
            return [completion];
        }
        
        return [];
    }

    private getTopLevelAssetCompletions(): vscode.CompletionItem[] {
        const topLevelKeywords = [
            { name: 'type', detail: 'Asset type (bq.sql, python, etc.)' },
            { name: 'description', detail: 'Asset description' },
            { name: 'materialization', detail: 'Materialization configuration' },
            { name: 'depends', detail: 'Asset dependencies' },
            { name: 'columns', detail: 'Column definitions and checks' }
        ];

        return topLevelKeywords.map(keyword => {
            const completion = new vscode.CompletionItem(`${keyword.name}:`, vscode.CompletionItemKind.Property);
            completion.detail = keyword.detail;
            
            if (keyword.name === 'materialization' || keyword.name === 'depends' || keyword.name === 'columns') {
                completion.insertText = `${keyword.name}:\n  `;
                completion.command = {
                    command: 'editor.action.triggerSuggest',
                    title: 'Trigger Suggest'
                };
            } else {
                completion.insertText = `${keyword.name}: `;
                if (keyword.name === 'type') {
                    completion.command = {
                        command: 'editor.action.triggerSuggest',
                        title: 'Trigger Suggest'
                    };
                }
            }
            
            return completion;
        });
    }

    private getTypeDocumentation(type: string): string {
        const docs = {
            'null': 'No materialization - asset runs but doesn\'t persist results',
            'table': 'Materialize as a table in the target database',
            'view': 'Materialize as a view in the target database'
        };
        return docs[type as keyof typeof docs] || `Materialization type: **${type}**`;
    }

    private getStrategyDocumentation(strategy: string): string {
        const docs = {
            'create+replace': 'Drop and recreate the table',
            'delete+insert': 'Delete existing data and insert new data',
            'append': 'Append new data to existing table',
            'merge': 'Merge new data with existing data',
            'time_interval': 'Process data in time intervals',
            'ddl': 'Execute DDL statements only',
            'scd2_by_time': 'Slowly Changing Dimension Type 2 by time',
            'scd2_by_column': 'Slowly Changing Dimension Type 2 by column'
        };
        return docs[strategy as keyof typeof docs] || `Table strategy: **${strategy}**`;
    }
}