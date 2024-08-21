import { defineStore } from 'pinia';

export const useConnectionsStore = defineStore('connections', {
  state: () => ({
    connections: [
      { name: 'bruin-health-check-bq', type: 'google_cloud_platform' },
      { name: 'bruin-health-check-sf', type: 'snowflake' },
      { name: 'client', type: 'ms_teams' },
    ],
  }),
  actions: {
    saveConnection(connection) {
      const existingIndex = this.connections.findIndex((c) => c.name === connection.name);
      if (existingIndex === -1) {
        this.connections.push(connection);
      } else {
        this.connections[existingIndex] = connection;
      }
    },
    deleteConnection(connection) {
      this.connections = this.connections.filter((c) => c.name !== connection.name);
    },
  },
})
