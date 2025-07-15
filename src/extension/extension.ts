/* eslint-disable @typescript-eslint/naming-convention */
import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  languages,
  window,
  workspace,
  WorkspaceConfiguration,
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
import { QueryCodeLensProvider } from "../providers/queryCodeLensProvider";
import { ScheduleCodeLensProvider } from "../providers/scheduleCodeLensProvider";
import { QuerySelectionCodeLensProvider } from "../providers/querySelectionCodeLensProvider";
import { ActivityBarConnectionsProvider } from "../providers/ActivityBarConnectionsProvider";
import { FavoritesProvider } from "../providers/FavoritesProvider";
import { TableDetailsPanel } from "../panels/TableDetailsPanel";

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
    if (!client) {
      return;
    }
    client.track({
      event: eventName,
      anonymousId: "anonymous-id",
      properties: {
        platform: os.platform(),
        arch: os.arch(),
        version: vscode.version,
        ...properties,
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
      [viewTypeKey]: true,
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
  console.log("Bruin extension is now active!");

  // Initialize TableDetailsPanel
  TableDetailsPanel.initialize(context.subscriptions);

  // Focus the active editor first to prevent undefined fsPath errors
  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  } else {
    await vscode.commands.executeCommand("workbench.action.focusFirstEditorGroup");
  }

  // Initialize analytics client
  initializeAnalytics();
  trackEvent("Extension Activated");

  const bruinConfig = workspace.getConfiguration("bruin");
  const workbenchConfig = workspace.getConfiguration("workbench.editor");

  setTimeout(() => {
    trackEvent("Extension Activated");
  }, 0);

  const pathSeparatorPromise = updatePathSeparator(bruinConfig);

  const setupPromises = [ensureAutoLockEnabled(workbenchConfig), setupFoldingOnOpen()];

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
        },
      })
    );
  }

  const assetLineagePanel = new AssetLineagePanel(context.extensionUri);
  const queryPreviewWebviewProvider = new QueryPreviewPanel(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AssetLineagePanel.viewId, assetLineagePanel),
    window.registerWebviewViewProvider(QueryPreviewPanel.viewId, queryPreviewWebviewProvider)
  );

  const foldingDisposable = languages.registerFoldingRangeProvider(SUPPORTED_LANGUAGES, {
    provideFoldingRanges: bruinFoldingRangeProvider,
  });
  context.subscriptions.push(foldingDisposable);

  // Register the query code lens provider
  const codeLensProvider = languages.registerCodeLensProvider(
    { language: "sql" },
    new QueryCodeLensProvider()
  );
  context.subscriptions.push(codeLensProvider);

  // Register the schedule code lens provider for pipeline.yml files
  const scheduleCodeLensProvider = languages.registerCodeLensProvider(
    { pattern: "**/pipeline.{yml,yaml}" },
    new ScheduleCodeLensProvider()
  );
  context.subscriptions.push(scheduleCodeLensProvider);

  // Register the query selection CodeLens provider for SQL files
  const querySelectionCodeLensProvider = languages.registerCodeLensProvider(
    { language: "sql" },
    new QuerySelectionCodeLensProvider()
  );
  context.subscriptions.push(querySelectionCodeLensProvider);

  // Register for BigQuery SQL
  const querySelectionCodeLensProviderBigQuery = languages.registerCodeLensProvider(
    { language: "sql-bigquery" },
    new QuerySelectionCodeLensProvider()
  );
  context.subscriptions.push(querySelectionCodeLensProviderBigQuery);

  // Register for Snowflake SQL
  const querySelectionCodeLensProviderSnowflake = languages.registerCodeLensProvider(
    { language: "snowflake-sql" },
    new QuerySelectionCodeLensProvider()
  );
  context.subscriptions.push(querySelectionCodeLensProviderSnowflake);

  subscribeToConfigurationChanges();

  const activityBarConnectionsProvider = new ActivityBarConnectionsProvider(context.extensionPath);
  vscode.window.registerTreeDataProvider("bruinConnections", activityBarConnectionsProvider);

  const favoritesProvider = new FavoritesProvider();
  vscode.window.registerTreeDataProvider("bruinFavorites", favoritesProvider);

  const defaultFoldingState = bruinConfig.get("bruin.FoldingState", "folded");
  let toggled = defaultFoldingState === "folded";

  // Register commands
  const commandDisposables = [
    commands.registerCommand("bruin.refreshConnections", () => {
      try {
        trackEvent("Command Executed", { command: "refreshConnections" });
        activityBarConnectionsProvider.refresh();
        //vscode.window.showInformationMessage("Connections refreshed successfully!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error refreshing connections: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.refreshConnection", (item: any) => {
      try {
        trackEvent("Command Executed", { command: "refreshConnection" });
        if (item && item.itemData && item.itemData.name) {
          // Pass environment information if available
          const environment = item.itemData.environment;
          activityBarConnectionsProvider.refreshConnection(item.itemData.name, environment);
          const envText = environment ? ` (${environment})` : '';
          vscode.window.showInformationMessage(`Connection ${item.itemData.name}${envText} refreshed.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error refreshing connection: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.refreshSchema", (item: any) => {
      try {
        trackEvent("Command Executed", { command: "refreshSchema" });
        if (item && item.itemData) {
          activityBarConnectionsProvider.refreshSchema(item.itemData);
          vscode.window.showInformationMessage(`Schema ${item.itemData.name} refreshed.`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error refreshing schema: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.showConnectionDetails", (connection: any) => {
      try {
        trackEvent("Command Executed", { command: "showConnectionDetails" });
        const details = `Connection: ${connection.name}\nType: ${connection.type}\nStatus: ${connection.status}`;
        if (connection.host) {
          const hostDetails = `\nHost: ${connection.host}:${connection.port || "default"}`;
          vscode.window.showInformationMessage(details + hostDetails);
        } else {
          vscode.window.showInformationMessage(details);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error showing connection details: ${errorMessage}`);
      }
    }),
    commands.registerCommand(
      "bruin.showTableDetails",
      (tableName: string, schemaName?: string, connectionName?: string, environmentName?: string) => {
        try {
          trackEvent("Command Executed", { command: "showTableDetails" });
          TableDetailsPanel.render(context.extensionUri, tableName, schemaName, connectionName, environmentName);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Error showing table details: ${errorMessage}`);
        }
      }
    ),
    commands.registerCommand("bruin.addSchemaToFavorites", async (item: any) => {
      try {
        trackEvent("Command Executed", { command: "addSchemaToFavorites" });
        if (item && item.itemData && "tables" in item.itemData) {
          await activityBarConnectionsProvider.toggleSchemaFavorite(item.itemData);
          favoritesProvider.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error adding schema to favorites: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.removeSchemaFromFavorites", async (item: any) => {
      try {
        trackEvent("Command Executed", { command: "removeSchemaFromFavorites" });
        if (item && item.itemData && "tables" in item.itemData) {
          await activityBarConnectionsProvider.toggleSchemaFavorite(item.itemData);
          favoritesProvider.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error removing schema from favorites: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.refreshFavorites", () => {
      try {
        trackEvent("Command Executed", { command: "refreshFavorites" });
        favoritesProvider.refresh();
        vscode.window.showInformationMessage("Favorites refreshed successfully!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error refreshing favorites: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.removeFavorite", async (item: any) => {
      try {
        trackEvent("Command Executed", { command: "removeFavorite" });
        if (item && item.itemData && item.contextValue === "favorite_schema") {
          await favoritesProvider.removeFavorite(item.itemData);
          activityBarConnectionsProvider.refresh();
          vscode.window.showInformationMessage("Favorite removed successfully!");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error removing favorite: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.removeTableFavorite", async (item: any) => {
      try {
        trackEvent("Command Executed", { command: "removeTableFavorite" });
        if (
          item &&
          item.itemData &&
          (item.contextValue === "favorite_table" || item.contextValue === "favorite_table_starred")
        ) {
          const tableData = item.itemData as any;
          const tableFavorite = {
            tableName: tableData.name,
            schemaName: tableData.schema,
            connectionName: tableData.connectionName,
            environment: tableData.environment,
          };
          await favoritesProvider.removeTableFavorite(tableFavorite);
          activityBarConnectionsProvider.refresh();
          vscode.window.showInformationMessage("Table favorite removed successfully!");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error removing table favorite: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.addTableToFavorites", async (item: any) => {
      try {
        trackEvent("Command Executed", { command: "addTableToFavorites" });
        if (item && item.itemData && "name" in item.itemData && "schema" in item.itemData) {
          await activityBarConnectionsProvider.toggleTableFavorite(item.itemData, item);
          favoritesProvider.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error adding table to favorites: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.removeTableFromFavorites", async (item: any) => {
      try {
        trackEvent("Command Executed", { command: "removeTableFromFavorites" });
        if (item && item.itemData && "name" in item.itemData && "schema" in item.itemData) {
          await activityBarConnectionsProvider.toggleTableFavorite(item.itemData, item);
          favoritesProvider.refresh();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error removing table from favorites: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.runQuery", async (uri: vscode.Uri, range: vscode.Range, isAsset?: boolean, queryCount?: number, queryText?: string) => {
      try {
        trackEvent("Command Executed", { command: "runQuery" });
        const document = await workspace.openTextDocument(uri);
        const activeTabId = QueryPreviewPanel.getActiveTabId();
        
        // Determine what to send based on asset status and query count
        let queryToSend = "";
        let shouldSendQuery = true;
        
        if (isAsset && queryCount === 1) {
          shouldSendQuery = false;
        } else if (isAsset && queryCount && queryCount > 1 && queryText) {
          queryToSend = queryText;
        } else {
          queryToSend = document.getText(range);
        }
        
        // Store the extracted query for the specific tab
        QueryPreviewPanel.setTabQuery(activeTabId, queryToSend);
        QueryPreviewPanel.setTabAssetPath(activeTabId, uri.fsPath);
        QueryPreviewPanel.setLastExecutedQuery(queryToSend);

        QueryPreviewPanel.postMessage("query-output-message", {
          status: "loading",
          message: true,
          tabId: activeTabId,
        });
        await QueryPreviewPanel.focusSafely();
        
        // Send message to webview to execute query with current limit
        QueryPreviewPanel.postMessage("bruin.executePreviewQuery", { 
          status: "success",
          message: "",
          tabId: activeTabId,
          extractedQuery: shouldSendQuery ? queryToSend : ""
        }); 
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error running query: ${errorMessage}`);
      }
    }),
    commands.registerCommand("bruin.previewSelectedQuery", async (selectedQueryText?: string) => {
      try {
        const editor = window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage("No active editor found");
          return;
        }

        let selectedText = selectedQueryText;
        
        // If no query text provided, get it from the current selection
        if (!selectedText) {
          const selection = editor.selection;
          if (selection.isEmpty) {
            vscode.window.showWarningMessage("Please select a query to preview");
            return;
          }

          selectedText = editor.document.getText(selection).trim();
          if (!selectedText) {
            vscode.window.showWarningMessage("Selected text is empty");
            return;
          }
        }

        // Just run the selected text as a query
        QueryPreviewPanel.setLastExecutedQuery(selectedText);
        const activeTabId = QueryPreviewPanel.getActiveTabId();

        QueryPreviewPanel.postMessage("query-output-message", {
          status: "loading",
          message: true,
          tabId: activeTabId,
        });
        await QueryPreviewPanel.focusSafely();

        QueryPreviewPanel.postMessage("bruin.executePreviewQuery", { 
          status: "success",
          message: "",
          tabId: activeTabId,
          extractedQuery: selectedText
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error previewing query: ${errorMessage}`);
      }
    }),
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
        trackEvent("Command Executed", {
          command: "toggleFoldings",
          state: toggled ? "folded" : "unfolded",
        });
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
    }),
    commands.registerCommand("bruin.toggleTableFavorite", async (item: any) => {
      if (item && item.itemData) {
        await activityBarConnectionsProvider.toggleTableFavorite(item.itemData, item);
      }
    }),
    commands.registerCommand("bruin.toggleTableUnfavorite", async (item: any) => {
      if (item && item.itemData) {
        await activityBarConnectionsProvider.toggleTableFavorite(item.itemData, item);
      }
    }),
  ];

  context.subscriptions.push(...commandDisposables);

  console.time("setup-promises");
  await Promise.all([pathSeparatorPromise, ...setupPromises]);
  console.timeEnd("setup-promises");

  const activationTime = Date.now() - startTime;
  console.debug(`Bruin activated successfully in ${activationTime}ms`);
  console.timeEnd("Bruin Activation Total");

  TableDetailsPanel.initialize(context.subscriptions);
}
