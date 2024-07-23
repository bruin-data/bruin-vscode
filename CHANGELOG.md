# Changelog

All notable changes to the Bruin extension will be documented in this file.


- ## [0.13.2] - [2024-07-23]
- Implemented autocomplete for `*.asset.yml` with predefined options and schema validations.

- ## [0.13.1] - [2024-07-23]
- Implemented autocomplete for `pipeline.yml` with predefined options and schema validations.

- ## [0.13.0] - [2024-07-22]
- Added Autocomplete Support for .bruin.yml, enhanced with predefined options and schema validations for better usability.

- ## [0.12.4] - [2024-07-17]
- Updated the extension to support the new asset upstream format while keeping the old format for older CLI versions.
- The opacity for the lineage graph nodes is removed.

- ## [0.12.3] - [2024-07-16]
- Fixed an issue where the environment list was being updated unnecessarily whenever a file was opened or updated.

- ## [0.12.2] - [2024-07-12]
- Fixed a typo in the pipeline snippet.

- ## [0.12.1] - [2024-07-12]
- Implemented snippets for creating Bruin root configuration and Bruin pipeline.

- ## [0.12.0] - [2024-07-11]
- Implemented new snippets for creating Bruin Python and SQL asset templates within VS Code.
- Added support for Snowflake and BigQuery environments.

- ## [0.11.4] - [2024-07-09]
- Introduced new cron schedule detection and reset functionalities.

- ## [0.11.3] - [2024-07-03]
- Updates the render icon from a rocket to the Bruin logo.

- ## [0.11.2] - [2024-07-03]
- Fixed an issue where the rocket icon didn't display for `ingestr` asset YAML files due to the unsupported `.yaml` extension.

- ## [0.11.1] - [2024-07-03]
- Fix Default Environment Behavior: Users can now name their default environment as they wish, instead of `"default"`.

- ## [0.11.0] - [2024-06-28]
- New Feature: Added a dropdown for selecting environments, dynamically fetched from the CLI.
- The default environment is pre-selected and concatenated into the run command for accurate execution.

- ## [0.10.7] - [2024-06-27]
 - Corrected the validation button behavior where "Validate All" and "Validate Current Pipeline" were erroneously swapped.

- ## [0.10.6] - [2024-06-27]
 - Resolves the issue encountered by Windows users using a UNIX-based shell regarding path separators
 - Users can now specify the path separator (/ or \) used in constructing Bruin asset paths via the extension's settings.

- ## [0.10.5] - [2024-06-26]
- Fixed a bug where setting an asset type to an invalid value caused the UI to break.

- ## [0.10.4] - [2024-06-25]
- Enhance the visibility of the Validate button by updating the color of the check icon.

- ## [0.10.3] - [2024-06-25]
- Fixed the timestamp exclusion problem.

- ## [0.10.2] - [2024-06-24]
- Fixed the issue with the full refresh behavior.

- ## [0.10.1] - [2024-06-07]
- Updated the warning message displayed when the file isn't an asset and fixed a typo.

- ## [0.10.0] - [2024-06-06]
## Added:
- Added a reset button to reset start and end dates based on the pipeline schedule.

- ## [0.9.3] - [2024-06-04]
### Improved
- Combined the asset general and asset details tabs into a single tab.
- Adjusted the styling of the asset details to better align with Visual Studio Code's aesthetic.
- Corrected the position of menu items for non-SQL assets.

- ## [0.9.2] - [2024-05-30]
### Improved
- Expanded validation options with "Validate All Pipelines" and "Validate Current Pipeline" choices for increased flexibility.
- Introduced "Run Current Pipeline" option in the run button for the execution of the current pipeline.

### Fixed
- Enhanced error alert display by fixing max height and adding a vertical scrollbar to accommodate multiple errors from different pipelines.
- Improved error handling to catch additional error types, including those with stack traces.

- ## [0.9.1] - [2024-05-28]
### Fixed
- Fix the exclusive end date function to accurately calculate the exclusive end time.

- ## [0.9.0] - [2024-05-24]
### Added
- New panel to display the lineage of a single asset.
- Requires CLI version update to fetch asset types for lineage display.

- ## [0.8.4] - [2024-05-21]
### Fixed
- Implemented Markdown rendering for the description in the AssetDetails component.

- ## [0.8.3] - [2024-05-21]
### Fixed
- The "Exclusive End Date" checkbox is now checked by default, with a reactive update for `endDateExclusive` to ensure it accurately reflects changes in `endDate`.

## [0.8.2] - [2024-05-17]
### Fixed 
- Previously, the `schedule` value in the asset details was consistently displayed as undefined. In this updated version, the schedule value has been fixed and is now dynamically updated.

## [0.8.1] - [2024-05-17]
### Fixed 
- Added error handling for the "no such file or directory" (ENOENT) error when the `output` panel is clicked.

## [0.8.0] - [2024-05-16]
### Added
- Introduction of a new tab dedicated to rendering asset details, with dynamic updating for data.
- Integration of an alert message feature to provide clear feedback when data is unavailable for display.

