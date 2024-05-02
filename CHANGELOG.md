# Changelog

All notable changes to the Bruin extension will be documented in this file.

## [0.7.3] -[2024-05-02]
### Improved 
- Enhanced the validation error display, and adds the expand functionality to hide/show the error details.

## [0.7.2] -[2024-05-02]
### Fixed 
- Fixed the visual issues related to the display of icons and the loading spinner within the validate button component.

## [0.7.1] -[2024-04-29]
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