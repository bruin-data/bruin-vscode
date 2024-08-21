import { defineStore } from 'pinia';

export const useConnectionsStore = defineStore('connections', {
  state: () => ({
    connections: [
      { name: 'bruin-health-check-bq', type: 'google_cloud_platform' },
      { name: 'bruin-health-check-sf', type: 'snowflake' },
    ],
  }),
  actions: {
    saveConnection(connection) {
  this.connections.push({ id: this.connections.length + 1, ...connection });
},
updateConnection(index, connection) {
  this.connections[index] = { ...this.connections[index], ...connection };
},
deleteConnection(connection) {
  this.connections = this.connections.filter((c) => c.name !== connection.name);
},
  },
})
