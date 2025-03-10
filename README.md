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

### Latest Release: 0.38.5
- Update keybinding display for platforms and remove unused 'value' property in columns checks.

### Recent Updates
- **0.38.4**: Improved columns checks Dropdown positioning and run button UI on windows.
- **0.38.3**: Replaced markdown-preview auto-lock workaround with a custom preview to fix serialization errors and enable auto-refresh.
- **0.38.2**: Refactored command payload to handle undefined environment values.
- **0.38.1**: Added support for tab label editing via double-click and refactored query data loading to prevent automatic execution on mount.
- **0.38.0**: Added multi-tab support to the QueryPreview component, allowing users to manage multiple query results simultaneously.
- **0.37.2**: Resolved the visibility issue with icons in the Query Preview Panel.
- **0.37.1**: Fixed CustomChecks to correctly recognize `0` as a valid check value instead `undefined`.
- **0.37.0**: Added search functionality to the Query Preview Panel.
- **0.36.0**: Added support for executing `selected queries` in the Query Preview Panel. The selected queries should belong to a valid `bruin` asset.
- **0.35.3**: Optimize payload size for description and asset name updates and improve error handling.
- **0.35.2**: Adjust the styling of the save and cancel buttons in the description editing.
- **0.35.1**: Add loading state to the query preview.
- **0.35.0**: Introduce a new **Query Preview Panel** to display the output of SQL `query` execution. This feature currently uses the **default** environment with a maximum limit of **1000**.
- **0.34.1**: Reset filter panel state on file change and improve graph viewport adjustments for expanded nodes.
- **0.34.0**: Add options panel to the lineage view with choices to display either all upstream & downstream dependencies or only direct dependencies.
- **0.33.2**: Improve description editing by adding clear Save and Cancel buttons.
- **0.33.1**: Display render button for all file extensions, ensuring Bruin render is always visible.
- **0.33.0**: Added a Control panel with zoom, view fit, and lock buttons and reduced top gap in the lineage flow.
- **0.32.13**: Resolved an issue where terminal commands occasionally missed the first letter, causing execution failures.
- **0.32.12**: Format the rendering error message to display differently based on the phase (rendering or validation).
- **0.32.11**: Fixed ConnectionForm not resetting when switching between edit and new connection.
- **0.32.10**: Improved truncation behavior for pipeline and asset names and ensured asset name edit mode closes on mouse leave.
- **0.32.9**: Asset validation errors now expand for single assets and pipelines, while multiple pipeline errors stay collapsed.
- **0.32.8**: Fixed an issue where new files opened in the side panel's group, causing confusion; the panel now locks by default.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).


### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
