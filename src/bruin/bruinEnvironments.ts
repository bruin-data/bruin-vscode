import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

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
   * Create a new environment with a dummy connection.
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
      const environmentData = {
        name: environmentName,
        connections: [{
          type: 'dummy',
          name: 'example'
        }]
      };

      // Update the .bruin.yml file
      await this.updateBruinYmlFile(environmentName, environmentData);

      this.postMessageToPanels("success", {
        message: `Environment "${environmentName}" created successfully`,
        environment: environmentData
      });
    } catch (error) {
      console.error("Error creating environment:", error);
      this.postMessageToPanels("error", `Failed to create environment: ${error}`);
    }
  }

  /**
   * Update the .bruin.yml file with the new environment
   */
  private async updateBruinYmlFile(environmentName: string, environmentData: any): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("No workspace folder found");
      }

      const bruinYmlPath = path.join(workspaceFolder.uri.fsPath, ".bruin.yml");
      
      let existingConfig: any = {};
      
      // Read existing .bruin.yml file if it exists
      if (fs.existsSync(bruinYmlPath)) {
        const yamlContent = fs.readFileSync(bruinYmlPath, 'utf8');
        // Basic YAML parsing - in production, you'd want to use a proper YAML parser
        try {
          existingConfig = this.parseSimpleYaml(yamlContent);
        } catch (parseError) {
          console.warn("Could not parse existing .bruin.yml, creating new structure");
        }
      }

      // Ensure environments object exists
      if (!existingConfig.environments) {
        existingConfig.environments = {};
      }

      // Add the new environment
      existingConfig.environments[environmentName] = {
        connections: [{
          type: 'dummy',
          name: 'example'
        }]
      };

      // Convert back to YAML format
      const yamlContent = this.stringifyToYaml(existingConfig);
      
      // Write the updated content
      fs.writeFileSync(bruinYmlPath, yamlContent, 'utf8');
      
    } catch (error) {
      console.error("Error updating .bruin.yml file:", error);
      throw error;
    }
  }

  /**
   * Simple YAML parser for basic structure (in production, use a proper YAML library)
   */
  private parseSimpleYaml(content: string): any {
    const lines = content.split('\n');
    const result: any = {};
    let currentKey = '';
    let currentObject: any = result;
    let indentLevel = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      const indent = line.length - line.trimStart().length;
      
      if (trimmedLine.includes(':')) {
        const [key, value] = trimmedLine.split(':', 2);
        const cleanKey = key.trim();
        const cleanValue = value?.trim();

        if (cleanValue) {
          currentObject[cleanKey] = cleanValue;
        } else {
          currentObject[cleanKey] = {};
          currentKey = cleanKey;
        }
      }
    }

    return result;
  }

  /**
   * Simple YAML stringifier (in production, use a proper YAML library)
   */
  private stringifyToYaml(obj: any, indent: number = 0): string {
    let result = '';
    const spaces = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        result += this.stringifyToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        result += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            result += `${spaces}  -\n`;
            result += this.stringifyToYaml(item, indent + 2);
          } else {
            result += `${spaces}  - ${item}\n`;
          }
        }
      } else {
        result += `${spaces}${key}: ${value}\n`;
      }
    }

    return result;
  }

  /**
   * Helper function to post messages to the panel
   */
  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("environment-created-message", { status, message });
  }
} 