import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    CompletionItem,
    TextDocumentPositionParams,
    TextDocumentSyncKind
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { provideCompletions } from './providers/completionProvider';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Schema and utilities are now imported from separate modules


connection.onInitialize(() => ({
    capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
            triggerCharacters: [' ', ':', '\n', '-', '  ']
        }
    }
}));



// This handler provides the initial list of the completion items.
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) return [];

    return provideCompletions(document, _textDocumentPosition);
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

