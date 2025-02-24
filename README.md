# Bruin

Bruin is a unified analytics platform that enables data professionals to work end-to-end for their data pipelines. This extension is built to improve the development experience of data products on Bruin using Visual Studio Code.

## Features

### Syntax Coloring

- Applies YAML syntax coloring to Bruin code in SQL files (enclosed between `/* @bruin ... @bruin */`) and Python files (enclosed between `""" @bruin ... @bruin """`).

![Screenshot of Syntax Coloring](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/syntaxe-coloring.png?raw=true)

### Folding Range Provider

- Allows folding and unfolding Bruin code regions in SQL and Python files for a cleaner workspace.
- Auto Folding: Configure this setting through the Settings UI under Extensions > Bruin.

![Screenshot of Bruin Extension Settings](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/bruin_extension_settings.png?raw=true)

**Note**: The Pylance extension may affect the auto-folding feature. If you encounter inconsistencies, review your Pylance settings or temporarily disable it.

### Dynamic SQL Content Viewer

- Renders SQL content within a VS Code Webview, enabling content copying and automatic refreshing on file updates.
- Adapts to theme changes (dark/light/Dark high contrast)

![Screenshot of Bruin Extension Features](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/bruin_extension_features.gif?raw=true)

![Screenshot of SQL viewer Theme Updates](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/theme-updates.gif?raw=true)

### SQL Validation and Execution

- Introduces SQL validation and execution capabilities.
- Custom messages for invalid SQL queries.
- Ability to run SQL with additional flags such as `--downstream` and `--full-refresh`.
- Date inputs for selecting start and end dates for the `run` command.
- `Exclusive End Date` checkbox to adjust the end date to the end of the selected day.

![Screenshot of SQL Validation and Execution](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/validation-and-execution.gif?raw=true)

### Asset Lineage

- New panel to display the lineage of a single asset.
- Ability to expand properties in the lineage view to see further upstream and downstream elements.

### Connections Management

- Display and manage connections integrated with Bruin CLI.
- Add new connections directly from the UI.
- Delete existing connections via the UI.

### Bruin CLI Management

- New tab in the side panel for easy installation and updates of Bruin CLI.
- Windows-specific Go check, with a link to documentation if Go is missing.

### Autocomplete and Snippets

- Autocomplete support for `.bruin.yml`, `pipeline.yml`, and `*.asset.yml` files with predefined options and schema validations.
- Snippets for creating Bruin root configuration, pipelines, and assets.

## Installation

1. Open Visual Studio Code.
2. Navigate to the Extensions view (Ctrl+Shift+X).
3. Search for "Bruin" and click Install.

**Note**: Ensure that you have the Bruin CLI installed on your system before using the new features. For guidance on installing the Bruin CLI, please refer to the [official documentation](https://github.com/bruin-data/bruin).

## Usage

### Syntax Coloring

Enclose Bruin code with delimiters:

- In **SQL files**: `/* @bruin` and `@bruin */`
- In **Python files**: `""" @bruin` and `@bruin """`

### Folding Range

Bruin code regions are automatically foldable.

### Dynamic SQL Content Viewer

1. Open any SQL file.
2. Click the Bruin logo icon in the top right menu.
3. A Webview will open, previewing the SQL content.
4. Click the "Copy" icon to copy the content.
5. The theme color of the view matches the current VS Code theme.

### SQL Validation and Execution

- **Validation**: Click the "Validate" button to validate the current SQL or entire pipeline.
- **Run with Flags**: Click the "Run" button to execute the SQL command in an integrated terminal, with optional flags and date inputs.

### Asset Lineage

Access the new lineage panel to view and interact with asset lineages.

### Connections Management

Use the new connections section from `Settings` tab to view, add, or delete connections directly from the UI.

### Bruin CLI Management

Access the Bruin CLI management tab `Settings` in the side panel for easy installation and updates.

## Release Notes

### Latest Release: 0.35.1
- Add loading state to the query preview.

### Recent Updates
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
