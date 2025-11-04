# Changelog
## [0.70.9] - [2025-11-04]
- Enhanced the ingestr asset UI, including support for custom incremental keys, and introduced column resizing in the query preview.

## [0.70.8] - [2025-10-31]
- Add query validation to prevent formatting issues.

## [0.70.7] - [2025-10-30]
- Fixed the database connections listing issue on windows.

## [0.70.6] - [2025-10-29]
- Fixed query preview display of columns with object and array types.

## [0.70.5] - [2025-10-28]
- Optimized `interval_modifiers` payload (send only on update) and improved 'none' materialization type handling.

## [0.70.4] - [2025-10-28]
- Fixed a bug where strategy was not removed from assets when switching to view materialization.

## [0.70.3] - [2025-10-24]
- Added an option to the validate dropdown menu to format assets with SQLFluff formatting.

## [0.70.2] - [2025-10-23]
- Fixed full refresh start date logic to use pipeline start date (if available) or the user-defined start date.

## [0.70.1] - [2025-10-23]
- Enabled the rendering of SQL queries for `.task.yml` files.

## [0.70.0] - [2025-10-21]
- Added pipeline variables management UI to the extension.

## [0.69.9] - [2025-10-20]
- Fixed the file extension detection issue and added support for `task.yml` files.

## [0.69.8] - [2025-10-20]
- Fixed `gcp` connection form issues and adjusted SQL editor display: it now shows for validation errors.

## [0.69.7] - [2025-10-16]
- Fixed the query preview panel state persisting issue.

## [0.69.6] - [2025-10-16]
- Updated the full refresh message and improved the schema validation.

## [0.69.5] - [2025-10-15]
- Fixed the environment selection issue.

## [0.69.4] - [2025-10-14]
- Added support for `truncate+insert` strategy in the materialization UI and fix the query cost estimate issue.

## [0.69.3] - [2025-10-09]
- Fixed column lineage positionning issue.

## [0.69.2] - [2025-10-09]
- Resolved issues with custom check parameters and cron expressions, and improved the custom check UI.

## [0.69.1] - [2025-10-08]
- Add support for `application default credentials` in `gcp` connections.

## [0.69.0] - [2025-10-08]
- Updated tab visibility logic to show pipeline related information and added autocomplete for secrets.

## [0.68.2] - [2025-10-02]
- Fixed the preview query issue when opening a non-asset file.

## [0.68.1] - [2025-10-02]
- Fixed rendered query issues related to date input and full refresh start date.

## [0.68.0] - [2025-10-02]
- Added support for BigQuery cost estimate in the SQL editor.

## [0.67.4] - [2025-09-30]
- Fixed lineage display for `pipeline.yml` files and resolved issues with the lineage view not refreshing after updates.

## [0.67.3] - [2025-09-26]
- Fixed the query preview panel environment display issue.

## [0.67.2] - [2025-09-16]
- Improved connection test ui.

## [0.67.1] - [2025-09-09]
- Allow YAML assets to be rendered.

## [0.67.0] - [2025-09-05]
- Added a "Create in-place" checkbox to the project creation UI, allowing projects to be created directly in the selected folder.

## [0.66.0] - [2025-09-04]
- Added console logging for executed query commands to aid in error detection.

## [0.65.2] - [2025-09-02]
- Fixed table details panel and .bruin.yaml panel bugs.

## [0.65.1] - [2025-08-28]
- Fixed an issue where the render panel's query was not updating when the "full refresh" checkbox was checked.

## [0.65.0] - [2025-08-22]
- Introduced a tags management interface that allows users to toggle the inclusion or exclusion of assets for execution in run commands.

## [0.64.7] - [2025-08-21]
- Fixed the SQL preview rendering issue.

## [0.64.6] - [2025-08-21]
- Updated the environment list command to create bruin.yml if it does not already exist.

## [0.64.5] - [2025-08-20]
- Improved the .bruin.yml file handling to only show settings tab and fixed the convert message flickering issue.

## [0.64.4] - [2025-08-20]
- Fixed the checkbox and dates state persisting issue.

## [0.64.3] - [2025-08-19]
- Added cancel button to the table diff panel and improved the UI.

## [0.64.2] - [2025-08-18]
- Fixed shwoing settings tab when no active editor and improved the UI.

