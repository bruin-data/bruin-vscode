import { defineStore } from 'pinia';

export const useConnectionsStore = defineStore('connections', {
  state: () => ({
    connections: [] as any[],
    error: null,
  }),
  actions: {
    updateConnectionsFromMessage(data) {
      this.connections = data;
      this.error = null;
    },
    updateErrorFromMessage(data) {
      this.error = data;
      this.connections = [];
    },
    addConnection(connection: any) {
      this.connections.push(connection);
    }

  },
});