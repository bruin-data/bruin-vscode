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

### Latest Release: v0.7.2

## Updated
- **Lineage Visualizatio:** Transition from string-based lineage data handling to a JSON parsing mechanism. 
- **Updated Button Design:** The `run` and `validate` buttons have been resized and a separator has been added between the button and its corresponding dropdown menu for better visual appeal and usability. 



### Latest Release: v0.7.2

## Updated
- Fix the visual issues related to the display of icons and the loading spinner within the validate button component.

### Previous Highlights

### 0.7.1
 	- Transition from string-based lineage data handling to a JSON parsing mechanism. 
	- The `run` and `validate` buttons have been resized and a separator has been added between the button and its corresponding dropdown menu for better visual appeal and usability.

### 0.7.0
	- Integrated a dropdown menu into the `validate` and `run` buttons. The `validate` menu includes a new option titled "Pipeline". Selecting this option triggers the command `bruin validate .`. The `run` button menu, features the **"Downstream"** option. When selected, this initiates the command bruin `run --downstream [rest of the command]`.
### 0.6.2
	- Resolves the issue of SQL Preview visibility in files that are not classified as Bruin assets.

### 0.6.1
	- Resolves the functionality issues with the VSCode extension on Windows platforms.


### 0.6.0
	- Updated the webview to feature a tabbed interface. The interface now includes two distinct tabs.
	- The `General` tab Continues to display the existing asset details in the General tab.
	- The `Asset Lineage` is newly introduced to showcase the lineage data in a textual format. This tab dynamically displays the lineage of the current asset.

### 0.5.0
	- The SQL preview now displays line numbers, providing a clearer and more navigable interface for code review and debugging.

### 0.4.3
	- Fix the rendering for the last opened document

### 0.4.2
	- Implemented a reactivity handling to ensure that the SQL preview responds dynamically to user interactions with the checkboxes and the date inputs. 

### 0.4.1
	- Implemented a loading state and added a spinner to the validation button to handle the "loading" state.
	- Improved responsiveness of the validation by correctly managing the loading state.


### 0.4.0
	- Implemented Vue.js as the primary framework for developing the extension's Webview to enhance the extension's user interface and interactivity.
	- Rebuilt the Webview using several reusable Vue components. The use of Vue components allows for a more dynamic and responsive user experience.

### 0.3.0
	- Windows compatibility.
	- Functionality for automatic detection of the workspace directory in Bruin projects.

### 0.2.5
- Fixed validation error message formatting and handling.

### 0.2.4
- Fixed the rendering problems with some assets.
- Fixed the error message triigerd for broken assets 

### 0.2.3
- Fixed the css problem.

#### 0.2.2
- Integrated SQL validation functionality, providing a custom notification for validation results.
- Support for running SQL with conditional flags.
- Added start and end date selectors for appending date conditions directly to the Bruin run command.
- Incorporated the "exclusive end date" checkbox, automatically adjusting the end date to the end of the selected day.
- Fixed the auto folding problem, when changing the active text editor.


#### 0.1.2
- Added auto-folding settings and resolved compatibility issues with the Pylance extension.

#### 0.1.1
- General bug fixes.

#### 0.1.0
- Launched with syntax coloring, code folding, and the dynamic SQL content viewer.


### How to Update

To update to the latest version, search for "Bruin" in the Extensions Marketplace and click the Update button.