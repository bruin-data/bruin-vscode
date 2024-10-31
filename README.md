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
### Latest Release: 0.25.13
- Replaced ellipsis icon with arrow icon to toggle checkbox group.

### Previous Highlights
- **0.25.12**: Improved UI consistency for DateInput and CheckboxGroup components, including updated styling and layout adjustments.
- **0.25.11**: Improved error handling to display 'panic' errors more clearly.
- **0.25.10**: Added 'Show More' for long descriptions, displayed pipeline names before asset titles, and optimized view by hiding tags and pipeline names on smaller screens.
- **0.25.9**: Rearrange asset details layout: move asset name and tags to the top with tabs positioned below for improved UI structure
- **0.25.8**: Moved Lineage Panel to a dedicated component for improved organization and performance.
- **0.25.7**: Updated Content-Security-Policy for BruinPanel and LineagePanel, and refactored initialization logic for improved security and performance.
- **0.25.6**: Added support for Athena connections in the Bruin configuration schema and connection form.
- **0.25.5**: Ensured proper visibility of the lineage panel when focusing on the side panel and improved focus handling during extension activation.
- **0.25.4**: Refactored error handling to prevent UI from crashing when parsing errors occur, ensuring graceful error display.
- **0.25.3**: Introduced separate handling and display of warnings and critical errors, providing a clearer distinction between the two and improving overall user experience.
- **0.25.2**: Fixed an issue where the GCP service account file was incorrectly saved as `service_account_json` instead of `service_account_file`.
- **0.25.1**: Added YAML syntax highlighting support with "redhat.vscode-yaml" extension and updated regex patterns for improved parsing.
- **0.25.0**: Added the ability to edit asset names and descriptions directly in the UI, integrating the Bruin CLI patchAssetCommand for updates
- **0.24.1**: Highlighted the default environment in the UI and updated the asset parameters schema with location and query properties.
- **0.24.0**: Added the ability to duplicate connections with a prefilled form and " (Copy)" appended to the name.
- **0.23.1**: Reorganized the connection form by moving optional fields to the bottom and updated the color of the delete icon for better visual consistency.
- **0.23.0**: Added a radio button in the GCP connection form, to choose between a file picker for service_account_json or a text area.
- **0.22.4**: Added a file picker for `service_account_json` in GPC connections, with fixed keywords and default values for improved usability.
- **0.22.3**: Added validation for duplicate connection names in the same environment and made the port field editable.
- **0.22.2**: Introduced an eye icon for password visibility in the input field.
- **0.22.1**: Made the port field editable, resolved PostgreSQL connection issues, and allowed empty strings for `ssl_mode`.
- **0.22.0**: Enabled editing of existing connections directly from the UI with Bruin CLI integration.
- **0.21.x**: Introduced new connection addition via the UI and updated autocomplete schema for Databricks.
- **0.20.x**: Added connection deletion capability in the UI.
- **0.19.x**: Enhanced connection display, data fetching integration with Bruin CLI, and ensured proper alerting for the latest CLI version.
- **0.18.x**: Improved UI styling and readability for asset columns and descriptions.
- **0.17.x**: Introduced a Bruin CLI management tab and resolved datepicker issues.
- **0.16.x**: Added popup asset information display and improved asset name tooltips.
- **0.15.x**: Enhanced metadata push feature, fixed visual and functional issues in the lineage panel, and ensured date consistency in asset management.
- **0.14.x - 0.13.x**: Various fixes for file handling, node dragging, indentation, and autocomplete.
- **0.12.x - 0.9.x**: Enhancements for asset upstream formats, SQL preview, pipeline validation, and asset tab consolidation.
- **0.8.x - 0.7.x**: Markdown rendering for AssetDetails, error handling, and styling improvements.
- **0.6.x - 0.5.x**: SQL preview visibility, tabbed interface, and line numbers.
- **0.4.x - 0.1.x**: Initial features including SQL validation, auto-folding, syntax coloring, and dynamic content viewing.

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.
