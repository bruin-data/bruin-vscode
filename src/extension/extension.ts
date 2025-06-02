/* eslint-disable @typescript-eslint/naming-convention */
import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  window,
  workspace,
  WorkspaceConfiguration
} from "vscode";
import * as vscode from "vscode";
import * as os from "os";
import { bruinFoldingRangeProvider } from "../providers/bruinFoldingRangeProvider";
import {
  setupFoldingOnOpen,
  subscribeToConfigurationChanges,
  toggleFoldingsCommand,
} from "./configuration";
import { renderCommand } from "./commands/renderCommand";
import { AssetLineagePanel } from "../panels/LineagePanel";
import { installOrUpdateCli } from "./commands/updateBruinCLI";
import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinPanel } from "../panels/BruinPanel";


let analyticsClient: any = null;

const WRITE_KEY = "2q3zybBJRd9ErKIpkTRSdIahQ0C";
const DATA_PLANE_URL = "https://getbruinbumlky.dataplane.rudderstack.com";
const SUPPORTED_LANGUAGES = ["python", "sql"];


/**
 * Initializes analytics client lazily only when needed
 */
function initializeAnalytics(): any {
  if (analyticsClient) {
    return analyticsClient;
  }
    const config = workspace.getConfiguration("bruin");
    const telemetryEnabled = config.get<boolean>("telemetry.enabled");
    
    if (!telemetryEnabled) {
      return null;
    }

    try {
      const Analytics = require("@rudderstack/rudder-sdk-node");
      analyticsClient = new Analytics(WRITE_KEY, {
        dataPlaneUrl: DATA_PLANE_URL,
        logLevel: "debug",
        storage: {
          type: "localStorage",
        },
      });
      
      return analyticsClient;
    } catch (error) {
      console.error("RudderStack initialization failed:", error);
      return null;
    }
}

function trackEvent(eventName: string, properties: Record<string, any> = {}): void {
  try {
    const client = initializeAnalytics();
    if (!client) {return;}
          client.track({
        event: eventName,
        anonymousId: "anonymous-id",
        properties: {
          platform: os.platform(),
          arch: os.arch(),
          version: vscode.version,
          ...properties
        },
      });
  } catch (error) {
    console.error(`Failed to track event ${eventName}:`, error);
  }
}

async function ensureAutoLockEnabled(config: WorkspaceConfiguration): Promise<void> {
    const autoLockGroups: Record<string, boolean> = config.get("autoLockGroups") || {};
    const viewTypeKey = `mainThreadWebview-${BruinPanel.viewId}`;
    
    if (!autoLockGroups[viewTypeKey]) {
      const updatedAutoLockGroups = {
        ...autoLockGroups,
        [viewTypeKey]: true
      };

      try {
        await config.update("autoLockGroups", updatedAutoLockGroups, true);
      } catch (error) {
        console.error("Failed to update autoLockGroups setting:", error);
      }
    }

}

async function updatePathSeparator(config: WorkspaceConfiguration): Promise<void> {
    const isWindows = os.platform() === "win32";
    const newPathSeparator = isWindows ? "\\" : "/";
    const currentSeparator = config.get("pathSeparator");
    
    if (currentSeparator !== newPathSeparator) {
      await config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);
    }
}
export async function activate(context: ExtensionContext) {  
  const startTime = Date.now();
  console.time("Bruin Activation Total");
  console.log('Bruin extension is now active!');

  // Focus the active editor first to prevent undefined fsPath errors
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  } else {
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
  }

  // Initialize analytics client
  const analytics = initializeAnalytics();
  trackEvent("Extension Activated");

  const bruinConfig = workspace.getConfiguration("bruin");
  const workbenchConfig = workspace.getConfiguration("workbench.editor");
  
  setTimeout(() => {
    trackEvent("Extension Activated");
  }, 0);

  const pathSeparatorPromise = updatePathSeparator(bruinConfig);

  const setupPromises = [
    ensureAutoLockEnabled(workbenchConfig),
    setupFoldingOnOpen()
  ];
  
  // Register the WebView panel serializer
  if (vscode.window.registerWebviewPanelSerializer) {
    context.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer(BruinPanel.viewId, {
          async deserializeWebviewPanel(webviewPanel, state) {
            try {
              console.time("panel-restore");
              BruinPanel.currentPanel = BruinPanel.restore(webviewPanel, context.extensionUri);
              console.timeEnd("panel-restore");
              console.debug("Bruin panel restored from state:", state);
            } catch (error) {
              console.error("Failed to restore Bruin panel:", error);
            }
          }
        })
      );
  }
  
  const assetLineagePanel = new AssetLineagePanel(context.extensionUri);
  const queryPreviewWebviewProvider = new QueryPreviewPanel(context.extensionUri, context);
  
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(AssetLineagePanel.viewId, assetLineagePanel),
      window.registerWebviewViewProvider(QueryPreviewPanel.viewId, queryPreviewWebviewProvider)
    );

  const foldingDisposable = languages.registerFoldingRangeProvider(
    SUPPORTED_LANGUAGES, 
    { provideFoldingRanges: bruinFoldingRangeProvider }
  );
  context.subscriptions.push(foldingDisposable);
  
  subscribeToConfigurationChanges();
  
  const defaultFoldingState = bruinConfig.get("bruin.FoldingState", "folded");
  let toggled = defaultFoldingState === "folded";

  // Register commands
  const commandDisposables = [
    commands.registerCommand("bruin.renderSQL", async () => {
      try {
        trackEvent("Command Executed", { command: "renderSQL" });
        console.time("render-sql-command");
        await renderCommand(context.extensionUri);
        console.timeEnd("render-sql-command");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error rendering SQL: ${errorMessage}`);
      }
    }),
    
    commands.registerCommand("bruin.installCli", async () => {
      try {
        trackEvent("Command Executed", { command: "installCli" });
        console.time("install-cli-command");
        await installOrUpdateCli();
        console.timeEnd("install-cli-command");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error installing/updating Bruin CLI: ${errorMessage}`);
      }
    }),
    
    commands.registerCommand("bruin.toggleFoldings", async () => {
      try {
        toggled = !toggled;
        trackEvent("Command Executed", { command: "toggleFoldings", state: toggled ? "folded" : "unfolded" });
        console.time("toggle-foldings-command");
        await toggleFoldingsCommand(toggled); 
        console.timeEnd("toggle-foldings-command");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error toggling foldings: ${errorMessage}`); 
      }
    }),

    commands.registerCommand("bruin.convertFileToAsset", async () => {
      try {
        trackEvent("Command Executed", { command: "convertFileToAsset" });
        if (BruinPanel.currentPanel) {
          //await BruinPanel.currentPanel.convertCurrentDocument();
          console.log("Bruin panel is active.");
        } else {
          console.error("Bruin panel is not active.");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error converting file to asset: ${errorMessage}`);
      }
    })
  ];
  
  context.subscriptions.push(...commandDisposables);

  console.time("setup-promises");
  await Promise.all([pathSeparatorPromise, ...setupPromises]);
  console.timeEnd("setup-promises");

  const activationTime = Date.now() - startTime;
  console.debug(`Bruin activated successfully in ${activationTime}ms`);
  console.timeEnd("Bruin Activation Total");
}