import * as vscode from 'vscode';
import { BruinLineageInternalParse } from '../bruin/bruinFlowLineage';
import { getDependsSectionOffsets, isBruinSqlAsset } from '../utilities/helperUtils';
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
        // Register document link provider to make dependencies clickable
        const linkProvider = vscode.languages.registerDocumentLinkProvider(
            { scheme: 'file', language: 'sql' },
            new BruinDocumentLinkProvider(this)
        );

        context.subscriptions.push(linkProvider);
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

            // Find the asset with matching name
            const asset = pipelineData.assets.find((asset: any) => 
                asset.name === dependencyName || asset.id === dependencyName
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
            // Clear specific pipeline cache
            const entries = Array.from(this.pipelineCache.entries());
            entries.forEach(([pipelinePath, _]) => {
                if (filePath.startsWith(path.dirname(pipelinePath))) {
                    this.pipelineCache.delete(pipelinePath);
                }
            });
        } else {
            // Clear all cache
            this.pipelineCache.clear();
        }
    }
}


/**
 * Document link provider to make dependencies clickable (blue underlined links)
 */
class BruinDocumentLinkProvider implements vscode.DocumentLinkProvider {
    constructor(private languageServer: BruinLanguageServer) {}

    async provideDocumentLinks(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentLink[]> {
        // Check if this is a Bruin SQL asset
        if (!await isBruinSqlAsset(document.fileName)) {
            return [];
        }

        const links: vscode.DocumentLink[] = [];
        const { start, end } = getDependsSectionOffsets(document);
        
        if (start === -1 || end === -1) {
            return [];
        }

        const dependsText = document.getText(new vscode.Range(
            document.positionAt(start),
            document.positionAt(end)
        ));

        // Find all dependency names in the depends section
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
 * File system watcher to clear cache when pipeline files change
 */
export function registerFileWatcher(languageServer: BruinLanguageServer, context: vscode.ExtensionContext): void {
    // Watch for changes to pipeline.yml files
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

    // Watch for changes to SQL asset files
    const sqlWatcher = vscode.workspace.createFileSystemWatcher('**/*.sql');
    
    sqlWatcher.onDidChange((uri) => {
        languageServer.clearCache(uri.fsPath);
    });

    sqlWatcher.onDidCreate((uri) => {
        languageServer.clearCache(uri.fsPath);
    });

    sqlWatcher.onDidDelete((uri) => {
        languageServer.clearCache(uri.fsPath);
    });

    context.subscriptions.push(pipelineWatcher, sqlWatcher);
}