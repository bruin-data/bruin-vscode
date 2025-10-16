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

## Release Notes
### Recent Update
- **0.69.6**: Updated the full refresh message and improved the schema validation.
- **0.69.5**: Fixed the environment selection issue.
- **0.69.4**: Added support for `truncate+insert` strategy in the materialization UI and fix the query cost estimate issue.
- **0.69.3**: Fixed column lineage positionning issue.
- **0.69.2**: Resolved issues with custom check parameters and cron expressions, and improved the custom check UI.
- **0.69.1**: Add support for `application default credentials` in `gcp` connections.
- **0.69.0**: Updated tab visibility logic to show pipeline related information and added autocomplete for secrets.
- **0.68.2**: Fixed the preview query issue when opening a non-asset file.
- **0.68.1**: Fixed rendered query issues related to date input and full refresh start date.
- **0.68.0**: Added support for BigQuery cost estimate in the SQL editor.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
