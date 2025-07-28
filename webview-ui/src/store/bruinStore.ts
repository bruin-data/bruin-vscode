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
    updateConnectionsFromMessage(data) {
      // Handle both old format (array) and new format (raw JSON)
      if (Array.isArray(data)) {
        // Old format - array of connections
        this.connections = data.map((conn) => {
          if (!conn.id) {
            return { ...conn, id: uuidv4() };
          }
          return conn;
        });
      } else if (data && data.environments) {
        // New format - raw JSON with environments
        const connections = [];
        
        // Extract environments list
        this.environments = Object.keys(data.environments);
        
        // Set default environment if available
        if (data.default_environment) {
          this.defaultEnvironment = data.default_environment;
        }
        
        // Process each environment
        Object.keys(data.environments).forEach((environmentName) => {
          const environmentConnections = data.environments[environmentName].connections;
          
          // Check if environment has any connections
          const hasConnections = environmentConnections && Object.keys(environmentConnections).length > 0;
          
          if (hasConnections) {
            // Process each connection type
            Object.keys(environmentConnections).forEach((connectionType) => {
              const connection = environmentConnections[connectionType];
              
              if (Array.isArray(connection)) {
                connection.forEach((conn) => {
                  if (conn) {
                    connections.push({
                      id: uuidv4(),
                      environment: environmentName,
                      type: connectionType,
                      ...conn,
                    });
                  }
                });
              } else if (connection !== null) {
                connections.push({
                  id: uuidv4(),
                  environment: environmentName,
                  type: connectionType,
                  ...connection,
                });
              }
            });
          } else {
            // Environment has no connections, add placeholder
            connections.push({
              id: uuidv4(),
              environment: environmentName,
              name: null,
              type: null,
              isEmpty: true,
            });
          }
        });
        
        this.connections = connections;
      } else {
        this.connections = [];
      }
      
      // Clear any previous errors when valid connections data arrives
      this.error = null;
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
