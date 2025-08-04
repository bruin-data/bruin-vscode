import * as vscode from 'vscode';
import { getDependsSectionOffsets } from '../utilities/helperUtils';
import { BruinInternalParse } from '../bruin/bruinInternalParse';
import { getBruinExecutablePath } from '../providers/BruinExecutableService';
import { MaterializationCompletions, ColumnCompletions, TopLevelCompletions, AssetCompletions, MaterializationValidator } from './providers';

export class BruinLanguageServer {
    private assetCache: Map<string, any> = new Map();
    private static instance: BruinLanguageServer;
    private materializationCompletions: MaterializationCompletions;
    private columnCompletions: ColumnCompletions;
    private topLevelCompletions: TopLevelCompletions;
    private assetCompletions: AssetCompletions;
    private materializationValidator: MaterializationValidator;

    constructor() {
        // Subscribe to panel messages to capture parse results
        this.setupPanelMessageListener();
        
        // Initialize completion providers
        this.materializationCompletions = new MaterializationCompletions(this.getAssetData.bind(this));
        this.columnCompletions = new ColumnCompletions();
        this.topLevelCompletions = new TopLevelCompletions();
        this.assetCompletions = new AssetCompletions(this.getAssetData.bind(this));
        this.materializationValidator = new MaterializationValidator();
    }

    public static getInstance(): BruinLanguageServer {
        if (!BruinLanguageServer.instance) {
            BruinLanguageServer.instance = new BruinLanguageServer();
        }
        return BruinLanguageServer.instance;
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
        const triggerCharacters = [
            ':', ' ', '\n', '-', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
        ];

        // Register document link provider to make dependencies clickable
        const linkProvider = vscode.languages.registerDocumentLinkProvider(
            [
                { language: 'yaml' },
                { language: 'sql' },
                { language: 'python' }
            ],
            new BruinDocumentLinkProvider(this)
        );

        // Register for YAML files (standalone asset files)
        const yamlCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { language: 'yaml' },
            new BruinAssetCompletionProvider(this),
            ...triggerCharacters
        );

