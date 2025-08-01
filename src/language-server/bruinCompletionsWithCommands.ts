import * as vscode from 'vscode';
import { getDependsSectionOffsets } from '../utilities/helperUtils';
import { BruinInternalParse } from '../bruin/bruinInternalParse';
import { getBruinExecutablePath } from '../providers/BruinExecutableService';
import { MaterializationCompletions, ColumnCompletions, TopLevelCompletions, AssetCompletions } from './providers';

export class BruinCompletionsWithCommands {
    private assetCache: Map<string, any> = new Map();
    private static instance: BruinCompletionsWithCommands;
    private materializationCompletions: MaterializationCompletions;
    private columnCompletions: ColumnCompletions;
    private topLevelCompletions: TopLevelCompletions;
    private assetCompletions: AssetCompletions;

    constructor() {
        // Subscribe to panel messages to capture parse results
        this.setupPanelMessageListener();
        
        // Initialize completion providers
        this.materializationCompletions = new MaterializationCompletions(this.getAssetData.bind(this));
        this.columnCompletions = new ColumnCompletions();
        this.topLevelCompletions = new TopLevelCompletions();
        this.assetCompletions = new AssetCompletions(this.getAssetData.bind(this));
    }

    public static getInstance(): BruinCompletionsWithCommands {
        if (!BruinCompletionsWithCommands.instance) {
            BruinCompletionsWithCommands.instance = new BruinCompletionsWithCommands();
        }
        return BruinCompletionsWithCommands.instance;
    }

    /**
     * Setup listener to capture parse results from BruinPanel
     */
    private setupPanelMessageListener(): void {
        try {
            const BruinPanelModule = require('../panels/BruinPanel');
            
            const originalPostMessage = BruinPanelModule.BruinPanel.postMessage;
            
            BruinPanelModule.BruinPanel.postMessage = (
                name: string,
                data: string | { status: string; message: string | any },
                panelType?: string
            ) => {
                // Capture parse-message results for completions
                if (name === 'parse-message' && typeof data === 'object' && data.status === 'success') {
                    try {
                        const parsed = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
                        if (parsed && parsed.asset) {
                            const filePath = parsed.asset.executable_file?.path || parsed.asset.definition_file?.path;
                            if (filePath) {
                                this.assetCache.set(filePath, parsed);
                            }
                        }
                    } catch (error) {
                        console.error('Error caching parse result:', error);
                    }
                }
                
                // Call the original method to maintain normal behavior
                return originalPostMessage(name, data, panelType);
            };
            
        } catch (error) {
            console.error('Error setting up panel message listener:', error);
        }
    }

    /**
     * Get asset data from cache (populated by panel messages)
     */
    private async getAssetDataInternal(filePath: string): Promise<any> {
        try {
            // Check if we have cached data from panel messages
            if (this.assetCache.has(filePath)) {
                return this.assetCache.get(filePath);
            }
            
            // If no cached data, return null and let the panel parsing handle it
            return null;
        } catch (error) {
            console.error('Error getting asset data:', error);
            return null;
        }
    }

    /**
     * Register completion providers for Bruin asset files
     */
    public registerProviders(context: vscode.ExtensionContext): void {
        const assetCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            new BruinAssetCompletionProvider(this),
            ':', ' ', '\n', '-'
        );

        const pythonCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { language: 'python' },
            new BruinAssetCompletionProvider(this),
            ':', ' ', '\n', '-'
        );

        context.subscriptions.push(assetCompletionProvider, pythonCompletionProvider);
    }

    /**
     * Get asset data for a given file path, with caching
     */
    public async getAssetData(filePath: string): Promise<any> {
        try {
            if (this.assetCache.has(filePath)) {
                return this.assetCache.get(filePath);
            }

            const assetData = await this.getAssetDataInternal(filePath);
            
            if (assetData) {
                this.assetCache.set(filePath, assetData);
            }
            
            return assetData;
        } catch (error) {
            console.error('Error getting cached asset data:', error);
            return null;
        }
    }

    /**
     * Clear asset cache when files change
     */
    public clearCache(filePath?: string): void {
        if (filePath) {
            const entries = Array.from(this.assetCache.entries());
            entries.forEach(([assetPath, _]) => {
                if (filePath.startsWith(assetPath)) {
                    this.assetCache.delete(assetPath);
                }
            });
        } else {
            this.assetCache.clear();
        }
    }

    /**
     * Get materialization completions
     */
    public async getMaterializationCompletions(document: vscode.TextDocument, position: vscode.Position, currentFilePath: string): Promise<vscode.CompletionItem[]> {
        return this.materializationCompletions.getMaterializationCompletions(document, position, currentFilePath);
    }

    /**
     * Check if we're in materialization section
     */
    public isInMaterializationSection(document: vscode.TextDocument, position: vscode.Position): boolean {
        return this.materializationCompletions.isInMaterializationSection(document, position);
    }

    /**
     * Get column completions
     */
    public getColumnCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        return this.columnCompletions.getColumnSchemaCompletions(document, position);
    }

    /**
     * Check if we're in columns section
     */
    public isInColumnsSection(document: vscode.TextDocument, position: vscode.Position): boolean {
        return this.columnCompletions.isInColumnsSection(document, position);
    }

    /**
     * Get top-level completions
     */
    public getTopLevelCompletions(): vscode.CompletionItem[] {
        return this.topLevelCompletions.getTopLevelCompletions();
    }

    /**
     * Get asset type completions
     */
    public getAssetTypeCompletions(): vscode.CompletionItem[] {
        return this.topLevelCompletions.getAssetTypeCompletions();
    }

    /**
     * Get asset completions
     */
    public async getAssetCompletions(currentFilePath: string): Promise<vscode.CompletionItem[]> {
        return this.assetCompletions.getAssetCompletionsFromAsset(currentFilePath);
    }
}

/**
 * Completion provider for Bruin asset files using Bruin commands
 */
class BruinAssetCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private languageServer: BruinCompletionsWithCommands) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        
        // Check if we're at the top level (only show asset properties when we're defining new keys)
        const isTopLevel = linePrefix.match(/^\s{0,2}$/) && !linePrefix.includes(':');
        
        if (isTopLevel) {
            completions.push(...this.languageServer.getTopLevelCompletions());
        } else {
            // Check if we're in a depends section
            const { start, end } = getDependsSectionOffsets(document);
            
            if (start !== -1 && end !== -1) {
                const currentOffset = document.offsetAt(position);
                
                if (currentOffset >= start && currentOffset <= end) {
                    const assetCompletions = await this.languageServer.getAssetCompletions(document.fileName);
                    completions.push(...assetCompletions);
                }
            }
            
            // Check if we're in a columns section
            if (this.languageServer.isInColumnsSection(document, position)) {
                const columnCompletions = this.languageServer.getColumnCompletions(document, position);
                completions.push(...columnCompletions);
            }
            
            // Check if we're in materialization section
            if (this.languageServer.isInMaterializationSection(document, position)) {
                const materializationCompletions = await this.languageServer.getMaterializationCompletions(document, position, document.fileName);
                completions.push(...materializationCompletions);
            }
            
            if (linePrefix.includes('type:')) {
                completions.push(...this.languageServer.getAssetTypeCompletions());
            }
        }

        return completions;
    }
} 