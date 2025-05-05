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

// Analytics initialization is deferred to a separate function
let analyticsClient: any = null;

// Constants
const WRITE_KEY = "2q3zybBJRd9ErKIpkTRSdIahQ0C";
const DATA_PLANE_URL = "https://getbruinbumlky.dataplane.rudderstack.com";
const SUPPORTED_LANGUAGES = ["python", "sql"];

// Performance tracking map
const perfMetrics: Record<string, number> = {};

/**
 * Records the time taken for an operation
 */
function recordTime(operation: string, time: number): void {
  perfMetrics[operation] = time;
  console.log(`⏱️ ${operation}: ${time}ms`);
}

/**
 * Simple timing function that returns elapsed time
 */
function timeOperation<T>(operation: string, fn: () => T): T {
  console.time(operation);
  const start = Date.now();
  try {
    return fn();
  } finally {
    const elapsed = Date.now() - start;
    recordTime(operation, elapsed);
    console.timeEnd(operation);
  }
}

/**
 * Async timing function that returns elapsed time
 */
async function timeOperationAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  console.time(operation);
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - start;
    recordTime(operation, elapsed);
    console.timeEnd(operation);
  }
}

/**
 * Initializes analytics client lazily only when needed
 */
function initializeAnalytics(): any {
  if (analyticsClient) {
    return analyticsClient;
  }

  return timeOperation("analytics-init", () => {
    const config = workspace.getConfiguration("bruin");
    const telemetryEnabled = config.get<boolean>("telemetry.enabled");
    
    if (!telemetryEnabled) {
      return null;
    }

    try {
      // Lazily import analytics to improve startup performance
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
  });
}

/**
 * Track events using analytics client
 */
function trackEvent(eventName: string, properties: Record<string, any> = {}): void {
  try {
    const client = initializeAnalytics();
    if (!client) return;
    
    timeOperation("track-event", () => {
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
    });
  } catch (error) {
    console.error(`Failed to track event ${eventName}:`, error);
  }
}

/**
 * Ensures auto lock is enabled for panel
 */
async function ensureAutoLockEnabled(config: WorkspaceConfiguration): Promise<void> {
  return timeOperationAsync("auto-lock-config", async () => {
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
  });
}
/**
 * Update path separator based on platform 
 * Optimized to avoid unnecessary updates
 */
async function updatePathSeparator(config: WorkspaceConfiguration): Promise<void> {
  return timeOperationAsync("path-separator-update", async () => {
    const isWindows = os.platform() === "win32";
    const newPathSeparator = isWindows ? "\\" : "/";
    const currentSeparator = config.get("pathSeparator");
    
    // Only update if different from current value
    if (currentSeparator !== newPathSeparator) {
      await config.update("pathSeparator", newPathSeparator, ConfigurationTarget.Global);
    }
  });
}
export async function activate(context: ExtensionContext) {
  console.time("Bruin Activation Total");
  console.debug("Bruin activation started");
  const startTime = Date.now();
  
  // Use a single configuration instance for better performance
  const bruinConfig = timeOperation("config-read", () => workspace.getConfiguration("bruin"));
  const workbenchConfig = timeOperation("workbench-config-read", () => workspace.getConfiguration("workbench.editor"));
  
  // Defer tracking to not block activation
  setTimeout(() => {
    trackEvent("Extension Activated");
  }, 0);

  // Update path separator based on platform
  const pathSeparatorPromise = updatePathSeparator(bruinConfig);

  // Setup configurations asynchronously
  const setupPromises = [
    ensureAutoLockEnabled(workbenchConfig),
    timeOperationAsync("folding-setup", async () => await setupFoldingOnOpen())
  ];
  
  // Register the WebView panel serializer
  if (vscode.window.registerWebviewPanelSerializer) {
    timeOperation("webview-serializer-register", () => {
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
    });
  }
  
  // Create providers
  const assetLineagePanel = timeOperation("lineage-panel-create", () => new AssetLineagePanel(context.extensionUri));
  const queryPreviewWebviewProvider = timeOperation("query-preview-create", () => new QueryPreviewPanel(context.extensionUri, context));
  
  // Register providers
  timeOperation("register-providers", () => {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(AssetLineagePanel.viewId, assetLineagePanel),
      window.registerWebviewViewProvider(QueryPreviewPanel.viewId, queryPreviewWebviewProvider)
    );
  });

  // Register folding provider once for multiple languages
  const foldingDisposable = timeOperation("register-folding-provider", () => {
    return languages.registerFoldingRangeProvider(
      SUPPORTED_LANGUAGES, 
      { provideFoldingRanges: bruinFoldingRangeProvider }
    );
  });
  context.subscriptions.push(foldingDisposable);
  
  // Set up configuration changes subscription
  timeOperation("config-subscribe", () => subscribeToConfigurationChanges());
  
  // Initialize state for commands
  const defaultFoldingState = bruinConfig.get("bruin.FoldingState", "folded");
  let toggled = defaultFoldingState === "folded";

  // Register commands
  const commandDisposables = timeOperation("register-commands", () => [
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
    })
  ]);
  
  // Add all command disposables to context
  context.subscriptions.push(...commandDisposables);

  // Wait for setup promises to complete
  console.time("setup-promises");
  await Promise.all([pathSeparatorPromise, ...setupPromises]);
  console.timeEnd("setup-promises");
  
  const activationTime = Date.now() - startTime;
  console.debug(`Bruin activated successfully in ${activationTime}ms`);
  console.timeEnd("Bruin Activation Total");
  
  // Print performance summary
  console.log("=== PERFORMANCE METRICS ===");
  console.log(`Total activation time: ${activationTime}ms`);
  Object.entries(perfMetrics).forEach(([operation, time]) => {
    console.log(`${operation}: ${time}ms (${Math.round(time/activationTime*100)}%)`);
  });
  
  // Return metrics for testing
  return { activationTime, metrics: perfMetrics };
}