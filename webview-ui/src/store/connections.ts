import { defineStore } from 'pinia';

export const useConnectionsStore = defineStore('connections', {
  state: () => ({
    connections: [],
  }),
  actions: {
    updateConnectionsFromMessage(data) {
      this.connections = data;
    },
  },
});