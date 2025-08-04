import * as vscode from 'vscode';

export class MaterializationCompletions {
    constructor(private getAssetData: (filePath: string) => Promise<any>) {}

    /**
     * Get materialization completions for the given context
     */
    public async getMaterializationCompletions(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        currentFilePath: string
    ): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);

        // Check if we're after type: in materialization
        const isAfterType = linePrefix.match(/type:\s*$/);
        if (isAfterType) {
            return this.getMaterializationTypeCompletions();
        }

        // Check if we're after strategy: and determine context
        const isAfterStrategy = linePrefix.match(/strategy:\s*$/);
        if (isAfterStrategy) {
            return this.getTableStrategyCompletions();
        }

        // Check if we're after partition_by:, cluster_by:, or incremental_key:
        const isAfterPartitionBy = linePrefix.match(/partition_by:\s*$/);
        const isAfterClusterBy = linePrefix.match(/cluster_by:\s*$/);
        const isAfterIncrementalKey = linePrefix.match(/incremental_key:\s*$/);

        if (isAfterPartitionBy || isAfterIncrementalKey) {
            // Get column completions for single value fields
            const columnCompletions = await this.getColumnNamesForMaterialization(currentFilePath, 'single');
            completions.push(...columnCompletions);
            return completions;
        }

        if (isAfterClusterBy) {
            // Get column completions for cluster_by (array format)
            const columnCompletions = await this.getColumnNamesForMaterialization(currentFilePath, 'cluster_by');
            completions.push(...columnCompletions);
            return completions;
        }

        // Check if we're in cluster_by array adding more items
        if (linePrefix.match(/^\s*-\s*$/)) {
            const columnCompletions = await this.getColumnNamesForMaterialization(currentFilePath, 'array_item');
            completions.push(...columnCompletions);
            return completions;
        }

        // If we're in cluster_by array, check if we need column names
        if (this.isInClusterByArray(document, position)) {
            const columnCompletions = await this.getColumnNamesForMaterialization(currentFilePath, 'array_item');
            completions.push(...columnCompletions);
            return completions;
        }

        // Check if we should suggest incremental_key based on strategy
        const shouldSuggestIncrementalKey = this.shouldSuggestIncrementalKey(document);

        // Default materialization property completions
        const materializationProperties = [
            { name: 'type', description: 'Materialization type (table, view, none)' }
        ];

        // Add strategy only if type is table
        if (this.hasTableType(document)) {
            materializationProperties.push({ name: 'strategy', description: 'Materialization strategy for table type' });
            materializationProperties.push({ name: 'partition_by', description: 'Partitioning key - choose a column' });
            materializationProperties.push({ name: 'cluster_by', description: 'Clustering keys - choose columns' });
        }

        // Add incremental_key if strategy requires it
        if (shouldSuggestIncrementalKey) {
            materializationProperties.push({
                name: 'incremental_key',
                description: 'Incremental key for delete+insert or merge strategy'
            });
        }

        materializationProperties.forEach(prop => {
            const completion = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            completion.detail = prop.description;
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            completion.insertText = `${prop.name}: `;
            completions.push(completion);
        });

        return completions;
    }

    /**
     * Check if we're in a materialization section
     */
    public isInMaterializationSection(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const currentLine = position.line;
        
        // Find the materialization: line
        const lines = text.split('\n');
        let materializationLineIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^materialization:\s*$/)) {
                materializationLineIndex = i;
                break;
            }
        }
        
        if (materializationLineIndex === -1) {
            return false;
        }
        
        // Find the next top-level section (non-indented line that ends with :)
        let nextSectionLineIndex = lines.length;
        for (let i = materializationLineIndex + 1; i < lines.length; i++) {
            if (lines[i].match(/^\w+:\s*$/)) {
                nextSectionLineIndex = i;
                break;
            }
        }
        
        // Check if we're between the materialization: line and the next section
        const inMaterializationSection = currentLine > materializationLineIndex && currentLine < nextSectionLineIndex;
        
        // Also check if we're on the same line as materialization: but after the colon
        const onMaterializationLine = currentLine === materializationLineIndex && position.character > lines[materializationLineIndex].indexOf(':');
        
        return inMaterializationSection || onMaterializationLine;
    }

    /**
     * Check if we're in a cluster_by array context
     */
    private isInClusterByArray(document: vscode.TextDocument, position: vscode.Position): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        const currentLine = position.line;
        const currentLineText = lines[currentLine];
        
        // We're only in cluster_by array if we're at a deeper indentation level (4+ spaces)
        // and there's no other materialization property on the current line
        const isDeepIndentedLine = currentLineText.match(/^\s{4,}/);
        const hasArrayItem = currentLineText.includes('-');
        const hasOtherProperty = currentLineText.match(/^\s{2}\w+:\s*$/);
        
        // If we're at the same level as other materialization properties (2 spaces), we're not in cluster_by array
        if (hasOtherProperty || !isDeepIndentedLine) {
            return false;
        }
        
        // If we already have an array item marker, we're in the array
        if (hasArrayItem) {
            return false; // This case is handled by the array item check above
        }
        
        // Look backwards to find cluster_by: and check if we're in its scope
        let foundClusterBy = false;
        let foundOtherProperty = false;
        
        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i];
            
            // Found cluster_by: - check if we're in its array
            if (line.match(/^\s{2}cluster_by:\s*$/)) {
                foundClusterBy = true;
                break;
            }
            
            // If we hit another materialization property at the same level, we're not in cluster_by anymore
            if (line.match(/^\s{2}\w+:\s*$/) && !line.match(/^\s{2}cluster_by:\s*$/)) {
                foundOtherProperty = true;
                break;
            }
            
            // If we hit a top-level property, stop looking
            if (line.match(/^\w+:\s*$/)) {
                break;
            }
        }
        
        return foundClusterBy && !foundOtherProperty;
    }

    /**
     * Get column names for materialization context using internal parse
     */
    private async getColumnNamesForMaterialization(currentFilePath: string, insertType: string = 'single'): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        try {
            const assetData = await this.getAssetData(currentFilePath);
            
            if (!assetData || !assetData.asset) {
                return completions;
            }

            const asset = assetData.asset;

            // Add column name completions
            if (asset.columns && Array.isArray(asset.columns) && asset.columns.length > 0) {
                for (const column of asset.columns) {
                    const completion = new vscode.CompletionItem(column.name, vscode.CompletionItemKind.Field);
                    completion.detail = `Column: ${column.type}`;
                    completion.documentation = new vscode.MarkdownString(
                        `**Column:** \`${column.name}\`\n\n` +
                        `**Type:** ${column.type}\n\n` +
                        `**Description:** ${column.description || 'No description'}\n\n` +
                        `Use this column for partitioning, clustering, or incremental key`
                    );
                    
                    // Different insert formats based on context
                    switch (insertType) {
                        case 'cluster_by':
                            // After cluster_by: - create array structure
                            completion.insertText = new vscode.SnippetString(`\n  - ${column.name}`);
                            break;
                        case 'array_item':
                            // Inside cluster_by array - add array item prefix
                            completion.insertText = `- ${column.name}`;
                            break;
                        case 'single':
                        default:
                            // For partition_by: and incremental_key:
                            completion.insertText = column.name;
                            break;
                    }
                    
                    completion.filterText = column.name;
                    completions.push(completion);
                }
            }
        } catch (error) {
            console.error('Error getting column names for materialization:', error);
        }

        return completions;
    }

    /**
     * Get materialization type completions
     */
    private getMaterializationTypeCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        const typeValues = [
            { 
                name: 'table', 
                description: 'Materialize as a table - requires strategy',
                insertText: new vscode.SnippetString('table\n  strategy: ${1|create+replace,delete+insert,merge,append|}')
            },
            { 
                name: 'view', 
                description: 'Materialize as a view - logical table only',
                insertText: 'view'
            },
            { 
                name: 'none', 
                description: 'Do not materialize - no physical table created',
                insertText: 'none'
            }
        ];

        typeValues.forEach(type => {
            const completion = new vscode.CompletionItem(type.name, vscode.CompletionItemKind.Value);
            completion.detail = type.description;
            completion.documentation = new vscode.MarkdownString(`**${type.name}**\n\n${type.description}`);
            completion.insertText = type.insertText;
            completions.push(completion);
        });

        return completions;
    }

    /**
     * Get table strategy-specific completions
     */
    private getTableStrategyCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        const tableStrategies = [
            { 
                name: 'create+replace', 
                description: 'Drop and recreate table with new data',
                requiresIncrementalKey: false
            },
            { 
                name: 'delete+insert', 
                description: 'Delete existing data and insert new data (requires incremental_key)',
                requiresIncrementalKey: true
            },
            { 
                name: 'merge', 
                description: 'Merge new data with existing data',
                requiresIncrementalKey: true
            },
            { 
                name: 'append', 
                description: 'Append new data to existing table',
                requiresIncrementalKey: false
            },
            { 
                name: 'time_interval', 
                description: 'Time-based incremental materialization (requires incremental_key)',
                requiresIncrementalKey: true
            },
            { 
                name: 'DDL', 
                description: 'DDL only',
                requiresIncrementalKey: false
            },
            { 
                name: 'scd2_by_column', 
                description: 'SCD2 by column',
                requiresIncrementalKey: true
            },
            { 
                name: 'scd2_by_time', 
                description: 'SCD2 by time (requires incremental_key)',
                requiresIncrementalKey: true
            }
        ];

        tableStrategies.forEach(strategy => {
            const completion = new vscode.CompletionItem(strategy.name, vscode.CompletionItemKind.Value);
            completion.detail = strategy.description;
            completion.documentation = new vscode.MarkdownString(
                `**${strategy.name}**\n\n${strategy.description}` +
                (strategy.requiresIncrementalKey ? '\n\n⚠️ This strategy requires an `incremental_key`' : '')
            );
            completion.insertText = strategy.name;
            completions.push(completion);
        });

        return completions;
    }

    /**
     * Check if materialization type is set to table
     */
    private hasTableType(document: vscode.TextDocument): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Look for type: table in the materialization section
        let inMaterializationSection = false;
        
        for (const line of lines) {
            if (line.match(/^materialization:\s*$/)) {
                inMaterializationSection = true;
                continue;
            }
            
            // Exit materialization section if we hit another top-level property
            if (inMaterializationSection && line.match(/^\w+:\s*$/)) {
                break;
            }
            
            // Check for type: table
            if (inMaterializationSection && line.match(/^\s*type:\s*table\s*$/)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if incremental_key should be suggested based on the current strategy
     */
    private shouldSuggestIncrementalKey(document: vscode.TextDocument): boolean {
        const text = document.getText();
        const lines = text.split('\n');
        
        // Look for strategy: delete+insert or merge in the materialization section
        let inMaterializationSection = false;
        
        for (const line of lines) {
            if (line.match(/^materialization:\s*$/)) {
                inMaterializationSection = true;
                continue;
            }
            
            // Exit materialization section if we hit another top-level property
            if (inMaterializationSection && line.match(/^\w+:\s*$/)) {
                break;
            }
            
            // Check for strategy that requires incremental key
            if (inMaterializationSection && line.match(/^\s*strategy:\s*(delete\+insert|time_interval|scd2_by_time)\s*$/)) {
                return true;
            }
        }
        
        return false;
    }
} 