## [0.64.1] - [2025-08-18]
- Add secrets UI to the details tab.

## [0.64.0] - [2025-08-15]
- Added data diff panel to the extension.

## [0.63.4] - [2025-08-15]
- Fixed extension activation issue on slow systems.

## [0.63.3] - [2025-08-15]
- Fixed ingestr asset parameters saving issue.

## [0.63.1] - [2025-08-13]
- Improved first-time activation, enabling template-based project creation without an active editor.

## [0.63.0] - [2025-08-08]
- Introduced the capability to generate a new project based on a template directly within the extension. 

## [0.62.8] - [2025-08-07]
- Add walkthroughs to the extension and improved the autocomplete and intelliSense.

## [0.62.7] - [2025-08-07]
- Added support for Oracle Source asset type, domains and meta properties in the asset schema.

## [0.62.6] - [2025-08-06]
- Prevent the terminal from closing after CLI installation and update.

## [0.62.5] - [2025-08-06]
- Added a setting to toggle the inline “Preview Selected Query” CodeLens on or off.

## [0.62.4] - [2025-08-06]
- Added custom checks completions and improved the indentation issues.

## [0.62.3] - [2025-08-06]
- Improved the column property completions and fixed materialization validation.

## [0.62.2] - [2025-08-05]
- Implemented preview functionality for queries within custom checks.

## [0.62.1] - [2025-08-04]
- Fixed the query preview issues including the query extraction logic.

## [0.62.0] - [2025-08-04]
- Added completion and validation for materialization and asset properties.

## [0.61.3] - [2025-08-01]
- Fixed the query preview issues by clearing tab state and fixing stale results.

## [0.61.2] - [2025-07-30]
- Fixed the validate all command to use the right workspace directory.

## [0.61.1] - [2025-07-30]
- Add count field to custom checks.

## [0.61.0] - [2025-07-30]
- Added language server support for asset dependencies go to definition and completion.

## [0.60.1] - [2025-07-29]
- Added support for nullable and owner properties in the asset columns and improved the UI responsiveness.

## [0.60.0] - [2025-07-28]
- Added support for query timeout and cancellation and improved environemnt management UI.

## [0.59.3] - [2025-07-24]
- Updated query extraction logic for non-asset files and added pagination to the query preview.

## [0.59.2] - [2025-07-24]
- Displayed CodeLens only when selection starts outside Bruin block.

## [0.59.1] - [2025-07-23]
- Added highlighting to the column level lineage view.

## [0.59.0] - [2025-07-23]
- Added column level lineage view.

## [0.58.8] - [2025-07-18]
- Added GCS as a destination option in the Ingestr Asset UI and schema.

## [0.58.7] - [2025-07-15]
- Fixed the query preview for the first query in multiple queries file.

## [0.58.6] - [2025-07-15]
- Fixed the query preview code lens. 

## [0.58.5] - [2025-07-14]
- Recovered the partition by and cluster ui and fixed the columns actions being hidden.

## [0.58.4] - [2025-07-14]
- Enhanced the environment management UI with delete and update actions.

## [0.58.3] - [2025-07-11]
- Improved detect asset logic.

## [0.58.2] - [2025-07-11]
- Improved the Activity Bar and Side Panel rendering.

## [0.58.1] - [2025-07-09]
- Changed "Fill from DB" to run in the background instead of the terminal.

## [0.58.0] - [2025-07-09]
- Add environment management UI allowing users to create new environments.

## [0.57.0] - [2025-07-08]
- Added Ingest Asset UI with dropdowns for selecting source and destination connections.

## [0.56.1] - [2025-07-07]
- Added missing LIMIT to query execution.

## [0.56.0] - [2025-07-07]
- Grouped databases by environment to avoid confusion with duplicates.

## [0.55.2] - [2025-07-04]
- Fixed asset node Click navigation & long name expansion in Lineage view.

## [0.55.1] - [2025-07-04]
- Added support for dependency mode and SCD2 strategy.

## [0.55.0] - [2025-07-03]
- Added support for highlighting the asset path in the lineage view.

## [0.54.4] - [2025-07-02]
- Added support for additional seed asset types in snippets, schema and UI.

## [0.54.3] - [2025-07-02]
- Conditionally show the "Fill from Query" button based on whether the active file is a SQL file.

