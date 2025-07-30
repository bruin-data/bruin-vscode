import * as vscode from 'vscode';

/**
 * Improved Bruin Asset Language Server using proper YAML parsing approach
 */
export class ImprovedBruinAssetLanguageServer {
    public registerProviders(context: vscode.ExtensionContext): void {
        const assetCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' }, 
            new ImprovedBruinAssetCompletionProvider(),
            ' ', ':', '\n', '-'
        );

        context.subscriptions.push(assetCompletionProvider);
    }
}

interface AssetContext {
    inBruinBlock: boolean;
    yamlContent: string;
    currentPath: string[];
    currentIndent: number;
    isAfterColon: boolean;
    currentKey?: string;
}

class ImprovedBruinAssetCompletionProvider implements vscode.CompletionItemProvider {
    private schema = {
        type: {
            sql: ['bq.sql', 'sf.sql', 'pg.sql', 'rs.sql', 'ms.sql'],
            python: ['python']
        },
        materialization: {
            type: ['null', 'table', 'view'],
            strategy: ['create+replace', 'delete+insert', 'append', 'merge', 'time_interval', 'ddl', 'scd2_by_time', 'scd2_by_column'],
            incremental_key: 'string'
        },
        depends: 'array',
        columns: {
            name: 'string',
            type: 'string', 
            description: 'string',
            checks: {
                name: ['unique', 'not_null', 'positive', 'negative']
            }
        }
    };

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const assetContext = this.parseAssetContext(document, position);
        
        if (!assetContext.inBruinBlock) {
            return [];
        }

        return this.getCompletionsForContext(assetContext);
    }

    private parseAssetContext(document: vscode.TextDocument, position: vscode.Position): AssetContext {
        const text = document.getText();
        const currentOffset = document.offsetAt(position);
        
        // Find Bruin block boundaries
        const bruinBlock = this.findBruinBlock(text, currentOffset);
        if (!bruinBlock) {
            return { inBruinBlock: false, yamlContent: '', currentPath: [], currentIndent: 0, isAfterColon: false };
        }

        // Extract YAML content from the block
        const yamlContent = text.substring(bruinBlock.start, bruinBlock.end);
        const yamlLines = yamlContent.split('\n');
        
        // Find current position within YAML
        const relativeOffset = currentOffset - bruinBlock.start;
        const currentContext = this.parseYamlContext(yamlLines, relativeOffset);
        
        return {
            inBruinBlock: true,
            yamlContent,
            ...currentContext
        };
    }

    private findBruinBlock(text: string, offset: number): { start: number; end: number } | null {
        const bruinStartRegex = /\/\*\s*@bruin\s*\n/g;
        const bruinEndRegex = /\n\s*@bruin\s*\*\//g;
        
        let match;
        let lastStart = -1;
        
        // Find the last start before current position
        while ((match = bruinStartRegex.exec(text)) !== null) {
            if (match.index < offset) {
                lastStart = match.index + match[0].length;
            } else {
                break;
            }
        }
        
        if (lastStart === -1) return null;
        
        // Find the next end after the start
        bruinEndRegex.lastIndex = lastStart;
        const endMatch = bruinEndRegex.exec(text);
        
        if (endMatch && offset < endMatch.index) {
            return { start: lastStart, end: endMatch.index };
        }
        
        return null;
    }

    private parseYamlContext(yamlLines: string[], relativeOffset: number): {
        currentPath: string[];
        currentIndent: number;
        isAfterColon: boolean;
        currentKey?: string;
    } {
        let currentOffset = 0;
        let targetLine = -1;
        let targetColumn = -1;
        
        // Find which line we're on
        for (let i = 0; i < yamlLines.length; i++) {
            const lineLength = yamlLines[i].length + 1; // +1 for newline
            if (currentOffset + lineLength > relativeOffset) {
                targetLine = i;
                targetColumn = relativeOffset - currentOffset;
                break;
            }
            currentOffset += lineLength;
        }
        
        if (targetLine === -1) {
            return { currentPath: [], currentIndent: 0, isAfterColon: false };
        }
        
        // Parse the YAML structure up to current line
        const path: string[] = [];
        const indentStack: number[] = [];
        
        for (let i = 0; i <= targetLine; i++) {
            const line = yamlLines[i];
            const indent = line.length - line.trimLeft().length;
            const trimmed = line.trim();
            
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            // Pop stack until we find parent level
            while (indentStack.length > 0 && indentStack[indentStack.length - 1] >= indent) {
                indentStack.pop();
                path.pop();
            }
            
            // Check if this line defines a key
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0) {
                const key = trimmed.substring(0, colonIndex).trim();
                path.push(key);
                indentStack.push(indent);
            }
        }
        
        const currentLine = yamlLines[targetLine];
        const beforeCursor = currentLine.substring(0, targetColumn);
        const isAfterColon = beforeCursor.includes(':') && beforeCursor.trim().endsWith(':');
        
        // Extract current key if we're typing one
        let currentKey: string | undefined;
        const keyMatch = beforeCursor.match(/(\w+):?\s*$/);
        if (keyMatch) {
            currentKey = keyMatch[1];
        }
        
        return {
            currentPath: path,
            currentIndent: currentLine.length - currentLine.trimLeft().length,
            isAfterColon,
            currentKey
        };
    }

    private getCompletionsForContext(context: AssetContext): vscode.CompletionItem[] {
        const { currentPath, isAfterColon, currentKey } = context;
        
        // If we just typed a colon, provide values for that key
        if (isAfterColon && currentKey) {
            return this.getValueCompletions(currentPath, currentKey);
        }
        
        // Otherwise provide key completions based on current path
        return this.getKeyCompletions(currentPath);
    }

    private getValueCompletions(path: string[], key: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        if (key === 'type' && path.length === 0) {
            // Top-level type
            Object.entries(this.schema.type).forEach(([category, types]) => {
                types.forEach(type => {
                    const completion = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
                    completion.detail = `${category.toUpperCase()} asset type`;
                    completions.push(completion);
                });
            });
        } else if (key === 'type' && path.includes('materialization')) {
            // Materialization type
            this.schema.materialization.type.forEach(type => {
                const completion = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
                completion.detail = 'Materialization type';
                completions.push(completion);
            });
        } else if (key === 'strategy' && path.includes('materialization')) {
            // Materialization strategy
            this.schema.materialization.strategy.forEach(strategy => {
                const completion = new vscode.CompletionItem(strategy, vscode.CompletionItemKind.Value);
                completion.detail = 'Table strategy';
                completions.push(completion);
            });
        }
        
        return completions;
    }

    private getKeyCompletions(path: string[]): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        if (path.length === 0) {
            // Top-level keys
            ['type', 'description', 'materialization', 'depends', 'columns'].forEach(key => {
                const completion = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
                completion.insertText = key === 'description' ? `${key}: ` : `${key}:\n  `;
                completions.push(completion);
            });
        } else if (path[path.length - 1] === 'materialization') {
            // Materialization keys
            ['type', 'strategy', 'incremental_key'].forEach(key => {
                const completion = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
                completion.insertText = `${key}: `;
                completion.command = { command: 'editor.action.triggerSuggest', title: 'Trigger Suggest' };
                completions.push(completion);
            });
        } else if (path[path.length - 1] === 'columns') {
            // Column keys
            ['name', 'type', 'description', 'checks'].forEach(key => {
                const completion = new vscode.CompletionItem(`${key}:`, vscode.CompletionItemKind.Property);
                completion.insertText = `${key}: `;
                completions.push(completion);
            });
        }
        
        return completions;
    }
}