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
### Latest Release: 0.43.3
- Added Version Selection for Bruin CLI Update in Settings Tab.

### Recent Updates
- **0.43.2**: Added expandable labels for truncated asset names in lineage view.
- **0.43.1**: Handle file renaming in BruinPanel to update last rendered document URI.
- **0.43.0**: Automatically refresh the CLI status after update.
- **0.42.3**: Added support for `bq.seed` type in asset yaml schema.
- **0.42.2**: Support multiline input for column and custom check fields.
- **0.42.1**: Improved `CLI install` and `update` UX in Settings Tab.
- **0.42.0**: Added export functionality to export query output to a CSV file.
- **0.41.2**: Fixed Editing Behavior When Adding or Deleting Columns.
- **0.41.1**: Fixed payload sanitization for columns details.
- **0.41.0**: Added auto CLI Version Check and Update Functionality to trigger a CLI update interactively.
- **0.40.5**: Remove Debounce from BruinPanel and Add Timeout for Rendering Errors Only.
- **0.40.4**: Remove `downstream` flag from `runWholetPipeline` command.
- **0.40.3**: Added support for `emr_serverless.spark` type in asset yaml schema.
- **0.40.2**: Displayed connection name in QueryPreview.
- **0.40.1**: Implement debounce mechanism for rendering command in BruinPanel.
- **0.40.0**: Enable adding, removing, and editing custom checks in asset columns.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).


### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
