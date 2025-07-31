import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    Position
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Bruin asset schema
const BRUIN_SCHEMA = {
    topLevelKeys: [
        { key: 'type', insertText: 'type: ', description: 'Asset type' },
        { key: 'description', insertText: 'description: ', description: 'Human-readable description' },
        { key: 'materialization', insertText: 'materialization:\n  type: ', description: 'Materialization config' },
        { key: 'depends', insertText: 'depends:\n  - ', description: 'Dependencies' },
        { key: 'columns', insertText: 'columns:\n  - name: ', description: 'Column definitions' }
    ],
    assetTypes: ['bq.sql', 'sf.sql', 'pg.sql', 'rs.sql', 'ms.sql', 'synapse.sql', 'python', 'ingestr'],
    materializationTypes: ['table', 'view', 'none'],
    tableStrategies: [
        'create+replace', 'delete+insert', 'append', 'merge',
        'time_interval', 'ddl', 'scd2_by_time', 'scd2_by_column'
    ],
    materializationKeys: [
        'type', 'strategy', 'partition_by', 'cluster_by', 'incremental_key', 'time_granularity'
    ]
};


connection.onInitialize(() => ({
    capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
            triggerCharacters: [' ', ':', '\n', '-']
        }
    }
}));


// Find Bruin blocks in document
function findBruinBlocks(text: string): Array<{ start: number; end: number }> {
    const blocks: Array<{ start: number; end: number }> = [];
    const bruinStartRegex = /\/\*\s*@bruin/g;
    const bruinEndRegex = /@bruin\s*\*\//g;
    
    let startMatch;
    while ((startMatch = bruinStartRegex.exec(text)) !== null) {
        const start = startMatch.index + startMatch[0].length;
        
        bruinEndRegex.lastIndex = start;
        const endMatch = bruinEndRegex.exec(text);
        
        if (endMatch) {
            const end = endMatch.index;
            blocks.push({ start, end });
        }
    }
    
    return blocks;
}

// Check if position is in Bruin block
function isInBruinBlock(document: TextDocument, position: Position): boolean {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const blocks = findBruinBlocks(text);
    
    return blocks.some(block => offset >= block.start && offset <= block.end);
}

// Get current word being typed
function getCurrentWord(document: TextDocument, position: Position): string {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character }
    });
    
    const words = line.trim().split(/\s+/);
    return words[words.length - 1] || '';
}
function isValuePosition(document: TextDocument, position: Position): boolean {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: position
    });

    return line.trimEnd().endsWith(':') || line.includes(': ');
}

// Check if we're after a colon for a specific key
function isAfterColon(document: TextDocument, position: Position, key: string): boolean {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character }
    });
    
    const trimmed = line.trim();
    return trimmed === `${key}:` || trimmed.endsWith(`${key}: `);
}
function getYamlPath(document: TextDocument, position: Position): string[] {
    const lines = document.getText().split('\n');
    const pathStack: Array<{ indent: number, key: string }> = [];

    for (let i = 0; i <= position.line; i++) {
        const line = lines[i];
        const match = line.match(/^(\s*)([\w\-]+):/);
        if (!match) continue;

        const indent = match[1].length;
        const key = match[2];

        // Remove any deeper or same-level keys
        while (pathStack.length && pathStack[pathStack.length - 1].indent >= indent) {
            pathStack.pop();
        }

        pathStack.push({ indent, key });
    }

    // Try to infer context from current line's indent
    const currentLine = lines[position.line];
    const currentIndent = currentLine.match(/^(\s*)/)?.[1].length ?? 0;

    // If current line has no key, we still want to know what block we're in
    for (let i = pathStack.length - 1; i >= 0; i--) {
        if (pathStack[i].indent < currentIndent) {
            return pathStack.slice(0, i + 1).map(p => p.key);
        }
    }

    return pathStack.map(p => p.key);
}


// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document || !isInBruinBlock(document, _textDocumentPosition.position)) return [];

    const yamlPath = getYamlPath(document, _textDocumentPosition.position);
    const currentWord = getCurrentWord(document, _textDocumentPosition.position);

    // Nested materialization keys
    if (yamlPath[0] === 'materialization') {
        const currentKey = yamlPath[yamlPath.length - 1];
    
        // Suggest value for "type"
        if (currentKey === 'type' && isAfterColon(document, _textDocumentPosition.position, 'type')) {
            return BRUIN_SCHEMA.materializationTypes.map(t => ({
                label: t,
                kind: CompletionItemKind.Value,
                detail: `Materialization type: ${t}`
            }));
        }
    
        // Suggest value for "strategy"
        if (currentKey === 'strategy' && isValuePosition(document, _textDocumentPosition.position)) {
            return BRUIN_SCHEMA.tableStrategies.map(s => ({
                label: s,
                kind: CompletionItemKind.Value,
                detail: `Strategy: ${s}`
            }));
        }
    
        // Otherwise suggest nested materialization keys
        if (yamlPath.length === 1 || (yamlPath.length === 2 && !isValuePosition(document, _textDocumentPosition.position))) {
            return BRUIN_SCHEMA.materializationKeys.map(k => ({
                label: k + ':',
                kind: CompletionItemKind.Property,
                insertText: k + ': ',
                detail: `Materialization config key`
            }));
        }
    }
    
    // Top-level type: completion
    if (yamlPath.length === 1 && yamlPath[0] === 'type') {
        return BRUIN_SCHEMA.assetTypes.map(type => ({
            label: type,
            kind: CompletionItemKind.Value,
            detail: `Asset type: ${type}`
        }));
    }

    // Top-level completions
    if (yamlPath.length === 0) {
        return BRUIN_SCHEMA.topLevelKeys.map(keyInfo => ({
            label: keyInfo.key + ':',
            kind: CompletionItemKind.Property,
            detail: keyInfo.description,
            insertText: keyInfo.insertText
        }));
    }

    // Fuzzy match fallback
    const matchingKeys = BRUIN_SCHEMA.topLevelKeys.filter(keyInfo =>
        !currentWord || keyInfo.key.toLowerCase().startsWith(currentWord.toLowerCase())
    );

    return matchingKeys.map(keyInfo => ({
        label: keyInfo.key + ':',
        kind: CompletionItemKind.Property,
        detail: keyInfo.description,
        insertText: keyInfo.insertText,
        filterText: keyInfo.key
    }));
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

