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
import { renderCommand } from "./commands/renderCommand";
import { AssetLineagePanel } from "../panels/LineagePanel";
import { installOrUpdateCli } from "./commands/updateBruinCLI";
import { QueryPreviewPanel } from "../panels/QueryPreviewPanel";
import { BruinPanel } from "../panels/BruinPanel";

// Analytics initialization is deferred to a separate function




/**
 * Update path separator based on platform 
 * Optimized to avoid unnecessary updates
 */

export async function activate(context: ExtensionContext) {
  
  // Use a single configuration instance for better performance  
  // Defer tracking to not block activation


  // Update path separator based on platform

  // Setup configurations asynchronously

  // Register the WebView panel serializer
  if (vscode.window.registerWebviewPanelSerializer) {
      context.subscriptions.push(
        vscode.window.registerWebviewPanelSerializer(BruinPanel.viewId, {
          async deserializeWebviewPanel(webviewPanel, state) {
            try {
              BruinPanel.currentPanel = BruinPanel.restore(webviewPanel, context.extensionUri);
            } catch (error) {
              console.error("Failed to restore Bruin panel:", error);
            }
          }
        })
      );
  }
  
  // Create providers
  const assetLineagePanel = new AssetLineagePanel(context.extensionUri);
  const queryPreviewWebviewProvider = new QueryPreviewPanel(context.extensionUri, context);
  
  // Register providers
  context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(AssetLineagePanel.viewId, assetLineagePanel),
      window.registerWebviewViewProvider(QueryPreviewPanel.viewId, queryPreviewWebviewProvider)
    );

  // Register folding provider once for multiple languages

  

  const commandDisposables = [
    commands.registerCommand("bruin.renderSQL", async () => {
      try {
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
        console.time("install-cli-command");
        await installOrUpdateCli();
        console.timeEnd("install-cli-command");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error installing/updating Bruin CLI: ${errorMessage}`);
      }
    }),
    
  ];
  
  // Add all command disposables to context
  context.subscriptions.push(...commandDisposables);

  
    
  console.debug(`Bruin activated successfully`);  
}