## [0.54.2] - [2025-07-01]
- Fixed the Query Preview Panel recreation on database load to prevent previous query output loss.

## [0.54.1] - [2025-07-01]
- Fixed the Bruin Panel rendering issue.

## [0.54.0] - [2025-07-01]
- Added human-readable cron preview via CodeLens in pipeline YAML files.

## [0.53.2] - [2025-06-30]
- Relocated fill from DB buttons to the asset columns and materialization tabs and improved query output rendering.

## [0.53.1] - [2025-06-27]
- Added default Exclude Tag input to the extension settings to exclude assets with specific tags from being validated.

## [0.53.0] - [2025-06-26]
- Added pipeline asset and dependency management, including collapsible sections, improved layout, and support for external dependencies.

## [0.52.0] - [2025-06-26]
- Added an Activity Bar to browse databases, view table details, and preview queries.

## [0.51.7] - [2025-06-26]
- Added support and validation for the `private_key_path` field in Snowflake connections.

## [0.51.6] - [2025-06-25]
- Added support for fill asset dependencies and columns from DB.

## [0.51.5] - [2025-06-23]
- Added confirmation prompt before running with `full-refresh`.

## [0.51.4] - [2025-06-23]
- Fixed customCheck not showing on first render, added missing sensor types to the YAML schema, and expanded snippet completions.

## [0.51.3] - [2025-06-19]
- Enhanced Snowflake connection support with private key authentication, including validation and improved input handling.

## [0.51.2] - [2025-06-19]
- Enabled auto-saving for materialization changes, removing the manual save button.

## [0.51.1] - [2025-06-18]
- Fixed BQ connection updates and improved service account credential handling.

## [0.51.0] - [2025-06-18]
- Added inline "Preview" button using CodeLens for top-level queries in the editor.

## [0.50.8] - [2025-06-17]
- Added support for additional seed asset types in snippets, schema and UI.

## [0.50.7] - [2025-06-17]
- Added utility to format bruin run commands in a readable multi-line format.

## [0.50.6] - [2025-06-16]
- Improved tab rendering performance by switching to `v-if` and optimizing component caching, and cleaned up unused message handling code for better maintainability.

## [0.50.5] - [2025-06-13]
### Pre-release
- [Pre-release] This version is for testing improved tab rendering.

## [0.50.4] - [2025-06-13]
### Pre-release
- [Pre-release] This version is for testing improved tab rendering and code cleanup.

## [0.50.3] - [2025-06-12]
- Fix vscode publishing issue.

## [0.50.2] - [2025-06-12]
- Fix DateInput component to handle focus correctly and adjust SQL editor height.

## [0.50.1] - [2025-06-11]
- Fix auto format on initial interval modifiers rendering.

## [0.50.0] - [2025-06-11]
- Implement UI for adding and editing interval modifiers directly from the panel.

## [0.49.3] - [2025-06-11]
- Remove redundant update columns to fix toggle primary key issue.

## [0.49.2] - [2025-06-10]
- Cleaned the code and added detailed logging for patch asset command.

## [0.49.1] - [2025-06-09]
- Added the checkboxes extension settings  to control default enabled/disabled state.

## [0.49.0] - [2025-06-05]
- Added a checkbox to toggle the `--apply-interval-modifiers` flag, along with a warning when they are present in the asset but not enabled.

## [0.48.3] - [2025-06-04]
- Improved `partition-by` input to support both column selection and manual text entry.

## [0.48.2] - [2025-06-03]
- Updated `partition-by` and `cluster-by` to use a dropdown for selecting columns.

## [0.48.1] - [2025-06-03]
- Added DDL strategy to materialization and save primary key changes immediately.

## [0.48.0] - [2025-06-02]
- Added UI for Managing Owner and Tags in Materialization Tab. 

## [0.47.6] - [2025-06-02]
- Debounced asset conversion detection and added telemetry for convert message.

## [0.47.5] - [2025-05-28]
- Trimmed whitespace from connection form input values and fixed asset name editing.

## [0.47.4] - [2025-05-28]
- Fixed Convert Message Showing for Existing Assets.

## [0.47.3] - [2025-05-27]
- Fixed Convert Message Showing for Existing Assets.

## [0.47.2] - [2025-05-26]
- Added ingestr asset snippet for initializing Bruin ingestr assets easily.

