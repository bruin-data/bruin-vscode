# Extension structure

This document describes how the Bruin VS Code extension is organized. The project is split into two independently-managed halves:

- **`src/`** — the extension host ("backend"), a TypeScript Node app.
- **`webview-ui/`** — a self-contained Vue 3 + Vite app ("frontend") with its own `package.json`, `node_modules`, and `tsconfig.json`.

This separation strays from the typical VS Code extension layout, where extension and webview code are combined. Keeping them apart avoids dependency/config conflicts and lets the webview use the Vite dev server, so UI iteration doesn't require recompiling the extension.

## `src/` directory

The "backend" logic. Key subdirectories:

- **`extension/`** — activation entry point and command registration.
  - **`extension.ts`** — `activate()`/`deactivate()`. Registers all `bruin.*` commands, webview view providers, the connections tree, folding/CodeLens providers, and the language server; also runs CLI auto-update on activation and every 6 hours.
  - **`configuration.ts`** — reads `bruin.*` settings and reacts to configuration changes.
  - **`commands/`** — handlers for user-facing commands (render, lineage, manage connections/environments, query commands, CLI update, etc.).
- **`bruin/`** — one file per Bruin CLI subcommand (`bruinRender`, `bruinRun`, `bruinValidate`, `bruinConnections`, `bruinFlowLineage`, `bruinTableDiff`, …). All extend the abstract `BruinCommand` (`bruinCommand.ts`), which shells out to the `bruin` binary via `execFile`/`spawn`.
- **`panels/`** — the webview panel classes (see below).
- **`providers/`** — editor feature providers: folding ranges, CodeLens (query, query-selection, schedule), the activity-bar connections tree, and the executable-path service.
- **`language-server/`** — completion and validation providers for Bruin YAML/SQL assets (asset, column, custom-check, materialization, secrets, tag, top-level completions; materialization/query/tag validators).
- **`constants/`** — shared constants.
- **`types/`** — shared TypeScript types.
- **`utilities/`** — helpers (date/error handling, URI/nonce generation for webviews, data-diff parsing, etc.).
- **`test/`** — extension unit tests (run via `@vscode/test-electron`).
- **`ui-test/`** — Selenium end-to-end tests (run via `vscode-extension-tester`).

### `panels/` directory

Each panel is a class that manages one webview surface: creating/rendering it, loading its HTML (which references the built Vue bundle in `webview-ui/build/`), wiring `postMessage` listeners for webview ↔ extension communication, and disposing resources on close.

| Panel class | VS Code surface | Vue entry (`webview-ui/`) |
|---|---|---|
| `BruinPanel` | editor `WebviewPanel` (singleton), the main asset-details view | `index.html` → `App.vue` |
| `AssetLineagePanel` (`LineagePanel.ts`) | bottom-panel `WebviewViewProvider` | `lineage/` → `AssetLineage.vue` |
| `QueryPreviewPanel` | bottom-panel `WebviewViewProvider` | `query-preview/` → `QueryPreviewApp.vue` |
| `TableDiffPanel` | bottom-panel `WebviewViewProvider` | `table-diff/` → `TableDiffApp.vue` |
| `RunHistoryPanel` | bottom-panel `WebviewViewProvider` | `run-history/` → `RunHistoryApp.vue` |
| `TableDetailsPanel` | on-demand `WebviewPanel` | — |

## `webview-ui/` directory

All of the Vue-based webview source. It contains its own `package.json`, `node_modules`, `tsconfig.json`, and Vite config, separate from the root extension.

`vite.config` declares one `rollupOptions.input` entry per webview surface (`index`, `lineage`, `queryPreview`, `tableDiff`, `runHistory`), each backed by its own `index.html` and root `*.vue` app component. **Adding a webview means adding both a panel class in `src/panels/` and a Vite input here.** Builds output to `webview-ui/build/`, which the panels load from.

### Subdirectories in `webview-ui/src`

- **`components/`** — Vue single-file components grouped by feature: `asset`, `connections`, `lineage-flow`, `lineage-text`, `query-output`, `table-diff`, `bruin-settings`, and shared `ui` components.
- **`store/`** — `bruinStore.ts`, the central Pinia store for webview state.
- **`composables/`** — reusable composition functions:
  - **`useLineage.ts`** — listens for lineage messages from the extension, processes the data, and exposes computed properties.
  - **`useParseAsset.ts`** — listens for asset-parse results and exposes reactive properties.
- **`utilities/`** — helpers, including `helper.ts` (dates, errors), `getPipelineLineage.ts` (parse pipeline data / asset dependencies), and `graphGenerator.ts` (build upstream/downstream graph data).
- **`services/`** — e.g. `RudderStackService.ts` (telemetry).
- **`composables`, `lib`, `constants`, `types`, `assets`** — supporting modules.
- Root app components: `App.vue`, `AssetLineage.vue`, `QueryPreviewApp.vue`, `RunHistoryApp.vue`, `TableDiffApp.vue` (one per Vite entry).
