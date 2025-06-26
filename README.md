# Bruin

Bruin is a unified analytics platform that enables data professionals to work end-to-end for their data pipelines. This extension is built to improve the development experience of data products on Bruin using Visual Studio Code.

## 🚀 Key Features

### Assets Details viewer
- Show and update asset details from the UI.
- Renders SQL content within a VS Code Webview.
- Copy SQL content with a single click.
- Auto-refreshes when the file is updated.
- Supports running and validating assets with options like `--downstream` and `--full-refresh` via checkboxes.
- Date inputs for selecting start and end dates for the `run` command.


![GIF of Asset Details Panel](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/asset-details-tab-new.gif?raw=true)

### Connections Management
- Display and manage connections integrated with Bruin CLI.
- Add, remove or duplicate connections directly from the UI.
- Test exsiting connections to ensure their validity.

![GIF of Connection Manager](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/manage-connections.gif?raw=true)

### Bruin Settings
- The *Settings* tab in the side panel provides a straightforward way to install and update the Bruin CLI.
- Access Bruin documentation or view system information with a single click.
![Screenshot of Settings Tab](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/bruin-settings.png?raw=true)

### Asset Lineage
- View and interact with the lineage of assets.
- Expand each node to see dependencies and easily access asset files.
- Toggle visibility for upstream and downstream assets.

![GIF of Lineage Panel](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/lineage-panel-with-options.gif?raw=true)

# Query Preview Panel
- Visualizes query execution results in a new panel.
- Displays formatted output for easier analysis.
- Supports multi-tab functionality to run different queries separately.

![GIF of Lineage Panel](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/query-preview-options.gif?raw=true)

### Autocomplete and Snippets
- Autocomplete support for `.bruin.yml`, `pipeline.yml`, and `*.asset.yml` files with predefined options and schema validations.
- Snippets for creating Bruin root configuration, pipelines, and assets.

## Installation

1. Open Visual Studio Code.
2. Navigate to the Extensions view (Ctrl+Shift+X).
3. Search for "Bruin" and click Install.

**Note**: Ensure that you have the Bruin CLI installed on your system before using the new features. For guidance on installing the Bruin CLI, please refer to the [official documentation](https://github.com/bruin-data/bruin).

## Release Notes
### Recent Update
- **0.51.7**: Added support and validation for the `private_key_path` field in Snowflake connections.
- **0.51.6**: Added support for `fill` asset dependencies and columns from DB.
- **0.51.5**: Added confirmation prompt before running with `full-refresh`.
- **0.51.4**: Fixed customCheck not showing on first render, added missing sensor types to the YAML schema, and expanded snippet completions.
- **0.51.3**: Enhanced Snowflake connection support with private key authentication, including validation and improved input handling.
- **0.51.2**: Enabled auto-saving for materialization changes, removing the manual save button.
- **0.51.1**: Fixed BQ connection updates and improved service account credential handling.
- **0.51.0**: Added inline "Preview" button using CodeLens for top-level queries in the editor.
- **0.50.8**: Added support for additional seed asset types in snippets, schema and UI.
- **0.50.7**: Added utility to format bruin run commands in a readable multi-line format.
- **0.50.6**: Improved tab rendering performance by switching to `v-if` and optimizing component caching, and cleaned up unused message handling code for better maintainability.
- **0.50.5**: [Pre-release] This version is for testing improved tab rendering.
- **0.50.4**: [Pre-release] This version is for testing improved tab rendering and code cleanup.
- **0.50.3**: Fix vscode publishing issue.
- **0.50.2**: Fix DateInput component to handle focus correctly and adjust SQL editor height.
- **0.50.1**: Fix auto format on initial interval modifiers rendering.
- **0.50.0**: Implement UI for adding and editing interval modifiers directly from the panel.
- **0.49.3**: Remove redundant update columns to fix toggle primary key issue.
- **0.49.2**: Cleaned the code and added detailed logging for patch asset command.
- **0.49.1**: Added the checkboxes extension settings  to control default enabled/disabled state.
- **0.49.0**: Added a checkbox to toggle the `--apply-interval-modifiers` flag, along with a warning when they are present in the asset but not enabled.
- **0.48.3**: Improved `partition-by` input to support both column selection and manual text entry.
- **0.48.2**: Updated `partition-by` and `cluster-by` to use a dropdown for selecting columns.
- **0.48.1**: Add DDL strategy to materialization tab and save primary key changes immediately.
- **0.48.0**: Add UI for Managing Owner and Tags in Materialization Tab.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
