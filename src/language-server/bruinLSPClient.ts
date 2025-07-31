import * as path from 'path';
import * as vscode from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activateBruinLSP(context: vscode.ExtensionContext) {
    const serverModule = context.asAbsolutePath(
        path.join('out', 'language-server', 'bruinLSP.js')
    );
    
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file' }]
    };

    client = new LanguageClient(
        'bruinLanguageServer',
        'Bruin Language Server',
        serverOptions,
        clientOptions
    );
    
    client.start();
    context.subscriptions.push(client);
}

export function deactivateBruinLSP(): Thenable<void> | undefined {
    return client?.stop();
}