        // Register for SQL files (asset metadata in comments)
        const sqlCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { language: 'sql' },
            new BruinAssetCompletionProvider(this),
            ...triggerCharacters
        );

        // Register for Python files (asset metadata in docstrings)
        const pythonCompletionProvider = vscode.languages.registerCompletionItemProvider(
            { language: 'python' },
            new BruinAssetCompletionProvider(this),
            ...triggerCharacters
        );

        // Register diagnostic provider for validation
        const diagnosticsCollection = vscode.languages.createDiagnosticCollection('bruin-materialization');
        const diagnosticProvider = new BruinDiagnosticProvider(this, diagnosticsCollection);
        
        // Set up document change listener for real-time validation
        const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.languageId === 'yaml' || 
                event.document.languageId === 'sql' || 
                event.document.languageId === 'python') {
                diagnosticProvider.updateDiagnostics(event.document);
            }
        });

        // Set up document open listener
        const documentOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
            if (document.languageId === 'yaml' || 
                document.languageId === 'sql' || 
                document.languageId === 'python') {
                diagnosticProvider.updateDiagnostics(document);
            }
        });

        context.subscriptions.push(
            linkProvider,
            yamlCompletionProvider, 
            sqlCompletionProvider,
            pythonCompletionProvider,
            diagnosticsCollection,
            documentChangeListener,
            documentOpenListener
        );
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

    /**
     * Validate materialization in document
     */
    public validateMaterialization(document: vscode.TextDocument): vscode.Diagnostic[] {
        return this.materializationValidator.validateMaterialization(document);
    }

    /**
     * Get dependency completions using pipeline data
     */
    public async getDependencyCompletions(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const lineText = document.lineAt(position.line).text;
        const trimmedLine = lineText.trim();
        
        // Only show completions for dependency lines (starting with - or containing -)
        if (!trimmedLine.startsWith('-') && !lineText.includes('-')) {
            return [];
        }

        try {
            const pipelineData = await this.getPipelineData(document.fileName);
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
                
                // If we're already on a line with -, just insert the asset name
                if (trimmedLine.startsWith('-')) {
                    completion.insertText = assetName;
                } else {
                    // If we're adding a new dependency item, add proper formatting
                    completion.insertText = `- ${assetName}`;
                }
                
                completion.filterText = assetName;

                completions.push(completion);
            }

            return completions;
        } catch (error) {
            console.error('Error providing dependency completions:', error);
            return [];
        }
    }

    /**
     * Get dependency structure completions (right after "depends:")
     */
    public async getDependencyStructureCompletions(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        try {
            const pipelineData = await this.getPipelineData(document.fileName);
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
                
                // Create new line with proper indentation, - prefix, and asset name
                completion.insertText = new vscode.SnippetString(`\n  - ${assetName}`);
                completion.filterText = assetName;

                completions.push(completion);
            }

            return completions;
        } catch (error) {
            console.error('Error providing dependency structure completions:', error);
            return [];
        }
    }

    /**
     * Get pipeline data for dependency completions
     */
    private async getPipelineData(filePath: string): Promise<any> {
        try {
            const BruinLineageInternalParse = require('../bruin/bruinFlowLineage').BruinLineageInternalParse;
            const getCurrentPipelinePath = require('../bruin/bruinUtils').getCurrentPipelinePath;
            const getBruinExecutablePath = require('../providers/BruinExecutableService').getBruinExecutablePath;
            
            const pipelinePath = await getCurrentPipelinePath(filePath) as string;
            const pipelineParser = new BruinLineageInternalParse(getBruinExecutablePath(), "");
            const pipelineResult = await pipelineParser.parsePipelineConfig(pipelinePath);
            
            return pipelineResult.raw;
        } catch (error) {
            console.error('Error getting pipeline data for dependencies:', error);
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
}

/**
 * Diagnostic provider for Bruin materialization validation
 */
class BruinDiagnosticProvider {
    constructor(
        private languageServer: BruinLanguageServer,
        private diagnosticsCollection: vscode.DiagnosticCollection
    ) {}

    public updateDiagnostics(document: vscode.TextDocument): void {
        const diagnostics = this.languageServer.validateMaterialization(document);
        this.diagnosticsCollection.set(document.uri, diagnostics);
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
 * Completion provider for Bruin asset files using Bruin commands
 */
class BruinAssetCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private languageServer: BruinLanguageServer) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        
        // Priority order: Check specific contexts first to avoid mixed suggestions
        
        // 1. Check if we're in materialization section first (highest priority)
        if (this.languageServer.isInMaterializationSection(document, position)) {
            const materializationCompletions = await this.languageServer.getMaterializationCompletions(document, position, document.fileName);
            completions.push(...materializationCompletions);
            return completions; // Return only materialization completions
        }
        
        // 2. Check if we're in columns section
        if (this.languageServer.isInColumnsSection(document, position)) {
            const columnCompletions = this.languageServer.getColumnCompletions(document, position);
            completions.push(...columnCompletions);
            return completions; // Return only column completions
        }
        
        // 3. Check if we're in depends section - use proper dependency completions
        const { start, end } = getDependsSectionOffsets(document);
        if (start !== -1 && end !== -1) {
            const currentOffset = document.offsetAt(position);
            
            if (currentOffset >= start && currentOffset <= end) {
                const dependencyCompletions = await this.languageServer.getDependencyCompletions(document, position);
                completions.push(...dependencyCompletions);
                return completions; // Return only dependency completions
            }
        }

        // Check if we're right after "depends:" and should show dependency structure
        if (linePrefix.match(/depends:\s*$/)) {
            const dependencyCompletions = await this.languageServer.getDependencyStructureCompletions(document, position);
            completions.push(...dependencyCompletions);
            return completions;
        }
        
        // 4. Check for type: completions
        if (linePrefix.includes('type:') && linePrefix.match(/type:\s*$/)) {
            completions.push(...this.languageServer.getAssetTypeCompletions());
            return completions; // Return only type completions
        }

        // 5. Check if we're at the top level (only show asset properties when we're defining new keys)
        const isTopLevel = linePrefix.match(/^\s{0,2}$/) && !linePrefix.includes(':');
        
        if (isTopLevel) {
            // Only show top-level completions at root level
            completions.push(...this.languageServer.getTopLevelCompletions());
            return completions;
        }

        // If no specific context matched, return empty to avoid clutter
        return completions;
    }
} 