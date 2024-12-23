# Extension commands

A quick run down of some of the important commands that can be run when at the root of the project.

```
npm run install:all      Install package dependencies for both the extension and Vue webview source code.
npm run start:webview    Runs the Vue webview source code in development mode. Open http://localhost:3000 to view it in the browser.
npm run build:webview    Build Vue webview source code. Must be executed before compiling or running the extension.
npm run compile          Compile VS Code extension.
```

# Testing

To ensure the quality and functionality of the extension, it is important to write and run unit tests. The project is set up to handle unit tests for both the webview and the extension.

## Webview Unit Tests

If you want to add unit tests for the webview, you need to add them under the `webview-ui` directory. The tests should be placed in the `test` directory within `webview-ui`.

### Running Webview Unit Tests

To run the webview unit tests, use the following command:

```
npm run test:webview
```

This command navigates to the `webview-ui` directory and runs the tests defined there.

## Extension Unit Tests

If you want to add unit tests for the extension, you need to add them under the `src` directory. The tests should be placed in the appropriate subdirectory within `src`.

### Running Extension Unit Tests

To run the extension unit tests, use the following command:

```
npm run test
```

This command runs the tests defined in the `src` directory.