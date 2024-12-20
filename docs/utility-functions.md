# Bruin Extension Utility Functions Documentation

## Configuration.ts

### `getDefaultBruinExecutablePath(): string`
This function retrieves the path to the Bruin executable. It attempts to find the executable in the system’s PATH. On Windows, it will additionally check `~/.local/bin` for the executable. The option to configure a custom Bruin executable path in the workspace settings is no longer available.

#### Returns
- **string**: The path to the Bruin executable.

#### Behavior
- The function searches for the Bruin executable in the system’s PATH.
- On Windows, it also checks `~/.local/bin` for the executable.
- If the executable is not found in either location, the function defaults to using bruin as the executable name.

#### Example Usage
```ts
const bruinExecutable = getDefaultBruinExecutablePath();
console.log(bruinExecutable);  // Logs the path of the Bruin executable
```

### `getPathSeparator(): string`

#### Description
This function retrieves the configured path separator used by the Bruin extension. It checks the workspace configuration for `bruin.pathSeparator`. If not set, it defaults to `/`.

#### Returns
- **string**: The configured path separator (either `/` or the user-defined separator).

#### Example Usage
```ts
const separator = getPathSeparator();
console.log(separator);  // Logs the path separator
```

### `applyFoldingStateBasedOnConfiguration(editor: vscode.TextEditor | undefined): void`

#### Description
This function applies the initial folding state to a document based on the user’s configuration settings. It only applies folding when the document is first focused, ensuring that manual adjustments to folding state are not overwritten. The default folding state is configured under `bruin.FoldingState` and can be either "folded" or "expanded".

#### Parameters
- **editor** (`vscode.TextEditor | undefined`): The active text editor where folding commands will be executed.

#### Returns
- **void**: No return value.

### `setupFoldingOnOpen(): void`

#### Description
Sets up an event listener that triggers the `applyFoldingStateBasedOnConfiguration` function whenever the active text editor changes. This ensures the folding state is applied the first time a document is opened or focused.

#### Returns
- **void**: No return value.

### `resetDocumentStates(): void`

#### Description
Clears the document initialization state tracking map. This is typically called when the folding configuration changes, allowing the new settings to be applied the next time any document is opened.

#### Returns
- **void**: No return value.


### `subscribeToConfigurationChanges(): void`

#### Description
Subscribes to configuration changes and resets the document states whenever the default folding state is changed in the configuration.

#### Returns
- **void**: No return value.
---

## Notes
- The configuration options for this extension can be modified in the `settings.json` file under the `bruin` namespace.
  - `bruin.pathSeparator`: Defines the path separator used.
  - `bruin.FoldingState`: Defines the default folding state for documents ("folded" or "Expanded").
- The extension uses `fs` and `path` modules to interact with the file system and search for the Bruin executable, ensuring compatibility across platforms.

---

## Extension.ts
### `activate(context: ExtensionContext)`

The `activate` function is the entry point for initializing the Bruin VSCode extension. It is called when the extension is activated by the user. The function performs several setup tasks, such as configuring `telemetry`, setting up the folding range provider for specific languages, handling the editor's focus, and initializing the Bruin CLI path.

#### Parameters
- **context** (`ExtensionContext`): The context for the extension, providing methods and properties related to the extension's lifecycle.

#### Behavior
1. **Telemetry Setup (Optional)**: 
   - If telemetry is enabled in the configuration, the function initializes the RudderStack analytics client and sends an "Extension Activated" event with details about the environment (platform, architecture, and VSCode version).
   - If telemetry setup fails, an error is logged.

2. **Platform-Specific Path Separator**:
   - The function checks the current operating system (`win32` or others) and updates the `pathSeparator` configuration accordingly (`\\` for Windows and `/` for others).

3. **Focus on Active Editor**:
   - If an editor is active, it ensures the editor group is focused.
   - If no editor is active, it attempts to focus on the first editor group.

4. **Setup Folding on Open**:
   - The `setupFoldingOnOpen()` function is called to apply the folding state for documents based on user configuration when they are first opened or focused.

5. **Configuration Changes Listener**:
   - The `subscribeToConfigurationChanges()` function listens for configuration changes and resets document folding states when relevant settings change.

6. **Lineage Panel**:
   - A new instance of the `LineagePanel` webview provider is created and registered. This provider handles rendering the asset lineage in a webview.

7. **Folding Range Provider**:
   - The extension registers a folding range provider for Python and SQL files, using the `bruinFoldingRangeProvider` to provide folding ranges based on user configuration.

8. **Command Registration**:
   - The extension registers two commands:
     - `bruin.renderSQL`: Renders SQL based on the provided command, catching any errors and displaying them to the user.
     - `bruin.installCli`: Installs or updates the Bruin CLI. Any errors encountered are displayed to the user.

#### Example Usage
This function is automatically called when the extension is activated.

#### Notes
- The extension checks for the `telemetry.enabled` configuration setting to decide whether or not to send telemetry data to RudderStack.
- If the Bruin executable cannot be found, the extension will still proceed without failing silently.
- The `LineagePanel` webview provider allows users to interact with asset lineage information in a custom panel within VSCode.

#### Example Code:
```ts
import { activate } from "./activate";

const context = {};  // Example context
activate(context);
```

