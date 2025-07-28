import * as vscode from 'vscode';
import { BruinLineageInternalParse } from '../bruin/bruinFlowLineage';
import { getDependsSectionOffsets, isBruinSqlAsset } from '../utilities/helperUtils';
import { getCurrentPipelinePath } from '../bruin/bruinUtils';
import { getBruinExecutablePath } from '../providers/BruinExecutableService';
import * as path from 'path';
import * as fs from 'fs';

export class BruinLanguageServer {
    private parser: BruinLineageInternalParse;
    private pipelineCache: Map<string, any> = new Map();

    constructor() {
        this.parser = new BruinLineageInternalParse(getBruinExecutablePath(), "");
    }

    /**
     * Register the language server providers with VSCode
     */
    public registerProviders(context: vscode.ExtensionContext): void {
        // Register go-to-definition provider for SQL files
        const definitionProvider = vscode.languages.registerDefinitionProvider(
            { scheme: 'file', language: 'sql' },
            new BruinDefinitionProvider(this)
        );

        context.subscriptions.push(definitionProvider);
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

            // Parse pipeline data using the public method
            const pipelineResult = await this.parser.parsePipelineConfig(pipelinePath);
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
 * Definition provider for Bruin SQL assets
 */
class BruinDefinitionProvider implements vscode.DefinitionProvider {
    constructor(private languageServer: BruinLanguageServer) {}

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | null> {
        // Check if this is a Bruin SQL asset
        if (!await isBruinSqlAsset(document.fileName)) {
            return null;
        }

        // Check if the position is within the depends section
        const { start, end } = getDependsSectionOffsets(document);
        if (start === -1 || end === -1) {
            return null;
        }

        const currentOffset = document.offsetAt(position);
        if (currentOffset < start || currentOffset > end) {
            return null;
        }

        // Get the word at the current position
        const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_.-]+/);
        if (!wordRange) {
            return null;
        }

        const dependencyName = document.getText(wordRange);
        if (!dependencyName) {
            return null;
        }

        // Skip if this is the "depends:" keyword itself
        if (dependencyName === 'depends') {
            return null;
        }

        try {
            // Find the asset file for this dependency
            const assetFilePath = await this.languageServer.findAssetFile(dependencyName, document.fileName);
            if (!assetFilePath || !fs.existsSync(assetFilePath)) {
                return null;
            }

            // Return the definition location
            return new vscode.Location(
                vscode.Uri.file(assetFilePath),
                new vscode.Position(0, 0)
            );
        } catch (error) {
            console.error('Error providing definition:', error);
            return null;
        }
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