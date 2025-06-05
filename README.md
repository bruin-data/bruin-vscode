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
### Latest Release: 0.49.1
- Added the checkboxes extension settings  to control default enabled/disabled state.

### Recent Updates
- **0.49.0**: Added a checkbox to toggle the `--apply-interval-modifiers` flag, along with a warning when they are present in the asset but not enabled.
- **0.48.3**: Improved `partition-by` input to support both column selection and manual text entry.
- **0.48.2**: Updated `partition-by` and `cluster-by` to use a dropdown for selecting columns.
- **0.48.1**: Add DDL strategy to materialization tab and save primary key changes immediately.
- **0.48.0**: Add UI for Managing Owner and Tags in Materialization Tab.
- **0.47.6**: Debounce asset conversion detection and add telemetry for convert message.
- **0.47.5**: Trim whitespace from connection form input values and fix asset name editing.
- **0.47.4**: Fix Convert Message Showing for Existing Assets
- **0.47.3**: Fix Convert Message Showing for Existing Assets
- **0.47.2**: Added ingestr asset snippet for initializing Bruin ingestr assets easily.
- **0.47.1**: Improve materialization UI and fix issues with saving partition and cluster properties.
- **0.47.0**: Added materialization tab to the asset side panel.
- **0.46.1**: Fix Bruin CLI installation on Windows.
- **0.46.0**: Added convert feature to convert eligible files to Bruin assets.
- **0.45.5**: Update SQL editor line height.
- **0.45.4**: Improve long queries rendering in SQL editor.
- **0.45.3**: Added support for dates in the query preview panel.
- **0.45.2**: Fix CLI version check to improve performance.
- **0.45.1**: Optimize the Bruin activation process.
- **0.45.0**: Added executed query preview with copy-to-clipboard support in the query results panel.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
