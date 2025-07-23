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
- **0.56.1**: Added missing LIMIT to query execution.
- **0.56.0**: Grouped databases by environment to avoid confusion with duplicates.
- **0.55.2**: Fixed asset node Click navigation & long name expansion in Lineage view.
- **0.55.1**: Added support for dependency mode and SCD2 strategy.
- **0.55.0**: Added support for highlighting the asset path in the lineage view.
- **0.54.4**: Added support for additional seed asset types in snippets, schema and UI.
- **0.54.3**: Conditionally show the `Fill from Query` button based on whether the active file is a SQL file.
- **0.54.2**: Fixed the Query Preview Panel recreation on database load to prevent previous query output loss.
- **0.54.1**: Fixed the Bruin Panel rendering issue.
- **0.54.0**: Added human-readable cron preview via CodeLens in pipeline YAML files.

For a full changelog, see Bruin Extension [Changelog](https://marketplace.visualstudio.com/items/bruin.bruin/changelog).

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