## [0.47.1] - [2025-05-26]
- Improve materialization UI and fix issues with saving partition and cluster properties.

## [0.47.0] - [2025-05-26]
- Added materialization tab to the asset side panel.

## [0.46.1] - [2025-05-20]
- Fix Bruin CLI installation on Windows.

## [0.46.0] - [2025-05-19]
- Added convert feature to convert eligible files to Bruin assets.

## [0.45.5] - [2025-05-16]
- Updated SQL editor line height.

## [0.45.4] - [2025-05-15]
- Improved long queries rendering in SQL editor.

## [0.45.3] - [2025-05-14]
- Added support for dates in the query preview panel.

## [0.45.2] - [2025-05-13]
- Fix CLI version check to improve performance.

## [0.45.1] - [2025-05-07]
- Optimize the Bruin activation process.

## [0.45.0] - [2025-05-02]
- Added executed query preview with copy-to-clipboard support in the query results panel.

## [0.44.4] - [2025-05-02]
- Scope query response to active tab only, allowing other tabs to remain responsive during execution.

## [0.44.3] - [2025-04-30]
- Fixed SQL editor line display and improved layout styling for DateInput components.

## [0.44.2] - [2025-04-30]
- Added support for `interval_modifiers` in asset schema and makes the name field optional.

## [0.44.1] - [2025-04-29]
- Enhanced the date input component to support both manual text entry and calendar-based selection.

## [0.44.0] - [2025-04-29]
- Add full pipeline view to the lineage panel.

## [0.43.4] - [2025-04-24]
- Fix rendering for pipeline.yml and .bruin.yml in side panel

## [0.43.3] - [2025-04-22]
- Added Version Selection for Bruin CLI Update in Settings Tab.

## [0.43.2] - [2025-04-17]
- Added expandable labels for truncated asset names in lineage view.

## [0.43.1] - [2025-04-16]
- Handle file renaming in BruinPanel to update last rendered document URI.

## [0.43.0] - [2025-04-16]
- Automatically refresh the CLI status after update.

## [0.42.3] - [2025-04-16]
- Added support for `bq.seed` type in asset yaml schema.

## [0.42.2] - [2025-04-11]
- Support multiline input for column and custom check fields.

## [0.42.1] - [2025-04-10]
- Improved `CLI install` and `update` UX in Settings Tab.

## [0.42.0] - [2025-04-10]
- Added export functionality to export query output to a CSV file.

## [0.41.2] - [2025-04-09]
- Fix Editing Behavior When Adding or Deleting Columns

## [0.41.1] - [2025-04-08]
- Fixed payload sanitization for columns details.

## [0.41.0] - [2025-04-08]
- Added auto CLI Version Check and Update Functionality to trigger a CLI update interactively.

## [0.40.5] - [2025-04-07]
- Remove Debounce from BruinPanel and Add Timeout for Rendering Errors Only.

## [0.40.4] - [2025-03-31]
- Remove `downstream` flag from `runWholetPipeline` command.

## [0.40.3] - [2025-03-31]
- Added support for `emr_serverless.spark` type in asset yaml schema.

## [0.40.2] - [2025-03-28]
- Displayed connection name in QueryPreview.

## [0.40.1] - [2025-03-28]
- Implemented debounce mechanism for rendering command in BruinPanel.

## [0.40.0] - [2025-03-28]
- Enabled adding, removing, and editing custom checks in asset columns.

## [0.39.8] - [2025-03-27]
- Fixed flickering issue, optimize data loading in LineagePanel, and improve cleanup.

## [0.39.7] - [2025-03-21]
- Sorted connection types alphabetically and refactored their formatting to use title case.

## [0.39.6] - [2025-03-21]
- Added  `Toggle Folding` Command, enabling users to manage custom foldable regions in Bruin directly from the command palette.

## [0.39.5] - [2025-03-20]
- Set 'tab-1' as the default tab in QueryPreview and added a reset panel functionality.

## [0.39.4] - [2025-03-18]
- Enable state persistence in `Query Preview` to retain query output when switching between VS Code panels.

## [0.39.3] - [2025-03-12]
- Added environment display to the query preview panel, showing the selected environment from the side panel dropdown.

## [0.39.2] - [2025-03-11]
- Added expandable cells in Query Preview for long text, with `copy` support and `ESC` to close all expanded cells.

