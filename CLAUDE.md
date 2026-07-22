# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Bruin VS Code extension. It is a thin VS Code UI layer over the external **Bruin CLI** (`bruin` binary) — almost every data operation (render, run, validate, lineage, connections, query preview, table diff) shells out to the CLI and renders the result. The repo is split into two independently-managed halves:

- **`src/`** — the extension host ("backend"), a TypeScript Node app. Entry point `src/extension/extension.ts` (compiled to `out/extension/extension.js`, the `main` in `package.json`).
- **`webview-ui/`** — a self-contained Vue 3 + Vite app ("frontend") with its **own** `package.json`, `node_modules`, and `tsconfig.json`. Treat it as a separate project; run npm commands from inside it.

## Commands

Run from the repo root unless noted. The webview must be built before the extension can load — `out/` (extension) and `webview-ui/build/` (UI) are separate build outputs.

```
npm run install:all       # install deps for BOTH root and webview-ui
npm run build:webview      # build Vue UI + copy codicons → webview-ui/build (REQUIRED before compile/run)
npm run compile            # tsc -p ./  → out/
npm run watch              # tsc watch (extension only)
npm run dev:watch          # concurrently watch extension (tsc) + webview (vite)
npm run start:webview      # Vite dev server for the webview in a browser
npm run lint               # eslint src --ext ts
npm run format             # prettier --write src/**/*.ts
```

Press **F5** in VS Code to launch the Extension Development Host (after `build:webview`).

### Tests

```
npm test                   # extension tests (compiles + lints via pretest, then @vscode/test-electron on out/test/**/*.test.js)
npm run test:webview       # webview unit tests (vitest, runs inside webview-ui)
npm run selenium:run-tests:<connections|ingestr|lineage|webview|query-preview|all>   # E2E UI tests via vscode-extension-tester (out/ui-test/*)
```

- **Single webview test:** `cd webview-ui && npx vitest run -t "test name"` (or pass a file path).
- Extension unit tests live in `src/test/`; webview unit tests in `webview-ui/src/test/`. Selenium/E2E specs are `src/ui-test/`.
- Extension command logging is silenced in tests via `BruinCommand.isTestMode = true`.

## Architecture

### CLI command layer (`src/bruin/`)
All CLI invocations go through the abstract `BruinCommand` (`src/bruin/bruinCommand.ts`). Subclasses (`bruinRender`, `bruinRun`, `bruinValidate`, `bruinConnections`, `bruinFlowLineage`, `bruinTableDiff`, etc.) implement `bruinCommand()` to name the subcommand; the base builds args (`options + subcommand + flags`) and runs the binary with `execFile` (`run()`) or `spawn` (`runCancellable()`, used for long-running streaming operations like `run`). Output is stripped of ANSI colors before being returned. To add a CLI-backed feature, subclass `BruinCommand` rather than calling `child_process` directly.

### Panels / webviews (`src/panels/`)
Six webview surfaces, each pairing an extension-side class with a Vue entry point:

| Panel class | VS Code surface | Vue entry (`webview-ui/`) |
|---|---|---|
| `BruinPanel` | editor `WebviewPanel` (singleton `currentPanel`), the main asset-details view | `index.html` → `App.vue` |
| `AssetLineagePanel` (`LineagePanel.ts`) | `WebviewViewProvider`, bottom panel | `lineage/` → `AssetLineage.vue` |
| `QueryPreviewPanel` | `WebviewViewProvider`, bottom panel | `query-preview/` → `QueryPreviewApp.vue` |
| `TableDiffPanel` | `WebviewViewProvider`, bottom panel | `table-diff/` → `TableDiffApp.vue` |
| `RunHistoryPanel` | `WebviewViewProvider`, bottom panel | `run-history/` → `RunHistoryApp.vue` |
| `TableDetailsPanel` | on-demand `WebviewPanel` (rendered from `bruin.showTableDetails`) | — |

Panels load their HTML from `webview-ui/build/` and reference the hashed Vite bundle for that entry. `vite.config` declares one `rollupOptions.input` per entry above — **adding a webview means adding both a panel class and a Vite input.**

### Extension ↔ webview communication
Pure `postMessage`. Webview → extension: the Vue app posts `{ command, payload }` and the panel's `onDidReceiveMessage` switches on `command`. Extension → webview: panels call `webview.postMessage(...)`; several panels expose static helpers (e.g. `QueryPreviewPanel.postMessage`, `BruinPanel.currentPanel.postVersionStatus`) so commands and background tasks can push updates without holding a panel reference.

### Activation (`src/extension/extension.ts`)
`activate()` registers: all `bruin.*` commands (`src/extension/commands/`), webview view providers, the connections tree (`ActivityBarConnectionsProvider`), folding range provider, CodeLens providers (query, query-selection, schedule), and the language server. It also kicks off a non-blocking CLI auto-update and a 6-hour periodic version check (gated by `bruin.cli.autoUpdate`). Telemetry (RudderStack) is initialized lazily and is opt-out via `bruin.telemetry.enabled`.

### Language server (`src/language-server/`)
`BruinLanguageServer` (singleton) registers completion + validation providers for Bruin YAML and SQL assets: asset/column/custom-check/materialization/secrets/tag/top-level completions and materialization/query/tag validators. YAML schema validation for `.bruin.yml`, `pipeline.yml`, and `*.asset.yml` is wired declaratively through `contributes.yamlValidation` in `package.json` (depends on the `redhat.vscode-yaml` extension) using the JSON schemas in `schemas/`.

### Webview UI (`webview-ui/src/`)
Vue 3 SFCs with a Pinia store (`store/bruinStore.ts`) as the central state. Lineage graphs use Vue Flow + elkjs (`utilities/graphGenerator.ts`, `composables/useLineage.ts`); asset parsing flows through `composables/useParseAsset.ts`. Components are grouped by feature under `components/` (`asset`, `connections`, `lineage-flow`, `query-output`, `table-diff`, `bruin-settings`, `ui`).

## Conventions

- The webview is a separate npm project — when changing UI deps or configs, do it in `webview-ui/`, and remember to `build:webview` before the extension picks up changes.
- New CLI features: subclass `BruinCommand`. New user-facing actions: register a `bruin.*` command in `extension.ts` and declare it under `contributes.commands` in `package.json`.
- User-facing changes should be reflected in the README "Release Notes" and `CHANGELOG.md`; version tags are cut with `npm run tag:patch|minor|major`.
