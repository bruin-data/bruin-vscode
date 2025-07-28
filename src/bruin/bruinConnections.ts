import { BruinCommandOptions } from "../types";
import { BruinCommand } from "./bruinCommand";
import { BruinPanel } from "../panels/BruinPanel";
import { extractNonNullConnections } from "../utilities/helperUtils";

/**
 * Extends the BruinCommand class to implement the Bruin 'connections list' command.
 */
export class BruinConnections extends BruinCommand {
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'connections list -o json' command string.
   */
  protected bruinCommand(): string {
    return "connections";
  }

  /**
   * Return the connections List.
   * Communicates the results of the execution or errors back to the BruinPanel.
   *
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<void>} A promise that resolves when the execution is complete or an error is caught.
   */
  public async getConnections({
    flags = ["list", "-o", "json"],
    ignoresErrors = false,
    environment,
  }: BruinCommandOptions & { environment?: string } = {}): Promise<void> {
    // Add environment flag if provided
    const commandFlags = environment 
      ? ["list", "-env", environment, "-o", "json"]
      : flags;

    await this.run([...commandFlags], { ignoresErrors })
      .then(
        (result) => {
          const connections = JSON.parse(result);
          this.postMessageToPanels("success", connections);
          return connections;
        },
        (error) => {
          console.error("Error occurred while getting connections:", error); // Debug message
          // Check if the error is related to an outdated or missing CLI
          if (error.includes("No help topic for")) {
            const cliError =
              "The Bruin CLI is out of date. Please update it to access your connections.";
            //   console.error("CLI error message:", cliError); // Debug message
            this.postMessageToPanels("error", cliError);
          } else {
            this.postMessageToPanels("error", error);
          }
        }
      )
      .catch((err) => {
        console.error("Connections list command error", err);
      });
  }

  /**
   * Helper function to post messages to the panel with a specific status and message.
   *
   * @param {string} status - Status of the message ('success' or 'error').
   * @param {string | any} message - The message content to send to the panel.
   */
  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("connections-list-message", { status, message });
  }

  /**
   * Get connections specifically for the Activity Bar provider.
   * Returns the connections directly without posting to panels.
   *
   * @param {BruinCommandOptions} [options={}] - Optional parameters for execution, including flags and errors.
   * @returns {Promise<Connection[]>} A promise that resolves with the connections array.
   */
  public async getConnectionsForActivityBar({
    flags = ["list", "-o", "json"],
    ignoresErrors = false,
    environment,
  }: BruinCommandOptions & { environment?: string } = {}): Promise<any[]> {
    try {
      // Add environment flag if provided
      const commandFlags = environment 
        ? ["list", "-env", environment, "-o", "json"]
        : flags;
        
      const result = await this.run([...commandFlags], { ignoresErrors });
      const connections = extractNonNullConnections(JSON.parse(result));
      return connections;
    } catch (error) {
      console.error("Error occurred while getting connections for activity bar:", error);
      throw error;
    }
  }
}

/**
 * Extends the BruinCommand class to implement the Bruin 'connections delete' command.
 */
export class BruinDeleteConnection extends BruinCommand {
  bruinWorkspace: string = "";
  /**
   * Specifies the Bruin command string.
   *
   * @returns {string} Returns the 'connections delete' command string.
   */
  protected bruinCommand(): string {
    return "connections";
  }
  // bruin connections delete --env staging --name MY_SECRET       # Delete a connection
  public async deleteConnection(
    env: string,
    connectionName: string,
    {
      flags = ["delete", "--env", env, "--name", connectionName],
      ignoresErrors = false,
    }: BruinCommandOptions = {}
  ): Promise<void> {
    console.log(
      `Attempting to delete connection "${connectionName}" in environment "${env}" with flags:`,
      flags
    ); // Debug message
    await this.run([...flags], { ignoresErrors })
      .then(
        () => {
          // Refresh the connections list
          console.log(`Successfully deleted connection "${connectionName}".`); // Debug message
          this.postMessageToPanels(
            "success",
            `Connection "${connectionName}" deleted successfully.`
          );
        },
        (error) => {
          console.error("Error occurred while deleting connection:", error); // Debug message
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.error("Connections delete command error", err);
      });
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("connections-list-after-delete", { status, message });
  }
}
export class BruinTestConnection extends BruinCommand {
  bruinWorkspace: string = "";

  protected bruinCommand(): string {
    return "connections";
  }
  public isLoading: boolean = false;

  public async testConnection(
    env: string,
    connectionName: string,
    connectionType: string,
    { ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    this.isLoading = true;
    const flags = [
      "test",
      "--env",
      env,
      "--type",
      connectionType,
      "--name",
      connectionName,
      "-o",
      "json",
    ];
    console.log("Testing connection with flags:", flags); // Debug message
    BruinPanel.postMessage("connection-tested-message", {
      status: "loading",
      message: "Testing connection...",
    });
    try {
      await this.run(flags, { ignoresErrors })
        .then(
          (result) => {
            if(result.includes("support")){
              this.postMessageToPanels("unsupported", result);
              return;
            }
            console.log(`Successfully tested connection "${connectionName}".`); // Debug message
            
            this.postMessageToPanels(
              "success",
              `Connection "${connectionName}" tested successfully.`
            );
          },
          (error) => {
            console.error("Error occurred while testing connection:", error); // Debug message
            this.postMessageToPanels("error", error);
          }
        )
        .catch((err) => {
          console.error("Connections test command error", err);
        });
    } finally {
      this.isLoading = false;
    }
  }

  private postMessageToPanels(status: string, message: any) {
    BruinPanel.postMessage("connection-tested-message", { status, message });
  }
}

export class BruinCreateConnection extends BruinCommand {
  bruinWorkspace: string = "";

  protected bruinCommand(): string {
    return "connections";
  }

  public async createConnection(
    env: string,
    connectionName: string,
    connectionType: string,
    credentials: any,
    { ignoresErrors = false }: BruinCommandOptions = {}
  ): Promise<void> {
    const credentialsString = JSON.stringify(credentials);
    const flags = [
      "add",
      "--env",
      env,
      "--type",
      connectionType,
      "--name",
      connectionName,
      "--credentials",
      credentialsString,
      "-o",
      "json",
    ];
    console.log("Creating connection with flags:", flags); // Debug message

    await this.run(flags, { ignoresErrors })
      .then(
        (result) => {
          if (!result) {
            const connection = {
              name: connectionName,
              type: connectionType,
              environment: env,
              credentials: credentials,
            };
            console.log("Connection created successfully:", connection);
            this.postMessageToPanels("success", connection);
          } else {
            this.postMessageToPanels("error", JSON.parse(result).error);
          }
        },
        (error) => {
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.error("Connections create command error", err);
      });
  }

  private postMessageToPanels(status: string, message: any) {
    BruinPanel.postMessage("connection-created-message", { status, message });
  }
}

export class BruinGetAllBruinConnections extends BruinCommand {
  protected bruinCommand(): string {
    return "internal";
  }

  public async getConnectionsListFromSchema({
    flags = ["connections"],
    ignoresErrors = false,
  }: BruinCommandOptions = {}): Promise<void> {
    await this.run([...flags], { ignoresErrors })
      .then(
        (result) => {
          const connections = JSON.parse(result);
          this.postMessageToPanels("success", connections);
          return connections;
        },
        (error) => {
          this.postMessageToPanels("error", error);
        }
      )
      .catch((err) => {
        console.error("Internal Connections command error", err);
      });
  }

  private postMessageToPanels(status: string, message: string | any) {
    BruinPanel.postMessage("connections-schema-message", { status, message });
  }
}
