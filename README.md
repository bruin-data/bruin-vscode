# Bruin

Bruin is a unified analytics platform that enables data professionals to work end-to-end for their data pipelines. This extension is built to improve the development experience of data products on Bruin using Visual Studio Code.

## 🚀 Key Features

### Assets Details viewer

- Show and update asset details from the UI.
- Renders SQL content within a VS Code Webview.
- Copy SQL content with a single click.
- Auto-refreshes when the file is updated.
- Supports running and validating assets with options like `--downstream` via checkboxes.
- Date inputs for selecting start and end dates for the `run` command.

![GIF of Asset Details Panel](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/asset-details-tab-new.gif?raw=true)

### Connections Management

- Display and manage connections integrated with Bruin CLI.
- Add, remove or duplicate connections directly from the UI.
- Test existing connections to ensure their validity.

![GIF of Connection Manager](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/manage-connections.gif?raw=true)

### Database Explorer

- Browse your connections, schemas, and tables from the **Databases** view in the activity bar.
- Refresh individual connections or schemas in place.
- Open table details (columns and metadata) for any table directly from the tree.

### Bruin Settings

- The _Settings_ tab in the side panel provides a straightforward way to install and update the Bruin CLI.
- Access Bruin documentation or view system information with a single click.
  ![Screenshot of Settings Tab](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/bruin-settings.png?raw=true)

### Asset Lineage

- View and interact with the lineage of assets.
- Expand each node to see dependencies and easily access asset files.
- Toggle visibility for upstream and downstream assets.

![GIF of Lineage Panel](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/lineage-panel-with-options.gif?raw=true)

### Query Preview Panel

- Visualizes query execution results in a new panel.
- Displays formatted output for easier analysis.
- Supports multi-tab functionality to run different queries separately.
- Preview a highlighted SQL snippet with the **Preview Selected Query** CodeLens or the `Ctrl+Shift+R` / `Cmd+Shift+R` shortcut.

![GIF of Lineage Panel](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/query-preview-options.gif?raw=true)

### Table Diff

- Compare two tables and view the differences side by side in a dedicated panel.

### Run History

- Review the history of your Bruin runs from the **Run History** panel.

### Autocomplete and Snippets

- Autocomplete support for `.bruin.yml`, `pipeline.yml`, and `*.asset.yml` files with predefined options and schema validations.
- Snippets for creating Bruin root configuration, pipelines, and assets.

#### Keyboard Shortcuts for Autocomplete

- **Manual Trigger**:
  - **Windows/Linux**: `Ctrl+Space`
  - **Mac**: `Option+Esc` (⌥+Esc)
- **Auto Trigger**: Completions appear automatically when typing `:` or `-` followed by a space

💡 **Tip**: If manual completion doesn't work with the default shortcuts, check your VS Code keyboard shortcuts by going to `File > Preferences > Keyboard Shortcuts` (or `Code > Preferences > Keyboard Shortcuts` on Mac) and search for "trigger suggest".

## Installation

1. Open Visual Studio Code.
2. Navigate to the Extensions view (Ctrl+Shift+X).
3. Search for "Bruin" and click Install.

**Note**: Ensure that you have the Bruin CLI installed on your system before using the new features. For guidance on installing the Bruin CLI, please refer to the [official documentation](https://github.com/bruin-data/bruin).

## Getting Started

After installing, run the **Bruin: Show Getting Started Walkthrough** command from the Command Palette to learn the essential features and shortcuts. The walkthrough also opens automatically the first time the extension is activated.

## Release Notes

### Recent Update
- **0.81.5**: Regenerated config-schema.json for all 136 connection types from the Bruin CLI, fixing Athena lint so profile-based connections validate correctly.
- **0.81.4**: Added multi-column sorting to the query preview results table — click headers to sort by several columns at once (most recently clicked is the primary key), with a "Sorted by" bar to flip direction, remove a column, or clear all.
- **0.81.3**: Recognized Tableau assets and synced the full set of Bruin CLI asset types, fixing validation errors and missing autocompletion for newer types.
- **0.81.2**: Fixed invalid schedule CodeLens labels for cron step patterns (e.g. `0 */6 * * *`) by generating them with `cronstrue`.
- **0.81.1**: Improved lineage panel performance — switching files no longer reloads the whole webview or leaks listeners, the hidden panel is retained so reopening is instant and shows the current asset, and the `+` expand button now zooms out to reveal newly added nodes.
- **0.81.0**: Added local backfill support with interval chunking — run backfills by splitting a date range into chunks (daily, weekly, monthly, etc.) with stop-on-failure option. Backfill runs are grouped in the Run History panel as expandable rows.
- **0.80.5**: Flattened the run variables UI — overrides appear inline under the run controls, all variables visible at once, with the "Variable overrides" toggle auto-enabled when an override is entered.
- **0.80.4**: Allowed `options` on MSSQL/Synapse connections in `.bruin.yml`; made connection environments collapsible (collapsed by default) with a connection count per environment.
- **0.80.3**: Added Fabric as a valid ingestr destination; updated dependencies.
- **0.80.2**: Added a connection picker to "Fill from DB" so columns can be filled from the source (or any other) connection, with auto-suggestion on ingestr assets.
- **0.80.1**: Added warning for `interval_modifiers` typos.
- **0.80.0**: Added variant selector to the asset panel for pipelines that declare variants. The selected variant is passed to `bruin run` as `--variant <name>`.
- **0.79.9**: Improved Ingestr asset display with edit/view mode toggle.

For a full changelog, see Bruin Extension [Changelog](https://github.com/bruin-data/bruin-vscode/blob/main/CHANGELOG.md).