## [0.39.1] - [2025-03-11]
- Adjust column layout to set primary key as a separate column.

## [0.39.0] - [2025-03-11]
- Added primary_key to column data with support for composite primary keys.

## [0.38.5] - [2025-03-10]
- Update keybinding display for platforms and remove unused 'value' property in columns checks.

## [0.38.4] - [2025-03-07]
- Improved columns checks Dropdown positioning and run button UI on windows.

## [0.38.3] - [2025-03-07]
- Replaced markdown-preview auto-lock workaround with a custom preview to fix serialization errors and enable auto-refresh.

## [0.38.2] - [2025-03-06]
- Refactored command payload to handle undefined environment values.

## [0.38.1] - [2025-03-05]
- Added support for tab label editing via double-click and refactored query data loading to prevent automatic execution on mount.

## [0.38.0] - [2025-03-04]
- Added multi-tab support to the QueryPreview component, allowing users to manage multiple query results simultaneously.

## [0.37.2] - [2025-03-03]
- Resolved the visibility issue with icons in the Query Preview Panel.

## [0.37.1] - [2025-02-28]
- Fixed CustomChecks to correctly recognize `0` as a valid check value instead `undefined`.

## [0.37.0] - [2025-02-28]
- Added search functionality to the Query Preview Panel.

## [0.36.0] - [2025-02-27]
- Added support for executing `selected queries` in the Query Preview Panel.
- The selected queries should belong to a valid `bruin` asset.

## [0.35.3] - [2025-02-26]
- Optimize payload size for description and asset name updates and improve error handling.

## [0.35.2] - [2025-02-25]
- Adjust the styling of the save and cancel buttons in the description editing.

## [0.35.1] - [2025-02-24]
- Add loading state to the query preview.

## [0.35.0] - [2025-02-24]
- Introduce a new **Query Preview Panel** to display the output of SQL `query` execution.  
- This feature currently uses the **default** environment with a maximum limit of **1000**.

## [0.34.1] - [2025-02-17]
- Reset filter panel state on file change and improve graph viewport adjustments for expanded nodes.

## [0.34.0] - [2025-02-17]
- Add options panel to the lineage view with choices to display either all upstream & downstream dependencies or only direct dependencies.

## [0.33.2] - [2025-02-14]
- Improve description editing by adding clear Save and Cancel buttons.

## [0.33.1] - [2025-02-07]
- Display render button for all file extensions, ensuring Bruin render is always visible.

## [0.33.0] - [2025-02-07]
- Adde a Control panel with zoom, view fit, and lock buttons and reduced top gap in the lineage flow.

## [0.32.13] - [2025-02-05]
- Resolved an issue where terminal commands occasionally missed the first letter, causing execution failures.

## [0.32.12] - [2025-02-05]
- Format the rendering error message to display differently based on the phase (rendering or validation).

## [0.32.11] - [2025-01-30]
- Fixed ConnectionForm not resetting when switching between edit and new connection.

## [0.32.10] - [2025-01-30]
- Improved truncation behavior for pipeline and asset names and ensured asset name edit mode closes on mouse leave.

## [0.32.9] - [2025-01-29]
- Asset validation errors now expand for single assets and pipelines, while multiple pipeline errors stay collapsed.

## [0.32.8] - [2025-01-29]
- Fixed an issue where new files opened in the side panel's group, causing confusion; the panel now locks by default.

## [0.32.7] - [2025-01-20]
- Updated config schema to support more SSL modes and revised Athena schema.

## [0.32.6] - [2025-01-16]
- Update the pipeline autocomplete schema to make name the only required field.

## [0.32.5] - [2025-01-15]
- Added system information display to show Bruin CLI and extension versions, along with OS name.

## [0.32.4] - [2024-12-28]
- Increase maxBuffer limit.

## [0.32.3] - [2024-12-23]
- Added support for running pipeline from last failure.

## [0.32.2] - [2024-12-20]
- Made Full Path Usage Default for Bruin CLI.

## [0.32.1] - [2024-12-20]
- Added a link to Bruin documentation in the extension settings.

## [0.32.0] - [2024-12-19]
- Added a test connection feature to test existing connections.

## [0.31.5] - [2024-12-18]
- Prevented form resets when uploading a GCP json file in the ConnectionsForm component.

