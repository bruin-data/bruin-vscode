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

        // Default materialization property and value completions
        const materializationProperties = [
            { name: 'type', description: 'Materialization type (table, view, time_interval)' },
            { name: 'strategy', description: 'Materialization strategy' },
            { name: 'partition_by', description: 'Partitioning key - choose a column' },
            { name: 'cluster_by', description: 'Clustering keys - choose columns' },
            { name: 'incremental_key', description: 'Incremental key for delete+insert strategy' }
        ];

        materializationProperties.forEach(prop => {
            const completion = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            completion.detail = prop.description;
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            completion.insertText = `${prop.name}: `;
            completions.push(completion);
        });

        // Materialization type values
        const materializationTypes = [
            { name: 'table', description: 'Materialize as a table' },
            { name: 'view', description: 'Materialize as a view' },
            { name: 'time_interval', description: 'Materialize with time intervals' }
        ];

        materializationTypes.forEach(type => {
            const completion = new vscode.CompletionItem(type.name, vscode.CompletionItemKind.Value);
            completion.detail = type.description;
            completion.documentation = new vscode.MarkdownString(`**${type.name}**\n\n${type.description}`);
            completion.insertText = type.name;
            completions.push(completion);
        });

        // Strategy values
        const strategyValues = [
            { name: 'delete+insert', description: 'Delete existing data and insert new data' },
            { name: 'merge', description: 'Merge new data with existing data' },
            { name: 'replace', description: 'Replace entire table with new data' },
            { name: 'append', description: 'Append new data to existing table' },
            { name: 'scd2', description: 'Slowly changing dimension type 2' }
        ];

        strategyValues.forEach(strategy => {
            const completion = new vscode.CompletionItem(strategy.name, vscode.CompletionItemKind.Value);
            completion.detail = strategy.description;
            completion.documentation = new vscode.MarkdownString(`**${strategy.name}**\n\n${strategy.description}`);
            completion.insertText = strategy.name;
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
        
        // If we're on a line that starts with proper indentation but no -, we might be in cluster_by array
        const isIndentedLine = currentLineText.match(/^\s{2,}/);
        const hasArrayItem = currentLineText.includes('-');
        
        if (!isIndentedLine || hasArrayItem) {
            return false;
        }
        
        // Look backwards to find cluster_by: and check if we're in its scope
        let foundClusterBy = false;
        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i];
            
            // Found cluster_by: - check if we're in its array
            if (line.match(/^\s*cluster_by:\s*$/)) {
                foundClusterBy = true;
                break;
            }
            
            // If we hit another top-level property, we're not in cluster_by anymore
            if (line.match(/^\s*\w+:\s*$/) && !line.match(/^\s*cluster_by:\s*$/)) {
                return false;
            }
        }
        
        return foundClusterBy;
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
} 