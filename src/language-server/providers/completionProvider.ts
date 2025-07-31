import {
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { BRUIN_SCHEMA } from '../schemas/bruinSchema';
import { isInBruinBlock } from '../utils/bruinBlockUtils';
import { getCurrentWord, getYamlPath, isValuePosition, isAfterColon } from '../utils/textUtils';

/**
 * Handle materialization-specific completions
 */
function getMaterializationCompletions(
    document: TextDocument,
    position: TextDocumentPositionParams['position'],
    yamlPath: string[]
): CompletionItem[] {
    const currentKey = yamlPath[yamlPath.length - 1];
    const isAtValuePos = isValuePosition(document, position);

    // Check if we're positioned after "type:" in materialization block
    if (isAfterColon(document, position, 'type') || 
        (currentKey === 'type' && isAtValuePos)) {
        return BRUIN_SCHEMA.materializationTypes.map(t => ({
            label: t,
            kind: CompletionItemKind.Value,
            insertText: t,
            detail: `Materialization type: ${t}`
        }));
    }

    // Check if we're positioned after "strategy:" in materialization block
    if (isAfterColon(document, position, 'strategy') ||
        (currentKey === 'strategy' && isAtValuePos)) {
        return BRUIN_SCHEMA.tableStrategies.map(s => ({
            label: s,
            kind: CompletionItemKind.Value,
            insertText: s,
            detail: `Strategy: ${s}`
        }));
    }

    // Otherwise suggest nested materialization keys (when not at a value position)
    if (yamlPath.length === 1 || (yamlPath.length === 2 && !isAtValuePos)) {
        // Check if we're right after "materialization:" (need newline + indentation)
        // or already on an indented line (just need the key)
        const currentLine = document.getText({
            start: { line: position.line, character: 0 },
            end: position
        });
        
        const isAfterMaterializationColon = currentLine.trim() === 'materialization:';
        
        return BRUIN_SCHEMA.materializationKeys.map(k => ({
            label: k + ':',
            kind: CompletionItemKind.Property,
            insertText: isAfterMaterializationColon ? `\n  ${k}: ` : `${k}: `,
            detail: `Materialization config key`
        }));
    }

    return [];
}

/**
 * Handle top-level type completions
 */
function getTopLevelTypeCompletions(yamlPath: string[]): CompletionItem[] {
    if (yamlPath.length === 1 && yamlPath[0] === 'type') {
        return BRUIN_SCHEMA.assetTypes.map(type => ({
            label: type,
            kind: CompletionItemKind.Value,
            detail: `Asset type: ${type}`
        }));
    }
    return [];
}

/**
 * Handle top-level key completions
 */
function getTopLevelCompletions(): CompletionItem[] {
    return BRUIN_SCHEMA.topLevelKeys.map(keyInfo => ({
        label: keyInfo.key + ':',
        kind: CompletionItemKind.Property,
        detail: keyInfo.description,
        insertText: keyInfo.insertText
    }));
}

/**
 * Handle fuzzy matching fallback completions
 */
function getFuzzyMatchCompletions(currentWord: string): CompletionItem[] {
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
}

/**
 * Main completion provider function
 */
export function provideCompletions(
    document: TextDocument,
    params: TextDocumentPositionParams
): CompletionItem[] {
    // Only provide completions inside Bruin blocks
    if (!isInBruinBlock(document, params.position)) {
        return [];
    }

    const yamlPath = getYamlPath(document, params.position);
    const currentWord = getCurrentWord(document, params.position);

    // Handle nested materialization completions
    if (yamlPath[0] === 'materialization') {
        const materializationCompletions = getMaterializationCompletions(document, params.position, yamlPath);
        if (materializationCompletions.length > 0) {
            return materializationCompletions;
        }
    }
    
    // Handle top-level type completions
    const typeCompletions = getTopLevelTypeCompletions(yamlPath);
    if (typeCompletions.length > 0) {
        return typeCompletions;
    }

    // Handle top-level completions
    if (yamlPath.length === 0) {
        return getTopLevelCompletions();
    }

    // Fuzzy match fallback
    return getFuzzyMatchCompletions(currentWord);
}