## [0.31.4] - [2024-12-18]
- Fixed an issue where updating an asset's name would reset its description, owner, and type fields.

## [0.31.3] - [2024-12-17]
- Fix Asset Name Falling to Default Value After Editing Description.

## [0.31.2] - [2024-12-17]
- Correct Path Handling for Bruin Executable in Configuration.

## [0.31.1] - [2024-12-17]
- Improved error handling, logging, and CLI path resolution for better command execution.

## [0.31.0] - [2024-12-13]
- Linked asset columns to glossary entries for quick navigation.

## [0.30.3] - [2024-12-13]
- Implemented the ability to add accepted values for asset columns.

## [0.30.2] - [2024-12-12]
- Added the ability to add pattern checks with input values.

## [0.30.1] - [2024-12-12]
- Enabled telemetry by default to improve performance monitoring and user experience.

## [0.30.0] - [2024-12-12]
- Integrated RudderStack analytics to monitor extension performance, with support for user-controlled telemetry preferences.

## [0.29.4] - [2024-12-10]
- Improved layout and styling for inputs and buttons for better responsiveness and consistency.

## [0.29.3] - [2024-12-09]
- Hid the file input when selecting `service_account_json` for GCP connections.

## [0.29.2] - [2024-12-05]
- Refactored the DateInput component to handle dates in UTC rather than local time.

## [0.29.1] - [2024-12-04]
- Fix CLI Installation Check in Offline Mode.

## [0.29.0] - [2024-12-04]
- Allow editing asset name and description in the side panel and add a Bruin documentation button in Settings.

## [0.28.0] - [2024-11-29]
- Added support for displaying custom checks in the UI.

## [0.27.2] - [2024-11-29]
- Fix Error Handling in BruinValidate Class and Add Windows-Specific Validation

## [0.27.1] - [2024-11-25]
- Resolved the issue with adding new columns in assets by refactoring the accepted_value check structure.

## [0.27.0] - [2024-11-19]
- Added functionality to manage column checks from the UI, with the ability to remove all checks and add most checks (except `accepted_values` and `pattern`).

## [0.26.10] - [2024-11-18]
- Removed the Bruin Executable Path from the extension settings.

## [0.26.9] - [2024-11-18]
- Improved Git Bash detection on Windows by dynamically resolving its path based on the Git executable location.

## [0.26.8] - [2024-11-18]
- Add support for detecting Git Bash in different on Windows.

## [0.26.7] - [2024-11-15]
- Fix the issue causing bruin.renderSQL to fail.

## [0.26.6] - [2024-11-15]
- Fix the render error when the CLI is not installed or the path is not found.

## [0.26.5] - [2024-11-15]
- Added new parameters to the YAML asset completion and validation schema.

## [0.26.4] - [2024-11-14]
- Fixed an issue where non-SQL Shopify assets were incorrectly displayed in the SQL preview.

## [0.26.3] - [2024-11-14]
- Added delete column functionality with confirmation alert and expanded supported destinations in yaml-assets-schema.json.

## [0.26.2] - [2024-11-13]
- Add version check for Bruin CLI to compare current and latest versions and notify the user if an update is available

## [0.26.1] - [2024-11-13]
- Adjusted the column checks' blocking property type to align with the CLI output.

## [0.26.0] - [2024-11-13]
- Added functionality to add and update columns directly from the UI in the Columns tab.

## [0.25.29] - [2024-11-12]
- Added functionality to retrieve all connections from the json schema using internal and introduced CSV upload support for custom chess players.

## [0.25.28] - [2024-11-07]
- Update Terminal Creation to Default to Git Bash on Windows.

## [0.25.27] - [2024-11-06]
- Fixed the validate and run buttons hover colors to match the vscode themes. 

## [0.25.26] - [2024-11-06]
- Fixed the validate and run buttons height. 

## [0.25.25] - [2024-11-06]
- Added excetuable path to the bruin commands to run on the powershell. 

## [0.25.24] - [2024-11-06]
- Add excetuable path option to the configuration for windows. 

## [0.25.23] - [2024-11-06]
- Updated the logic to look fo bruin executable path on windows and add debugging informations. 

## [0.25.22] - [2024-11-06]
- Used the install script on all the platforms.

## [0.25.21] - [2024-11-06]
- Remove blockers.

