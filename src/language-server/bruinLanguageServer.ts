import * as vscode from 'vscode';
import { BruinLineageInternalParse } from '../bruin/bruinFlowLineage';
import { getDependsSectionOffsets } from '../utilities/helperUtils';
import { getCurrentPipelinePath } from '../bruin/bruinUtils';
import { getBruinExecutablePath } from '../providers/BruinExecutableService';
import * as path from 'path';

export class BruinLanguageServer {
    private pipelineParser: BruinLineageInternalParse;
    private pipelineCache: Map<string, any> = new Map();

    constructor() {
        this.pipelineParser = new BruinLineageInternalParse(getBruinExecutablePath(), "");
    }

    /**
     * Register the language server providers with VSCode
     */
    public registerProviders(context: vscode.ExtensionContext): void {
        const linkProvider = vscode.languages.registerDocumentLinkProvider(
            { scheme: 'file' }, 
            new BruinDocumentLinkProvider(this)
        );

        const completionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' }, 
            new BruinCompletionProvider(this),
            '-', ' ' 
        );

        context.subscriptions.push(linkProvider, completionProvider);
    }

    /**
     * Get pipeline data for a given file path, with caching
     */
    public async getPipelineData(filePath: string): Promise<any> {
        try {
            const pipelinePath = await getCurrentPipelinePath(filePath) as string;
            
            // Check cache first
            if (this.pipelineCache.has(pipelinePath)) {
                return this.pipelineCache.get(pipelinePath);
            }

            const pipelineResult = await this.pipelineParser.parsePipelineConfig(pipelinePath);
            const pipelineData = pipelineResult.raw;
            
            // Cache the result
            this.pipelineCache.set(pipelinePath, pipelineData);
            
            return pipelineData;
        } catch (error) {
            console.error('Error getting pipeline data:', error);
            return null;
        }
    }

    /**
     * Find the file path for a given asset dependency
     */
    public async findAssetFile(dependencyName: string, currentFilePath: string): Promise<string | null> {
        try {
            const pipelineData = await this.getPipelineData(currentFilePath);
            if (!pipelineData || !pipelineData.assets) {
                return null;
            }

            const asset = pipelineData.assets.find((asset: any) => 
                asset.name === dependencyName
            );

            if (asset && asset.definition_file && asset.definition_file.path) {
                return asset.definition_file.path;
            }

            return null;
        } catch (error) {
            console.error('Error finding asset file:', error);
            return null;
        }
    }


    /**
     * Clear pipeline cache when files change
     */
    public clearCache(filePath?: string): void {
        if (filePath) {
            const entries = Array.from(this.pipelineCache.entries());
            entries.forEach(([pipelinePath, _]) => {
                if (filePath.startsWith(path.dirname(pipelinePath))) {
                    this.pipelineCache.delete(pipelinePath);
                }
            });
        } else {
            this.pipelineCache.clear();
        }
    }
}


/**
 * Document link provider to make dependencies clickable
 */
class BruinDocumentLinkProvider implements vscode.DocumentLinkProvider {
    constructor(private languageServer: BruinLanguageServer) {}

    async provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const { start, end } = getDependsSectionOffsets(document);
        
        if (start === -1 || end === -1) {
            return [];
        }

        const dependsText = document.getText(new vscode.Range(
            document.positionAt(start),
            document.positionAt(end)
        ));

        const dependencyRegex = /^\s*-\s+([a-zA-Z0-9_.-]+)/gm;
        let match;

        while ((match = dependencyRegex.exec(dependsText)) !== null) {
            const dependencyName = match[1];
            const matchStart = start + match.index + match[0].indexOf(dependencyName);
            const matchEnd = matchStart + dependencyName.length;

            try {
                const assetFilePath = await this.languageServer.findAssetFile(dependencyName, document.fileName);
                if (assetFilePath) {
                    const link = new vscode.DocumentLink(
                        new vscode.Range(
                            document.positionAt(matchStart),
                            document.positionAt(matchEnd)
                        ),
                        vscode.Uri.file(assetFilePath)
                    );
                    link.tooltip = `Go to ${dependencyName}`;
                    links.push(link);
                }
            } catch (error) {
                console.error(`Error creating link for ${dependencyName}:`, error);
            }
        }

        return links;
    }
}

/**
 * Completion provider for asset dependencies autocomplete
 */
class BruinCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private languageServer: BruinLanguageServer) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const { start, end } = getDependsSectionOffsets(document);
        if (start === -1 || end === -1) {
            return [];
        }

        const currentOffset = document.offsetAt(position);
        if (currentOffset < start || currentOffset > end) {
            return [];
        }

        const lineText = document.lineAt(position.line).text;
        const trimmedLine = lineText.trim();
        
        if (!trimmedLine.startsWith('-') && !lineText.includes('-')) {
            return [];
        }

        try {
            const pipelineData = await this.languageServer.getPipelineData(document.fileName);
            if (!pipelineData || !pipelineData.assets) {
                return [];
            }

            const currentAsset = pipelineData.assets.find((asset: any) => 
                asset.definition_file && asset.definition_file.path === document.fileName
            );
            const currentAssetName = currentAsset?.name || currentAsset?.id;

            const completions: vscode.CompletionItem[] = [];

            for (const asset of pipelineData.assets) {
                const assetName = asset.name || asset.id;
                
                if (!assetName || assetName === currentAssetName) {
                    continue;
                }

                const completion = new vscode.CompletionItem(assetName, vscode.CompletionItemKind.Reference);
                completion.detail = `Asset: ${asset.type || 'unknown'}`;
                completion.documentation = new vscode.MarkdownString(
                    `**Asset:** \`${assetName}\`\n\n` +
                    `**Type:** ${asset.type || 'unknown'}\n\n` +
                    `**File:** \`${vscode.workspace.asRelativePath(asset.definition_file?.path || '')}\``
                );

                completion.sortText = `${assetName.length.toString().padStart(3, '0')}_${assetName}`;

                completion.insertText = assetName;
                completion.filterText = assetName;

                completions.push(completion);
            }

            return completions;
        } catch (error) {
            console.error('Error providing completions:', error);
            return [];
        }
    }
}

/**
 * File system watcher to clear cache when pipeline files change
 */
export function registerFileWatcher(languageServer: BruinLanguageServer, context: vscode.ExtensionContext): void {
    const pipelineWatcher = vscode.workspace.createFileSystemWatcher('**/pipeline.{yml,yaml}');
    
    pipelineWatcher.onDidChange((uri) => {
        languageServer.clearCache(uri.fsPath);
    });

    pipelineWatcher.onDidCreate((uri) => {
        languageServer.clearCache(uri.fsPath);
    });

    pipelineWatcher.onDidDelete((uri) => {
        languageServer.clearCache(uri.fsPath);
    });

    // Watch for any changes in assets folders
    const assetsWatcher = vscode.workspace.createFileSystemWatcher('**/assets/**');
    
    const handleAssetChange = (uri: vscode.Uri) => {
        languageServer.clearCache(uri.fsPath);
    };

    assetsWatcher.onDidChange(handleAssetChange);
    assetsWatcher.onDidCreate(handleAssetChange);
    assetsWatcher.onDidDelete(handleAssetChange);

    context.subscriptions.push(pipelineWatcher, assetsWatcher);
}