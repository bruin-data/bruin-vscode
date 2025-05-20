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
### Latest Release: 0.46.0
- Added convert feature to convert eligible files to Bruin assets.

### Recent Updates
- **0.45.5**: Update SQL editor line height.
- **0.45.4**: Improve long queries rendering in SQL editor.
- **0.45.3**: Added support for dates in the query preview panel.
- **0.45.2**: Fix CLI version check to improve performance.
- **0.45.1**: Optimize the Bruin activation process.
- **0.45.0**: Added executed query preview with copy-to-clipboard support in the query results panel.
- **0.44.4**: Scope query response to active tab only, allowing other tabs to remain responsive during execution.
- **0.44.3**: Fixed SQL editor line display and improved layout styling for DateInput components.
- **0.44.2**: Added support for `interval_modifiers` in asset schema and makes the name field optional.
- **0.44.1**: Enhanced the date input component to support both manual text entry and calendar-based selection.
- **0.44.0**: Added full pipeline view to the lineage panel.
- **0.43.4**: Fix rendering for pipeline.yml and .bruin.yml in side panel.
- **0.43.3**: Added Version Selection for Bruin CLI Update in Settings Tab.
- **0.43.2**: Added expandable labels for truncated asset names in lineage view.
- **0.43.1**: Handle file renaming in BruinPanel to update last rendered document URI.
- **0.43.0**: Automatically refresh the CLI status after update.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).


### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