## [0.25.20] - [2024-11-06]
- Fixed Bruin Render command to run properly from the command palette.

## [0.25.19] - [2024-11-06]
- Clarified Windows installation message to specify Git requirement and fixed CLI installation command to run from the command palette.

## [0.25.18] - [2024-11-06]
- Enhanced Bruin CLI installation process with a new shell script for Windows and Linux, and Homebrew support for macOS.

## [0.25.17] - [2024-11-01]
- Refactored asset validation and run button styles to improve consistency with the VSCode editor.

## [0.25.16] - [2024-11-01]
- Adjust the position of the environment dropdown menu, moving it from the top to the bottom.

## [0.25.15] - [2024-11-01]
- Adjust date input background color to align with GitHub's dimmed dark theme.

## [0.25.14] - [2024-10-31]
- Removed the connections from the `fullasset` snippet

## [0.25.13] - [2024-10-31]
- Replaced ellipsis icon with arrow icon to toggle checkbox group.

## [0.25.12] - [2024-10-31]
- Improved UI consistency for DateInput and CheckboxGroup components, including updated styling and layout adjustments.

## [0.25.11] - [2024-10-31]
- Improved error handling to display 'panic' errors more clearly.

## [0.25.10] - [2024-10-29]
- Added 'Show More' for long descriptions, displayed pipeline names before asset titles, and optimized view by hiding tags and pipeline names on smaller screens.

## [0.25.9] - [2024-10-25]
- Rearrange asset details layout: move asset name and tags to the top with tabs positioned below for improved UI structure.

## [0.25.8] - [2024-10-25]
- Moved Lineage Panel to a dedicated component for improved organization and performance.

## [0.25.7] - [2024-10-24]
- Updated Content-Security-Policy for BruinPanel and LineagePanel, and refactored initialization logic for improved security and performance.

## [0.25.6] - [2024-10-23]
- Added support for Athena connections in the Bruin configuration schema and connection form.

## [0.25.5] - [2024-10-23]
- Ensured proper visibility of the lineage panel when focusing on the side panel and improved focus handling during extension activation.

## [0.25.4] - [2024-10-22]
- Refactored error handling to prevent UI from crashing when parsing errors occur, ensuring graceful error display.

## [0.25.3] - [2024-10-18]
- Introduced separate handling and display of warnings and critical errors, providing a clearer distinction between the two and improving overall user experience.

## [0.25.2] - [2024-10-15]
- Fixed an issue where the GCP service account file was incorrectly saved as `service_account_json` instead of `service_account_file`.

## [0.25.1] - [2024-10-14]
- Added YAML syntax highlighting support with "redhat.vscode-yaml" extension and updated regex patterns for improved parsing.

## [0.25.0] - [2024-09-26]
- Added the ability to edit asset names and descriptions directly in the UI, integrating the Bruin CLI patchAssetCommand for updates

## [0.24.1] - [2024-09-23]
- Added 'default' keyword to highlight the default environment in the UI, preselected it in the dropdown, and refactored asset parameters schema.

## [0.24.0] - [2024-09-23]
- Added the ability to duplicate connections with a prefilled form and " (Copy)" appended to the name.

## [0.23.1] - [2024-09-20]
- Reorganized the connection form by moving optional fields to the bottom and updated the color of the delete icon for better visual consistency.

## [0.23.0] - [2024-09-20]
- Added a radio button in the GCP connection form, allowing users to choose between a file picker for service_account_json or directly inputting the schema in a text area.

## [0.22.4] - [2024-09-20]
- Introduced a file picker for selecting the `service_account_json` in GPC connections.
- Fixed connection keywords and set default values for a smoother user experience.

## [0.22.3] - [2024-09-20]
- Added validation for duplicate connection names in the same environment, with an error message displayed for duplicates. 
- Optimized connection management and made the port field editable.

## [0.22.2] - [2024-09-18]
- Added an eye icon to the password input field, enabling users to toggle visibility for easier password input management.

## [0.22.1] - [2024-09-18]
- Updated the connection form to make the `port` field editable with a default value, and adjusted schema validation to allow an empty string for `ssl_mode`. 
- Resolved an issue with PostgreSQL connections.

## [0.22.0] - [2024-09-17]
- Added the ability to edit existing connections directly from the UI, integrated with the Bruin CLI for seamless updates.

