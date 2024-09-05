import { error } from 'console';
import { defineStore } from 'pinia';

export const useConnectionsStore = defineStore('connections', {
  state: () => ({
    connections: [],
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
  },
});