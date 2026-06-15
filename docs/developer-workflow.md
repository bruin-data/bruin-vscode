# Extension commands & workflow

The extension (`src/`) and the Vue webview (`webview-ui/`) are separate npm projects. The webview must be **built before** the extension can load it, because they produce separate build outputs (`out/` and `webview-ui/build/`).

## Common commands

Run from the repo root unless noted.

```
npm run install:all      Install deps for BOTH the extension and the Vue webview.
npm run build:webview    Build the Vue webview + copy codicons → webview-ui/build. REQUIRED before compiling/running the extension.
npm run compile          Compile the extension (tsc -p ./) → out/.
npm run watch            Watch-compile the extension only.
npm run dev:watch        Watch the extension (tsc) and webview (vite) concurrently.
npm run start:webview    Run the Vue webview in the Vite dev server (browser).
npm run lint             Lint the extension (eslint src --ext ts).
npm run format           Format extension source with Prettier.
```

To debug, run `npm run build:webview`, then press **F5** in VS Code to launch the Extension Development Host.

## Testing

There are three test layers: extension unit tests, webview unit tests, and Selenium end-to-end UI tests.

### Webview unit tests

Webview tests live under `webview-ui/src/test`. Run them with:

```
npm run test:webview        # runs vitest inside webview-ui
```

Run a single webview test:

```
cd webview-ui && npx vitest run -t "test name"   # or pass a file path
```

### Extension unit tests

Extension tests live under `src/test`. The `pretest` hook compiles and lints first, then `@vscode/test-electron` runs the compiled specs (`out/test/**/*.test.js`):

```
npm test
```

### End-to-end UI tests (Selenium)

UI tests live under `src/ui-test` and run through `vscode-extension-tester`:

```
npm run selenium:run-tests:connections
npm run selenium:run-tests:ingestr
npm run selenium:run-tests:lineage
npm run selenium:run-tests:webview
npm run selenium:run-tests:query-preview
npm run selenium:run-tests:all
```

## Releasing

User-facing changes should be noted in the README "Release Notes" and `CHANGELOG.md`. Version tags are cut with `npm run tag:patch`, `npm run tag:minor`, or `npm run tag:major`.
