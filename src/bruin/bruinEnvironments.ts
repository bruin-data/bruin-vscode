import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

/**
 * Extends the BruinCommand class to implement environment management commands.
 */
export class BruinEnvironmentManager extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   */
  protected bruinCommand(): string {
    return "environments";
  }

  /**
   * Create a new environment with a duckdb connection.
   * 
   * @param environmentName - The name of the environment to create
   * @param options - Optional parameters for execution
   */
  public async createEnvironment(
    environmentName: string,
    { ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    try {
      // Create the environment structure
      const environmentConnections = {
        duckdb: [
          {
            name: "duckdb-default",
            path: "duckdb.db",
          },
        ],
      };

      const environmentData = {
        name: environmentName,
        connections: environmentConnections,
      };

      // Update the .bruin.yml file
      await this.updateBruinYmlFile(environmentName, environmentConnections);

      this.postMessageToPanels("success", {
        message: `Environment "${environmentName}" created successfully`,
        environment: environmentData,
      });
    } catch (error) {
      console.error("Error creating environment:", error);
      this.postMessageToPanels("error", `Failed to create environment: ${error}`);
    }
  }

  /**
   * Update the .bruin.yml file with the new environment
   */
  private async updateBruinYmlFile(
    environmentName: string,
    connections: any
  ): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("No workspace folder found");
      }

      const bruinYmlPath = path.join(workspaceFolder.uri.fsPath, ".bruin.yml");

      let existingConfig: any = {};

      // Read existing .bruin.yml file if it exists
      if (fs.existsSync(bruinYmlPath)) {
        const yamlContent = fs.readFileSync(bruinYmlPath, "utf8");
        try {
          existingConfig = yaml.load(yamlContent) || {};
        } catch (parseError) {
          console.warn(
            "Could not parse existing .bruin.yml, creating new structure"
          );
          existingConfig = {};
        }
      }

      // Ensure environments object exists
      if (!existingConfig.environments) {
        existingConfig.environments = {};
      }

      // Add the new environment
      existingConfig.environments[environmentName] = {
        connections: connections,
      };

      // Convert back to YAML format with proper formatting
      const yamlContent = yaml.dump(existingConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });

      // Write the updated content
      fs.writeFileSync(bruinYmlPath, yamlContent, "utf8");
    } catch (error) {
      console.error("Error updating .bruin.yml file:", error);
      throw error;
    }
  }

  /**
   * Helper function to post messages to the panel
   */
  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("environment-created-message", { status, message });
  }
} 