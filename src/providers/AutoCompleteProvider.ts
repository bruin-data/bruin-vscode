import * as JSONSchemaForYAMLFiles from "../extension/schema.json";
import * as vscode from "vscode";
   
export class YAMLCompletionItemProvider implements vscode.CompletionItemProvider {
    private schema: any;

    constructor() {
        this.schema = JSONSchemaForYAMLFiles;
    }

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        
        if (this.schema.properties) {
            return Object.keys(this.schema.properties).map(prop => {
                const completionItem = new vscode.CompletionItem(prop, vscode.CompletionItemKind.Property);
                completionItem.detail = this.schema.properties[prop].description;
                return completionItem;
            });
        }

        return [];
    }
}

