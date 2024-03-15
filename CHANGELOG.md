# Changelog

All notable changes to the Bruin extension will be documented in this file.

## [0.1.2] - [2024-03-13]

## Fixed
- Addressed compatibility issues with the Pylance extension affecting auto-folding behavior.

## Added 
- Settings for auto-folding! Users can now specify their preferred default folding state for Bruin regions.

## [0.1.1] - [2024-03-13]

## Fixed
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