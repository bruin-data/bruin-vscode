# Extension structure

This section provides a quick introduction into how this sample extension is organized and structured.

The two most important directories to take note of are the following:

- `src`: Contains all of the extension source code
- `webview-ui`: Contains all of the webview UI source code

## **`src` Directory**

The **`src`** directory contains all of the extension-related source code and can be thought of as the "backend" logic for the Bruin VSCode extension. Inside this directory, you will find the following key components:

- **`bruin`**: Contains command files specific to Bruin functionality, such as command handlers for`run`, `validate`, ...
- **`constants`**: Stores constants that are used throughout the extension.
- **`panels`**: Defines the logic for the two principal webview panels, which are the **LineagePanel**, and **BruinPanel**.
- **`providers`**: Includes providers for extension features such as autocompletion, and folding ranges.
- **`test`**: Contains unit tests for various components, ensuring code quality and correctness.
- **`types`**: Defines TypeScript types used across the extension for type safety and consistency.
- **`ui-test`**: Handles user interface testing for the extension, using selenium.
- **`utilities`**: Includes utility functions that simplify tasks like managing resources or performing commonly needed operations.

#### **`panels` Directory**

The **`panels`** directory holds all the logic related to webview panels that will be executed within the extension context. This can be thought of as the backend for each webview panel in the extension.

The directory two TypeScript files, each representing a class that manages the state and behavior of a each webview panel. Key responsibilities of each class include:

- Creating and rendering the webview panel.
- Properly cleaning up and disposing of webview resources when the panel is closed.
- Setting up message listeners to facilitate communication between the webview and the extension.
- Initializing the webview’s HTML or markdown content.
- Implementing any custom logic and behavior specific to the webview panel.

#### **`utilities` Directory**

The **`utilities`** directory contains helper functions that make managing the extension easier. 

#### **`extension.ts`**

The **`extension.ts`** file contains the logic for activating and deactivating the extension. This file is also where extension commands are registered, allowing interaction between the extension and VSCode. It is a central place where extension startup and shutdown processes are handled.


## `webview-ui` directory

The `webview-ui` directory contains all of the Vue-based webview source code and can be thought of as containing the "frontend" code/logic for the extension webview.

`webview-ui` contains its own `package.json`, `node_modules`, `tsconfig.json`, and so on––separate from the  extension in the root directory.

This strays a bit from other extension structures, in that you'll usually find the extension and webview dependencies, configurations, and source code more closely integrated or combined with each other.

However, in this case, there are some unique benefits and reasons for why this extension does not follow those patterns such as easier management of conflicting dependencies and configurations, as well as the ability to use the Vite dev server, which improves the speed of developing the webview UI, versus recompiling the extension code every time we make a change to the webview.
