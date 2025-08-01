import * as vscode from 'vscode';

export class AssetCompletions {
    constructor(private getAssetData: (filePath: string) => Promise<any>) {}

    /**
     * Get asset completions from parsed asset data
     */
    public async getAssetCompletionsFromAsset(currentFilePath: string): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        
        try {
            const assetData = await this.getAssetData(currentFilePath);
            
            if (!assetData || !assetData.asset) {
                return completions;
            }

            const asset = assetData.asset;

            // Add column completions if available
            if (asset.columns && Array.isArray(asset.columns) && asset.columns.length > 0) {
                for (const column of asset.columns) {
                    const completion = new vscode.CompletionItem(column.name, vscode.CompletionItemKind.Field);
                    completion.detail = `Column: ${column.type}`;
                    completion.documentation = new vscode.MarkdownString(
                        `**Column:** \`${column.name}\`\n\n` +
                        `**Type:** ${column.type}\n\n` +
                        `**Description:** ${column.description || 'No description'}\n\n` +
                        `**Asset:** ${asset.name}`
                    );
                    completion.sortText = `column_${column.name}`;
                    completion.insertText = column.name;
                    completion.filterText = column.name;
                    completions.push(completion);
                }
            }

            // Add upstream asset completions
            if (asset.upstreams && Array.isArray(asset.upstreams) && asset.upstreams.length > 0) {
                for (const upstream of asset.upstreams) {
                    const upstreamName = upstream.name || upstream.asset?.name;
                    if (upstreamName) {
                        const completion = new vscode.CompletionItem(upstreamName, vscode.CompletionItemKind.Reference);
                        completion.detail = `Upstream Asset: ${upstream.type || upstream.asset?.type || 'unknown'}`;
                        completion.documentation = new vscode.MarkdownString(
                            `**Upstream Asset:** \`${upstreamName}\`\n\n` +
                            `**Type:** ${upstream.type || upstream.asset?.type || 'unknown'}\n\n` +
                            `**Description:** ${upstream.description || upstream.asset?.description || 'No description'}`
                        );
                        completion.sortText = `upstream_${upstreamName}`;
                        completion.insertText = upstreamName;
                        completion.filterText = upstreamName;
                        completions.push(completion);
                    }
                }
            }

            // If no columns or upstreams, provide the asset itself as a completion
            if (completions.length === 0) {
                const completion = new vscode.CompletionItem(asset.name, vscode.CompletionItemKind.Class);
                completion.detail = `Current Asset: ${asset.type}`;
                completion.documentation = new vscode.MarkdownString(
                    `**Asset:** \`${asset.name}\`\n\n` +
                    `**Type:** ${asset.type}\n\n` +
                    `**Description:** ${asset.description || 'No description'}`
                );
                completion.sortText = `asset_${asset.name}`;
                completion.insertText = asset.name;
                completion.filterText = asset.name;
                completions.push(completion);
            }
        } catch (error) {
            console.error('Error getting asset completions:', error);
        }

        return completions;
    }
} 