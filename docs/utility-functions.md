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

---------
**utilities/helperUtils.ts**

### **Bruin VSCode Extension Utility Functions Documentation** 

#### **`isEditorActive()`**

Checks whether there is an active text editor in the VSCode window.

**Returns**:  
- `boolean` - `true` if an editor is active, otherwise `false`.

---

#### **Interfaces**

**`Environment`**  
Represents an environment with a name property.

```typescript
export interface Environment {
  name: string;
}
```

**`Input`**  
Represents input data that includes the selected environment and a list of environments.

```typescript
export interface Input {
  selectedEnvironment: string;
  environments: Environment[];
}
```

---

#### **`transformToEnvironmentsArray(input: string)`**

Transforms the input string (assumed to be a JSON string) into an array of environment names.

**Parameters**:  
- `input` (string) - A JSON string containing environment data.

**Returns**:  
- `string[]` - An array of environment names.

---

#### **`isFileExtensionSQL(fileName: string)`**

Checks if the file has a `.sql` extension.

**Parameters**:  
- `fileName` (string) - The name of the file to check.

**Returns**:  
- `boolean` - `true` if the file extension is `.sql`, otherwise `false`.

---

#### **`getFileExtension(fileName: string)`**

Extracts and returns the file extension from the given filename.

**Parameters**:  
- `fileName` (string) - The name of the file.

**Returns**:  
- `string` - The file extension, including the dot (`.`).

---

#### **`isPythonBruinAsset(fileName: string)`**

Checks if a file is a Python-based Bruin asset (i.e., has a `.py` extension and contains Bruin asset content).

**Parameters**:  
- `fileName` (string) - The name of the file.

**Returns**:  
- `Promise<boolean>` - `true` if the file is a Python Bruin asset, otherwise `false`.

---

#### **`isBruinPipeline(fileName: string)`**

Checks if the file is a Bruin pipeline file (i.e., `pipeline.yml` or `pipeline.yaml`).

**Parameters**:  
- `fileName` (string) - The name of the file.

**Returns**:  
- `Promise<boolean>` - `true` if the file is a Bruin pipeline, otherwise `false`.

---

#### **`isYamlBruinAsset(fileName: string)`**

Checks if the file is a YAML-based Bruin asset (i.e., `.asset.yml` or `.asset.yaml`).

**Parameters**:  
- `fileName` (string) - The name of the file.

**Returns**:  
- `Promise<boolean>` - `true` if the file is a YAML Bruin asset, otherwise `false`.

---

#### **`isBruinYaml(fileName: string)`**

Checks if the file is a `.bruin.yml` file.

**Parameters**:  
- `fileName` (string) - The name of the file.

**Returns**:  
- `Promise<boolean>` - `true` if the file has a `.bruin.yml` extension, otherwise `false`.

---

#### **`isBruinAsset(fileName: string, validAssetExtensions: string[])`**

Checks if the file is a Bruin asset by validating the file extension and searching for Bruin-specific content.

**Parameters**:  
- `fileName` (string) - The name of the file.
- `validAssetExtensions` (string[]) - A list of valid file extensions for Bruin assets.

**Returns**:  
- `Promise<boolean>` - `true` if the file is a Bruin asset, otherwise `false`.

---

#### **`encodeHTML(str: string)`**

Encodes special HTML characters in the given string.

**Parameters**:  
- `str` (string) - The string to encode.

**Returns**:  
- `string` - The encoded string.

---

#### **`removeAnsiColors(str: string)`**

Removes ANSI color codes from a given string.

**Parameters**:  
- `str` (string) - The string containing ANSI color codes.

**Returns**:  
- `string` - The string with the ANSI color codes removed.

---

#### **`processLineageData(lineageString: { name: any })`**

Processes the lineage data, extracting the name from the lineage string.

**Parameters**:  
- `lineageString` (object) - The lineage string object containing a `name` property.

**Returns**:  
- `any` - The extracted name from the lineage string.

---

#### **`getDependsSectionOffsets(document: vscode.TextDocument)`**

Finds the start and end offsets for the `depends:` section in a YAML file.

**Parameters**:  
- `document` (vscode.TextDocument) - The VSCode document containing the text to check.

**Returns**:  
- `Object` - An object containing the `start` and `end` offsets of the `depends:` section.

---

#### **`isChangeInDependsSection(change: vscode.TextDocumentContentChangeEvent, document: vscode.TextDocument)`**

Checks if the change occurred within the `depends:` section of the YAML file.

**Parameters**:  
- `change` (vscode.TextDocumentContentChangeEvent) - The change event.
- `document` (vscode.TextDocument) - The document being checked.

**Returns**:  
- `boolean` - `true` if the change is in the `depends:` section, otherwise `false`.

---

#### **`prepareFlags(flags: string, excludeFlags: string[])`**

Filters and prepares flags for a command by excluding specific flags.

**Parameters**:  
- `flags` (string) - A space-separated string of flags.
- `excludeFlags` (string[]) - Flags to exclude from the result.

**Returns**:  
- `string[]` - An array of concatenated flags, including default flags (`-o`, `json`).

---

#### **Connection Type and Interfaces**

**`ConnectionType`**  
Represents the different types of connections available in the extension (e.g., AWS, Athena, Snowflake, etc.).

**`Connection`**  
Defines a connection object, which contains the type, name, environment, and any additional properties.

```typescript
export interface Connection {
  type: ConnectionType;
  name: string | null;
  environment: string;
  [key: string]: any;
}
```

---

#### **`extractNonNullConnections(json: any)`**

Extracts non-null connections from a JSON object containing environment data.

**Parameters**:  
- `json` (any) - The JSON object containing environment and connection data.

**Returns**:  
- `Connection[]` - An array of non-null connections, each associated with its environment.

