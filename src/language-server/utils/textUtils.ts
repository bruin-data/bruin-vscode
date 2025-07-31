import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position } from 'vscode-languageserver/node';

export interface YamlPathItem {
    indent: number;
    key: string;
}

/**
 * Get the current word being typed at the cursor position
 */
export function getCurrentWord(document: TextDocument, position: Position): string {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character }
    });
    
    const words = line.trim().split(/\s+/);
    return words[words.length - 1] || '';
}

/**
 * Check if the cursor is positioned after a colon (indicating a value position)
 */
export function isValuePosition(document: TextDocument, position: Position): boolean {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: position
    });

    return line.trimEnd().endsWith(':') || line.includes(': ');
}

/**
 * Check if we're positioned after a colon for a specific key
 */
export function isAfterColon(document: TextDocument, position: Position, key: string): boolean {
    const line = document.getText({
        start: { line: position.line, character: 0 },
        end: { line: position.line, character: position.character }
    });
    
    const trimmed = line.trim();
    return trimmed === `${key}:` || trimmed.endsWith(`${key}: `);
}

/**
 * Get the YAML path (nested key structure) at the current position
 * Returns an array of keys representing the nested structure
 */
export function getYamlPath(document: TextDocument, position: Position): string[] {
    const lines = document.getText().split('\n');
    const pathStack: YamlPathItem[] = [];

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