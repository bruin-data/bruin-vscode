import * as vscode from "vscode";

export class QueryCodeLensProvider implements vscode.CodeLensProvider {
  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();

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
    const statements = this.parseStatements(maskedText);

    for (const statement of statements) {
      if (token.isCancellationRequested) {
        return codeLenses;
      }

      // Skip empty or whitespace-only statements
      if (!statement.text.trim()) {
        continue;
      }

      // Only show preview for SQL statements (SELECT, INSERT, UPDATE, DELETE, WITH, etc.)
      if (!this.isSqlStatement(statement.text)) {
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

      const startPos = document.positionAt(statement.startOffset);
      const endPos = document.positionAt(statement.endOffset);
      const queryRange = new vscode.Range(startPos, endPos);

      // Create CodeLens for each statement
      codeLenses.push(
        new vscode.CodeLens(queryRange, {
          title: "Preview",
          command: "bruin.runQuery",
          arguments: [document.uri, queryRange],
        })
      );
    }

    return codeLenses;
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


  private isSqlStatement(text: string): boolean {
    // Remove comments and trim
    const cleanText = text.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    
    // Check if it starts with common SQL keywords
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH', 'CREATE', 'DROP', 
      'ALTER', 'TRUNCATE', 'MERGE', 'UPSERT', 'REPLACE', 'CALL', 'EXEC'
    ];
    
    const firstWord = cleanText.split(/\s+/)[0]?.toUpperCase();
    return sqlKeywords.includes(firstWord || '');
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
}
