import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  window,
  workspace,
} from "vscode";
import * as vscode from "vscode";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
const Analytics = require("@rudderstack/rudder-sdk-node");
import {
  getDefaultBruinExecutablePath,
  setupFoldingOnOpen,
  subscribeToConfigurationChanges,
} from "./configuration";
import * as os from "os";
import { renderCommand } from "./commands/renderCommand";
import { LineagePanel } from "../panels/LineagePanel";
import { installOrUpdateCli } from "./commands/updateBruinCLI";
import { promptForTelemetryConsent } from "../bruin/bruinTelemetry";
//import { RudderTyperAnalytics } from '../analytics/index';
console.log("RudderStack package:", Analytics);
console.log("RudderStack keys:", Object.keys(Analytics));

const WRITE_KEY = "2q3zybBJRd9ErKIpkTRSdIahQ0C";
const DATA_PLANE_URL = "https://getbruinbumlky.dataplane.rudderstack.com";
export async function activate(context: ExtensionContext) {
  promptForTelemetryConsent();

  const config = workspace.getConfiguration("bruin");
  const telemetryEnabled = config.get<boolean>('telemetry.enabled');

  if (telemetryEnabled) {
    try {
      // Alternative initialization approach
      const client = new Analytics(WRITE_KEY, {
        dataPlaneUrl: DATA_PLANE_URL,
        logLevel: "debug",
        storage: {
          type: "localStorage",
        },
      });

      client.track({
        event: "Extension Activated",
        anonymousId: "anonymous-id",
        properties: {
          platform: os.platform(),
          arch: os.arch(),
          version: vscode.version,
        },
      });

      client.identify({
        userId: "user-id",
        traits: {
          name: "John Doe",
          email: "test@test.com",
        },
      });
      console.debug("RudderStack client initialized successfully");
    } catch (error) {
      console.error("RudderStack initialization failed:", error);
      vscode.window.showErrorMessage(
        `RudderStack initialization error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Check the current platform
  const isWindows = os.platform() === "win32";
  const newPathSeparator = isWindows ? "\\" : "/";
  config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);

  const bruinExecutable = getDefaultBruinExecutablePath();
  /* if (bruinExecutable) {
    await checkBruinCliVersion();
  }  */
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    // Focus the active editor if it exists
    vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  } else {
    // If no active editor, try to focus the editor group
    vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
  }

  // Setup folding on open
  setupFoldingOnOpen();

  subscribeToConfigurationChanges();

  const lineageWebviewProvider = new LineagePanel(context.extensionUri);

  // Register the folding range provider for Python and SQL files
  const foldingDisposable = languages.registerFoldingRangeProvider(["python", "sql"], {
    provideFoldingRanges: bruinFoldingRangeProvider,
  });

  context.subscriptions.push(
    commands.registerCommand("bruin.renderSQL", async () => {
      try {
        await renderCommand(context.extensionUri);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error rendering SQL: ${errorMessage}`);
      }
      /* if (bruinExecutable) {
        try {
          await checkBruinCliVersion();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Error checking Bruin CLI version: ${errorMessage}`);
        }
      } */
    }),
    commands.registerCommand("bruin.installCli", async () => {
      try {
        await installOrUpdateCli();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error installing/updating Bruin CLI: ${errorMessage}`);
      }
    }),
    foldingDisposable,
    window.registerWebviewViewProvider(LineagePanel.viewId, lineageWebviewProvider)
  );

  console.debug("Bruin activated successfully");
}
