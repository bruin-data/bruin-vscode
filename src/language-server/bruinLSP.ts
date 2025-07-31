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
        { key: 'type', insertText: 'type: ', description: 'Asset type (bq.sql, sf.sql, python, etc.)' },
        { key: 'description', insertText: 'description: ', description: 'Human-readable description of the asset' },
        { key: 'materialization', insertText: 'materialization:\n  ', description: 'How the asset should be materialized' },
        { key: 'depends', insertText: 'depends:\n  - ', description: 'List of assets this asset depends on' },
        { key: 'columns', insertText: 'columns:\n  - name: ', description: 'Column definitions and data quality checks' }
    ],
    assetTypes: [
        'bq.sql', 'sf.sql', 'pg.sql', 'rs.sql', 'ms.sql', 'synapse.sql', 'python', 'ingestr'
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

// Check if we're after a colon for a specific key
function isAfterColon(document: TextDocument, position: Position, key: string): boolean {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character }
    });
    
    const trimmed = line.trim();
    return trimmed === `${key}:` || trimmed.endsWith(`${key}: `);
}

// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    
    if (!document || !isInBruinBlock(document, _textDocumentPosition.position)) {
        return [];
    }

    // Check if we're after "type:" and should show asset types (top-level)
    if (isAfterColon(document, _textDocumentPosition.position, 'type')) {
        return BRUIN_SCHEMA.assetTypes.map(type => ({
            label: type,
            kind: CompletionItemKind.Value,
            detail: `Bruin asset type: ${type}`
        }));
    }

    // Get current word and provide filtered completions
    const currentWord = getCurrentWord(document, _textDocumentPosition.position);
    
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