### Fixed 
- Display the asset name on the `General Tab` dynamically

## [0.7.5] - [2024-05-16]
### Fixed
- Introduced a clear differentiation between render errors and validation errors. Previously, render errors were not being displayed when encountered, leading to confusion. 
- Implemented a fallback mechanism to ensure compatibility with older CLI versions where the SQL preview and render error might not be displayed because of recent updates.

### Improved
- CSS Adjustments: Updated CSS for `run` and `validate` buttons to ensure visual coherence and maintain clickability.

## [0.7.4] -[2024-05-06]
### Fixed 
- The extension activation on snowflake and bigQuery SQL as well as other languages is now fixed.

## [0.7.3] -[2024-05-02]
### Improved 
- Enhanced the validation error display, and adds the expand functionality to hide/show the error details.

## [0.7.2] -[2024-05-02]
### Fixed 
- Fixed the visual issues related to the display of icons and the loading spinner within the validate button component.

## [0.7.1] -[2024-04-30]
### Fixed
- Transition from string-based lineage data handling to a JSON parsing mechanism. 
- The `run` and `validate` buttons have been resized and a separator has been added between the button and its corresponding dropdown menu for better visual appeal and usability. 

## [0.7.0] - [2024-04-29]
### Added
- Integrated a dropdown menu into the `validate` and `run` buttons. The `validate` menu includes a new option titled "Pipeline". Selecting this option triggers the command `bruin validate .`. The `run` button menu, features the **"Downstream"** option. When selected, this initiates the command bruin `run --downstream [rest of the command]`.

## [0.6.2] - [2024-04-29]
### Fixed
- Resolved the issue of SQL Preview visibility in files that are not classified as Bruin assets.

## [0.6.1] - [2024-04-26]
### Fixed
- Resolved the functionality issues with the VSCode extension on Windows platforms.

## [0.6.0] - [2024-04-25]
### Added
- Updated the webview to feature a tabbed interfac. The interface now includes two distinct tabs:
	- **General Tab**: Continues to display the existing asset details.
	- **Asset Lineage Tab**: Newly introduced to showcase the lineage data in a textual format. This tab dynamically displays the lineage of the current asset.

## [0.5.0] - [2024-04-24]
### Added
- The SQL preview now displays line numbers, providing a clearer and more navigable interface for code review and debugging.

## [0.4.3] - [2024-04-23]
### Fixed
- Fixed the rendering of the last opened document

## [0.4.2] - [2024-04-23]
### Added
- Implemented a reactivity handling to ensure that the SQL preview responds dynamically to user interactions with the checkboxes and the date inputs. 

## [0.4.1] - [2024-04-22]
### Added
- Implemented a loading state and added a spinner to the validation button to handle the "loading" state.

### Fixed
- Improved responsiveness of the validation by correctly managing the loading state.


## [0.4.0] - [2024-04-22]
### Updated 
- Rebuilt the Webview using several reusable Vue components. The use of Vue components allows for a more dynamic and responsive user experience.


## [0.3.0] - [2024-03-27]
### Added 
- Windows compatibility.
- Functionality for automatic detection of the workspace directory in Bruin projects.

## [0.2.5] - [2024-03-26]
### Fixed 
	- Fixed validation error message formatting and handling.

## [0.2.4] - [2024-03-22]
### Fixed 
	- Fixed the rendering problems with some assets.
	- Fixed the error message triigerd for broken assets 

## [0.2.3] - [2024-03-22]
### Fixed 
- Fixed the css problem.

## [0.2.2] - [2024-03-22]
### Added 
- SQL validation functionality, providing a custom notification for validation results.
- Running SQL with conditional flags.
- Start and end date selectors for appending date conditions directly to the Bruin run command.
- "exclusive end date" checkbox, automatically adjusting the end date to the end of the selected day.

### Fixed 
- Auto folding problem, when changing the active text editor 

## [0.1.2] - [2024-03-13]
### Fixed
- Addressed compatibility issues with the Pylance extension affecting auto-folding behavior.

### Added 
- Settings for auto-folding! Users can now specify their preferred default folding state for Bruin regions.

## [0.1.1] - [2024-03-13]
### Fixed
- Fixed the screenshots on the readme 

## [0.1.0] - [2024-03-13]
### Added
- Python Syntax coloring: Introduced YAML syntax coloring for Bruin code blocks in Python files, enclosed between `""" @bruin ... @bruin """`. This feature is similar to the existing functionality for SQL files.

- Folding range provider: Implemented folding and unfolding capabilities for Bruin code regions in both SQL and Python files, improving code navigation and readability.

- Dynamic SQL Content Viewer: Added a dynamic SQL content rendering feature within a VS Code Webview panel. This Webview adapts to theme changes, allows direct content copying, and automatically refreshes when the underlying SQL file is updated.

### Improved
- Updated documentation, including a revised README, and CHANGELOG files and the addition of a support guide.


## [0.0.1] - [2023-10-29]
### Added
- Initial release with basic functionality for YAML syntax coloring of Bruin code embedded within SQL files, enclosed between `/* @bruin` and `@bruin */`.