## [0.21.0] - [2024-09-13]
- Introduced the ability to add a new connection directly from the UI, leveraging the Bruin CLI command.
- Updated the autocomplete schema to include support for Databricks connections.

## [0.20.1] - [2024-09-13]
- Fixed an issue where the UI would incorrectly re-render after clicking on an asset file to edit, ignoring the state of the "full-refresh" checkbox.

## [0.20.0] - [2024-09-06]
- Introduced the ability to delete a connection via the UI.

## [0.19.0] - [2024-09-05]
### Added
- Section for displaying connections with Bruin CLI integration.
- Alert for ensuring the latest Bruin CLI version.
### Fixed 
- Added message for when no columns are available.

## [0.18.3] - [2024-09-05]
- Fixed issues from the previous release.
- Removed background color from the columns table, adjusted check badge width, and updated font styles for the Name and Type columns."

## [0.18.2] - [2024-09-03]
- Improved the display and styling of the columns tab.

## [0.18.1] - [2024-09-02]
- Fixed the display and styling of asset descriptions for better readability and visual consistency.

## [0.18.0] - [2024-08-30]
- Introduced a new tab to display asset columns and their associated quality checks.

## [0.17.6] - [2024-08-21]
- Resolved issue with the date input not triggering the datepicker on click.

## [0.17.5] - [2024-08-21]
- Temporarily removed the connection tab from the side panel.
- Corrected the schema for pipeline autocomplete to allow new, unlisted connections and updated the requirement so that either `name` or `id` must be present.
- Updated the input date indicator with a Heroicon for a consistent design and adjusted its color to match VSCode themes.

**Note:**
*Note: Due to issues with the VSCode extension publisher, some versions between 0.17.1 and 0.17.5 were not available to users. All fixes and updates during this period have been consolidated under version 0.17.5.*

## [0.17.1] - [2024-08-20]
- Fixed: SQL snippet formatting and removed unnecessary sections like secrets and parameters.

## [0.17.0] - [2024-08-16]
- New Bruin CLI management tab in the side panel for installing or updating the CLI.
- Windows-specific check for Go, with a link to documentation if Go is not installed.
- Renamed "Bruin" panel to "Lineage" for improved clarity.

## [0.16.1] - [2024-08-14]
- Resolved an issue where checking the push-metadata checkbox caused unnecessary re-renders in the SQL Preview.

## [0.16.0] - [2024-08-13]
- Introduced a popup to display asset information and enable opening the asset text document in VSCode for additional details.
- Added a tooltip that reveals the full asset name on hover over a node when the name is truncated.

## [0.15.3] - [2024-08-08]
- Resolved a problem where file modifications led to date resets. Dates will now stay consistent when switching assets or files, unless manually updated.

## [0.15.2] - [2024-08-08]
- Fixed an issue with the loading state in the lineage panel when no lineage data is available.

## [0.15.1] - [2024-08-06]
- Fixed an issue where the "Show More" functionality in the lineage panel was not working as expected.
- Improved the visual layout of nodes within the lineage panel for better readability.

## [0.15.0] - [2024-08-02]
- Added a new checkbox to the main panel for enabling the metadata push feature.

## [0.14.3] - [2024-08-02]
- Added quoting around file paths to handle spaces and special characters.

## [0.14.2] - [2024-08-02]
- Clarified error messages by distinguishing between render and validate phases.
- Ensured the SQL Editor remains visible during validation errors.

## [0.14.1] - [2024-07-31]
- Removed `materialization`, `connections`, and `parameters` fields from Python asset snippets.

## [0.14.0] - [2024-07-31]
-  Users can now expand properties in the lineage view to see further upstream and downstream elements.
-  Resolved an infinite loop issue, improving performance.
-  Added a VSCode error window for outdated CLI.

- ## [0.13.6] - [2024-07-29]
- Nodes in the lineage graph can now be dragged freely. Clicking the refresh button will restore them to their initial positions.

- ## [0.13.5] - [2024-07-26]
- Fixed an indentation issue in the asset snippets.
- Removed the requirement for "type" in the columns of the autocomplete schema

- ## [0.13.4] - [2024-07-25]
- Enhanced the SQL and Python asset files with modularized snippets for autocomplete.

- ## [0.13.3] - [2024-07-24]
- Decreased the vertical spacing between the nodes in the lineage graph.

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
