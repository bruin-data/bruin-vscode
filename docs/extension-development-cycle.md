# Extension development cycle

The intended development cycle of this Vue-based webview extension is slightly different than that of other VS Code extensions.

Due to the fact that the `webview-ui` directory holds a self-contained Vue application we get to take advantage of some of the perks that that enables. In particular,

- UI development and iteration cycles can happen much more quickly by using Vite
- Dependency management and project configuration is hugely simplified


# Communication between Webview and Extension

The extension uses message passing to communicate between the webview front end and the backend. This is done using the `postMessage` method provided by the VS Code API. The webview can send messages to the extension, and the extension can send messages to the webview.

## Sending Messages from Webview to Extension

To send a message from the webview to the extension, use the `postMessage` method provided by the `acquireVsCodeApi` function. Here is an example:

```typescript
// In the webview JavaScript code
const vscode = acquireVsCodeApi();

// Send a message to the extension
vscode.postMessage({
  command: 'bruin.testConnection',
  payload: {
    environment: 'default',
    name: 'MyConnection',
    type: 'sql',
  }
});
```

## Handling Messages in the Extension

To handle messages sent from the webview, set up an event listener in the extension. Here is an example:

```typescript
// In the extension TypeScript code
import * as vscode from 'vscode';

...
  // Create and show a new webview panel
  const panel = vscode.window.createWebviewPanel(
    'bruin',
    'Bruin',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'bruin.testConnection':
          const { environment, name, type } = message.payload;
          // Handle the test connection command
          await testConnection(environment, name, type);
          break;
      }
    },
  );
}

async function testConnection(environment: string, name: string, type: string) {
  // Implement the logic to test the connection
  console.log(`Testing connection: ${name} in ${environment} of type ${type}`);
}
```

## Sending Messages from Extension to Webview

To send a message from the extension to the webview, use the `postMessage` method of the webview. Here is an example:

```typescript
// In the extension TypeScript code
panel.webview.postMessage({
  command: 'connectionTested',
  payload: {
    status: 'success',
    message: 'Connection tested successfully',
  }
});
```

## Handling Messages in the Webview

To handle messages sent from the extension, set up an event listener in the webview. Here is an example:

```typescript
// In the webview JavaScript code
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'connectionTested':
      const { status, message: msg } = message.payload;
      // Handle the connection tested message
      console.log(`Connection test status: ${status}, message: ${msg}`);
      break;
  }
});
```