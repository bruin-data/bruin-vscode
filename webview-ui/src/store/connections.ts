import { defineStore } from "pinia";
import { v4 as uuidv4 } from "uuid";

export const useConnectionsStore = defineStore("connections", {
  state: () => ({
    connections: [] as any[],
    error: null,
  }),
  actions: {
    updateConnectionsFromMessage(connections) {
      this.connections = connections.map((conn) => {
        if (!conn.id) {
          return { ...conn, id: uuidv4() };
        }
        return conn;
      });
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
  },
});
