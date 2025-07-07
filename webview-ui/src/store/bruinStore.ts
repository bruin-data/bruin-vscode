import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";

export const useConnectionsStore = defineStore("connections", {
  state: () => ({
    connections: [] as any[],
    error: null,
    connectionsSchema: null,
    defaultEnvironment: null,
    environments: [] as string[],
  }),
  actions: {
    updateConnectionsSchema(connectionsSchema) {
      this.connectionsSchema = connectionsSchema;
    },
    updateConnectionsFromMessage(connections) {
      this.connections = connections.map((conn) => {
        if (!conn.id) {
          return { ...conn, id: uuidv4() };
        }
        return conn;
      });
    },
    addDuplicatedConnection(connection) {
      const duplicatedConnection = { ...connection, id: uuidv4(), name: `${connection.name} (Copy)` };
      this.addConnection(duplicatedConnection); 
    },    
    updateConnection(updatedConnection) {
      const index = this.connections.findIndex(conn => conn.id === updatedConnection.id);
      if (index !== -1) {
        this.connections[index] = updatedConnection;
      }
    },
    updateErrorFromMessage(data) {
      this.error = data;
      this.connections = [];
    },
    addConnection(connection) {
      if (!connection.id) {
        connection.id = uuidv4();
      }
      this.connections.push(connection);
    },
    removeConnection(connectionId) {
      this.connections = this.connections.filter((conn) => conn.id !== connectionId);
    },
    getConnectionById(id) {
      return this.connections.find((conn) => conn.id === id);
    },
    setDefaultEnvironment(environment) {
      this.defaultEnvironment = environment; // Store the default environment
    },

    getDefaultEnvironment() {
      return this.defaultEnvironment; // Return the stored default environment
    },

    updateEnvironments(environmentsList: string[]) {
      this.environments = environmentsList;
    },

    addEnvironment(environmentName: string) {
      if (!this.environments.includes(environmentName)) {
        this.environments.push(environmentName);
      }
    },

  },
});
