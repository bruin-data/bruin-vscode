import * as vscode from "vscode";
import { isBruinSqlAsset } from "../utilities/helperUtils";

interface ParsedStatementsCache {
  text: string;
  textHash: string;
  statements: Array<{text: string, startOffset: number, endOffset: number}>;
  timestamp: number;
}

// Simple hash function for string content
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

export class QueryCodeLensProvider implements vscode.CodeLensProvider {
  private parseCache = new Map<string, ParsedStatementsCache>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 100;

  public async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

    // Check if this is an asset file
    const isAsset = await isBruinSqlAsset(document.fileName);

    // Identify all Bruin metadata blocks and their positions
    const bruinBlocks: vscode.Range[] = [];
    const bruinBlockRegex = /\/\*\s*@bruin[\s\S]*?@bruin\s*\*\//g;
    let blockMatch;
    while ((blockMatch = bruinBlockRegex.exec(text)) !== null) {
      const startPos = document.positionAt(blockMatch.index);
      const endPos = document.positionAt(blockMatch.index + blockMatch[0].length);
      bruinBlocks.push(new vscode.Range(startPos, endPos));
    }

    // Create a mask of the text to ignore Bruin blocks
    let maskedText = text;
    for (let i = bruinBlocks.length - 1; i >= 0; i--) {
      const block = bruinBlocks[i];
      const startOffset = document.offsetAt(block.start);
      const endOffset = document.offsetAt(block.end);
      maskedText =
        maskedText.substring(0, startOffset) +
        " ".repeat(endOffset - startOffset) +
        maskedText.substring(endOffset);
    }

    // Search for SQL statements separated by semicolons in the masked text
    // This regex finds statements that end with semicolon or end of file
    const statements = this.parseStatementsWithCache(document.uri.fsPath, maskedText);

    for (const [idx, statement] of statements.entries()) {
      if (token.isCancellationRequested) {
        return codeLenses;
      }

      // Skip empty or whitespace-only statements
      if (!statement.text.trim()) {
        continue;
      }

      // Skip statements that are entirely comments (no SQL content)
      const trimmed = statement.text.trim();
      if (this.isOnlyComments(trimmed)) {
        continue;
      }

      // Skip if it's a subquery within parentheses
      if (this.isSubquery(maskedText, statement.startOffset)) {
        continue;
      }

      // Skip if statement is inside a Bruin block
      const statementStart = document.positionAt(statement.startOffset);
      if (this.isInsideBruinBlock(statementStart, bruinBlocks)) {
        continue;
      }

      // Find the actual SQL start position by searching for the first non-comment line
      const statementText = statement.text;
      const lines = statementText.split('\n');
      let sqlStartLine = 0;
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        if (trimmedLine && !trimmedLine.startsWith('--') && !(trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/'))) {
          sqlStartLine = i;
          break;
        }
      }
      // Calculate the position in the document
      const statementStartPos = document.positionAt(statement.startOffset);
      const sqlStartPos = new vscode.Position(statementStartPos.line + sqlStartLine, 0);
      const endPos = document.positionAt(statement.endOffset);
      const queryRange = new vscode.Range(sqlStartPos, endPos);

      // Create CodeLens for each statement
      codeLenses.push(
        new vscode.CodeLens(queryRange, {
          title: "Preview",
          command: "bruin.runQuery",
          arguments: [document.uri, queryRange, isAsset, statements.length, statement.text],
        })
      );
    }

    return codeLenses;
  }

  private parseStatementsWithCache(filePath: string, text: string): Array<{text: string, startOffset: number, endOffset: number}> {
    const textHash = simpleHash(text);
    const cacheKey = filePath;
    const now = Date.now();
    
    // Check cache first
    const cached = this.parseCache.get(cacheKey);
    if (cached && cached.textHash === textHash && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.statements;
    }
    
    // Parse statements
    const statements = this.parseStatements(text);
    
    // Clean up cache if too large
    if (this.parseCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.parseCache.keys().next().value;
      if (typeof oldestKey === 'string') {
        this.parseCache.delete(oldestKey);
      }
    }
    
    // Cache results
    this.parseCache.set(cacheKey, {
      text,
      textHash,
      statements,
      timestamp: now
    });
    
    return statements;
  }

  private parseStatements(text: string): Array<{text: string, startOffset: number, endOffset: number}> {
    const statements: Array<{text: string, startOffset: number, endOffset: number}> = [];
    let currentStatement = '';
    let statementStartOffset = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBlockComment = false;
    let inLineComment = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = i < text.length - 1 ? text[i + 1] : '';
      const prevChar = i > 0 ? text[i - 1] : '';

      // Track the start of a new statement
      if (!currentStatement.trim() && char.trim()) {
        statementStartOffset = i;
      }

      // Handle line endings - reset line comment state
      if (char === '\n') {
        inLineComment = false;
      }

      // Handle comments
      if (!inSingleQuote && !inDoubleQuote) {
        // Start of line comment
        if (char === '-' && nextChar === '-' && !inBlockComment) {
          inLineComment = true;
          currentStatement += char;
          continue;
        }
        
        // Start of block comment
        if (char === '/' && nextChar === '*' && !inLineComment) {
          inBlockComment = true;
          currentStatement += char;
          continue;
        }
        
        // End of block comment
        if (char === '*' && nextChar === '/' && inBlockComment) {
          inBlockComment = false;
          currentStatement += char;
          i++; // Skip the '/'
          currentStatement += '/';
          continue;
        }
      }

      // Skip characters that are part of line comments
      if (inLineComment) {
        currentStatement += char;
        continue;
      }

      // Handle string literals (only if not in comments)
      if (!inLineComment && !inBlockComment) {
        if (char === "'" && prevChar !== '\\') {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && prevChar !== '\\') {
          inDoubleQuote = !inDoubleQuote;
        }
      }

      currentStatement += char;

      // Check for statement terminator (semicolon)
      if (char === ';' && !inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment) {
        // Found end of statement
        if (currentStatement.trim()) {
          statements.push({
            text: currentStatement.trim(),
            startOffset: statementStartOffset,
            endOffset: i + 1
          });
        }
        
        currentStatement = '';
        // Next statement will start after this semicolon
      }
    }

    // Handle final statement without semicolon
    if (currentStatement.trim()) {
      statements.push({
        text: currentStatement.trim(),
        startOffset: statementStartOffset,
        endOffset: text.length
      });
    }

    return statements;
  }

  private isInsideBruinBlock(position: vscode.Position, bruinBlocks: vscode.Range[]): boolean {
    return bruinBlocks.some(block => block.contains(position));
  }

  private isSubquery(text: string, selectPos: number): boolean {
    const textBefore = text.substring(0, selectPos);
    const openParens = (textBefore.match(/\(/g) || []).length;
    const closeParens = (textBefore.match(/\)/g) || []).length;
    return openParens > closeParens;
  }

  private isOnlyComments(text: string): boolean {
    // Split text into lines and check if any line contains non-comment content
    const lines = text.split('\n');
    let hasNonCommentContent = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }
      
      // Check if line is a line comment
      if (trimmedLine.startsWith('--')) {
        continue;
      }
      
      // Check if line is inside a block comment
      // For simplicity, we'll assume block comments are on separate lines
      if (trimmedLine.startsWith('/*') && trimmedLine.endsWith('*/')) {
        continue;
      }
      
      // If we find any line that's not a comment or empty, this is not only comments
      hasNonCommentContent = true;
      break;
    }
    
    // Return true if no non-comment content was found
    return !hasNonCommentContent;
  }
}
