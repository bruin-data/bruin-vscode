# Bruin
Bruin is a unified analytics platform that enables data professionals to work end-to-end for their data pipelines. This extension is built to improve the development experience of data products on Bruin using Visual Studio Code.


## Features

- **Syntax Coloring**: Applies YAML syntax coloring to Bruin code in SQL files (enclosed between `/* @bruin ... @bruin */`) and Python files (enclosed between `""" @bruin ... @bruin """`).

    ![Screenshot of Syntaxe Coloring](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/syntaxe-coloring.png?raw=true)

- **Folding Range Provider**: Allows folding and unfolding Bruin code regions in SQL and Python files for a cleaner workspace. 

- **Auto Folding**: You can configure this setting by editing your through the Settings UI under Extensions > Bruin.

    ![Screenshot of Bruin Extension Settings](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/bruin_extension_settings.png?raw=true)


*Important Note*
	The Pylance extension, which provides advanced language support for Python, may affect the expected behavior of the auto-folding feature. If you encounter inconsistencies with code regions not folding as expected in python files, please review your Pylance settings. Adjusting these settings or temporarily disabling Pylance may help to resolve these issues. 


- **Dynamic SQL Content Viewer**: Renders SQL content within a VS Code Webview, enabling content copying, and automatically refreshing on file updates.

    ![Screenshot of Bruin Extension Features](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/bruin_extension_features.gif?raw=true)

- **Adapting to theme changes**: the SQL Content Viewer matches the vscode current theme (dark/light/Dark high contrast)

    ![Screenshot of SQL viewer Theme Updates](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/theme-updates.gif?raw=true)

**SQL Validation and Execution**: Introduces SQL validation and execution capabilities, including custom messages for invalid SQL queries and the ability to run SQL with additional flags such as `--downstream` and `--full-refresh` as well as date inputs.
	 **Date Inputs**:
		- Introduces date picker inputs for selecting start and end dates for `run` command.
		- Comes with `Exclusive End Date` checkbox, adjusting the end date to the end of the selected day (`23:59:59.999999999`).

![Screenshot of SQL Validation and Execution](https://github.com/bruin-data/bruin-vscode/blob/main/screenshots/validation-and-execution.gif?raw=true)

## Installation

1. Open Visual Studio Code.
2. Navigate to the Extensions view (Ctrl+Shift+X).
3. Search for "Bruin" and click Install.

 ***Note***:  Before using the new features, ensure that you have the Bruin CLI installed on your system. 
 For guidance on installing the Bruin CLI, please refer to the official documentation [link to documentation](https://github.com/bruin-data/bruin).

## Usage

- **Syntax Coloring**: Enclose Bruin code with delimiters:
	- In **SQL files** `/* @bruin` and `@bruin */`.
	- In **Python files** `""" @bruin` and `@bruin """`.

- **Folding Range**: Bruin code regions are automatically foldable.
- **Dynamic SQL Content Viewer**:
	1. Open any SQL file.
	2. Click the rocket icon 🚀 in the top right menu.
	3. A Webview will open, previewing the SQL content.
	4. Click the "Copy" icon to copy the content.
	5. The theme color of the view can match the vscode current theme (dark/light/Dark high contrast)
	6. The SQL Preview automatically responds to changes in checkboxes and dates, ensuring an immediate re-render.
	
**SQL Validation and Execution**:
    - **Validation**: Click the "Validate" button to validate the current SQL. A custom notification will appear based on the validation results.
    - **Run with Flags**: Click the "Run" button to execute the SQL command in an integrated terminal. This can include optional flags based on user input (checkboxes & date inputs).
        - **Start and End Dates**: 
			1. Select start and end dates using the date picker inputs to specify the time range for the run command.
			2. An "Exclusive End Date" checkbox is available. When checked, the end date is adjusted to the precise end of the selected day (`23:59:59.999999999`).
			3. The dates will be appended as flags directly to the Bruin run command 


## Release Notes

### Latest Release: 0.16.1
- Resolved an issue where checking the push-metadata checkbox caused unnecessary re-renders in the SQL Preview.

### Previous Highlights
### Version 0.16.0
- Introduced a popup to display asset information and enable opening the asset text document in VSCode for additional details.
- Added a tooltip that reveals the full asset name on hover over a node when the name is truncated.

### Version 0.15.3
- Fixed an issue where file modifications caused dates to reset. This update ensures that dates remain unchanged when switching assets and files, unless explicitly updated.

### Version 0.15.2
- Fixed an issue with the loading state in the lineage panel when no lineage data is available.

### Version 0.15.1
- Fixed an issue where the "Show More" functionality in the lineage panel was not working as expected.
- Improved the visual layout of nodes within the lineage panel for better readability.

### Version 0.15.0
- Added a new checkbox to the main panel for enabling the metadata push feature.

### Version 0.14.x
- Quoting around file paths now handles spaces and special characters.
- Distinguishes render and validate errors for clearer feedback.
- Keeps SQL Editor accessible during errors.
- Removed fields (`Materialization`, `connections`, `parameters`) from Python asset snippets.

### Version 0.13.x
- Free dragging of nodes; refresh button returns them to original positions.
- Fixed indentation in asset snippets and removed "type" requirement in autocomplete schema columns.
- Modularized SQL and Python asset snippets for autocomplete.
- Reduced vertical spacing between nodes in the lineage graph.
- Improved YAML assets with autocomplete and schema validations.
- Enforced single `service_account_json` or `service_account_file` in GCP schema.
- Enhanced pipeline file with autocomplete and schema validations.

### Version 0.12.x
- Updated for new asset upstream format; old format still supported.
- Fixed unnecessary environment list updates and typo in pipeline snippet.
- Implemented snippets for Bruin root configuration, pipelines, and assets.

### Version 0.11.x
- Updated render icon to Bruin logo.
- Fixed rocket icon for `.yaml` files.
- Enhanced default environment customization and CLI-based environment fetching.

### Version 0.10.x
- Corrected validation button behavior and path separator issues.
- Fixed UI breakage for invalid asset types and timestamp exclusion problems.
- Updated warning messages and added reset button for dates.

### Version 0.9.x
- Merged asset tabs for streamlined navigation.
- Added lineage panel, "Validate All Pipelines," and "Run Current Pipeline" options.
- Improved asset details styling and error handling.

### Version 0.8.x
- Added Markdown rendering for AssetDetails description.
- Made "Exclusive End Date" checkbox default to checked.
- Fixed schedule display inconsistencies and added error handling for ENOENT.
- Introduced new tab for dynamic asset details.

### Version 0.7.x
- Clarified render vs. validation errors.
- Improved button styling and error display.
- Resolved activation issues and visual inconsistencies.

### Version 0.6.x
- Enhanced SQL preview visibility and resolved Windows functionality issues.
- Updated webview with tabbed interface.

### Version 0.5.x
- Added line numbers to SQL preview.

### Version 0.4.x
- Various fixes for rendering, responsiveness, and CSS.

### Version 0.3.x
- Added Windows compatibility and automatic workspace directory detection.

### Version 0.2.x
- Implemented SQL validation and fixed auto-folding issues.

### Version 0.1.x
- Introduced auto-folding, syntax coloring, and dynamic SQL content viewer.

### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.