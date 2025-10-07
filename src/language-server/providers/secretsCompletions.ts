import * as vscode from 'vscode';

export class SecretsCompletions {
    /**
     * Check if we're in the secrets section
     */
    public isInSecretsSection(document: vscode.TextDocument, position: vscode.Position): boolean {
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        
        // Look for "secrets:" in the current line or previous lines
        for (let i = position.line; i >= 0; i--) {
            const currentLine = document.lineAt(i).text;
            const trimmedLine = currentLine.trim();
            
            // If we find "secrets:" and we're at the same or deeper indentation level
            if (trimmedLine === 'secrets:' || trimmedLine.startsWith('secrets:')) {
                // Check if we're at the right indentation level (secrets section)
                const secretsIndent = currentLine.indexOf('secrets:');
                const currentIndent = lineText.search(/\S/);
                
                // We're in secrets section if we're at the same or deeper indentation
                return currentIndent >= secretsIndent;
            }
            
            // If we hit a line with less indentation that's not empty, we're not in secrets section
            if (trimmedLine && currentLine.search(/\S/) < lineText.search(/\S/)) {
                break;
            }
        }
        
        return false;
    }

    /**
     * Get secrets completions
     */
    public getSecretsCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const lineText = document.lineAt(position.line).text;
        const linePrefix = lineText.substring(0, position.character);
        const trimmedLine = lineText.trim();
        
        // Check if we're right after "secrets:" or in a secrets list item
        if (linePrefix.match(/secrets:\s*$/) || linePrefix.match(/^\s*-\s*$/)) {
            // Provide the secrets structure template
            const completion = new vscode.CompletionItem('secret item', vscode.CompletionItemKind.Snippet);
            completion.detail = 'Secret mapping template';
            completion.documentation = new vscode.MarkdownString(
                '**Secret Mapping**\n\n' +
                'Template for defining a secret mapping with key and injection method.'
            );
            
            if (linePrefix.match(/secrets:\s*$/)) {
                // We're right after "secrets:", add the full structure
                completion.insertText = new vscode.SnippetString('\n  - key: ${1:connection_name}\n    inject_as: ${2:creds}');
            } else {
                // We're after "-", just add the secret item structure
                completion.insertText = new vscode.SnippetString('key: ${1:connection_name}\n  inject_as: ${2:creds}');
            }
            
            completions.push(completion);
        }
        
        // Check if we're in a secret item and need property completions
        else if (this.isInSecretsSection(document, position)) {
            // Check if we're after "key:" or "inject_as:"
            if (linePrefix.match(/^\s*-\s*$/) || linePrefix.match(/^\s*key:\s*$/) || linePrefix.match(/^\s*inject_as:\s*$/)) {
                // Provide key property
                const keyCompletion = new vscode.CompletionItem('key', vscode.CompletionItemKind.Property);
                keyCompletion.detail = 'Secret key name';
                keyCompletion.documentation = new vscode.MarkdownString('**key**\n\nThe name of the secret key (e.g., connection_name)');
                keyCompletion.insertText = 'key: ${1:connection_name}';
                completions.push(keyCompletion);
                
                // Provide inject_as property
                const injectAsCompletion = new vscode.CompletionItem('inject_as', vscode.CompletionItemKind.Property);
                injectAsCompletion.detail = 'Injection method';
                injectAsCompletion.documentation = new vscode.MarkdownString('**inject_as**\n\nThe method to inject the secret (e.g., creds)');
                injectAsCompletion.insertText = 'inject_as: ${1:creds}';
                completions.push(injectAsCompletion);
            }
        }
        
        return completions;
    }
}