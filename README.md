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
- **0.62.3**: Improved the column property completions and fixed materialization validation.
- **0.62.2**: Implemented preview functionality for queries within custom checks.
- **0.62.1**: Fixed the query preview issues including the query extraction logic.
- **0.62.0**: Added completion and validation for materialization and asset properties.
- **0.61.3**: Fixed the query preview issues by clearing tab state and fixing stale results.
- **0.61.2**: Fixed the validate all command to use the right workspace directory.
- **0.61.1**: Add count field to custom checks.
- **0.61.0**: Added language server support for asset dependencies go to definition and completion.
- **0.60.1**: Added support for nullable and owner properties in the asset columns and improved the UI responsiveness.
- **0.60.0**: Added support for query timeout and cancellation and improved environemnt management UI.
- **0.59.3**: Updated query extraction logic for non-asset files and added pagination to the query preview.
- **0.59.2**: Display CodeLens only when selection starts outside Bruin block.
- **0.59.1**: Add highlighing to the column level lineage view.
- **0.59.0**: Added column level lineage view.
- **0.58.8**: Added GCS as a destination option in the Ingestr Asset UI and schema.
- **0.58.7**: Fixed the query preview for the first query in multiple queries file.
- **0.58.6**: Fixed the query preview code lens. 
- **0.58.5**: Recovered the partition by and cluster ui and fixed the columns actions being hidden.
- **0.58.4**: Enhanced the environment management UI with delete and update actions.
- **0.58.3**: Improved detect asset logic.
- **0.58.2**: Improved the Activity Bar and Side Panel rendering.
- **0.58.1**: Changed "Fill from DB" to run in the background instead of the terminal.
- **0.58.0**: Add environment management UI allowing users to create new environments.
- **0.57.0**: Added Ingest Asset UI with dropdowns for selecting source and destination connections.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
