<template>
  <div class="flex flex-col space-y-6">
    <!-- Bruin CLI Section -->
    <div>
      <BruinCLI />
    </div>

    <!-- Connections Section -->
    <div class="bg-editorWidget-bg shadow sm:rounded-lg">
      <ConnectionsList
        v-if="isBruinInstalled"
        :connections="connections"
        @new-connection="showConnectionForm"
        @edit-connection="showConnectionForm"
        @delete-connection="confirmDeleteConnection"
        :error="error"
      />
    </div>

    <div v-if="showForm" class="mt-6 bg-editorWidget-bg shadow sm:rounded-lg p-6">
      <ConnectionForm
        :connection="connectionToEdit"
        @submit="saveConnection"
        @cancel="cancelConnectionForm"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteAlert
      v-if="showDeleteAlert"
      :elementName="connectionToDelete?.name"
      elementType="connection"
      @confirm="deleteConnection"
      @cancel="cancelDeleteConnection"
    />
  </div>
</template>

<script setup>
import BruinCLI from "@/components/bruin-settings/BruinCLI.vue";
import ConnectionsList from "@/components/connections/ConnectionList.vue";
import ConnectionForm from "@/components/connections/ConnectionsForm.vue";
import { ref, defineProps, onMounted, computed } from "vue";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";
import { useConnectionsStore } from "@/store/connections";
import { vscode } from "@/utilities/vscode";

const props = defineProps({
  isBruinInstalled: Boolean,
});

const showForm = ref(false);
const connectionToEdit = ref(null);
const showDeleteAlert = ref(false);
const connectionToDelete = ref(null);
const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);
const error = computed(() => connectionsStore.error);

onMounted(() => {
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.command === "connections-list-message") {
      if (message.payload.status === "success") {
        connectionsStore.updateConnectionsFromMessage(message.payload.message);
      } else {
        connectionsStore.updateErrorFromMessage(message.payload.message);
      }
    }
  });

  vscode.postMessage({ command: "bruin.getConnectionsList" });
});


const showConnectionForm = (connection = null) => {
  connectionToEdit.value = connection || { name: "", type: "" };
  showForm.value = true;
};

const saveConnection = (connection) => {
  // Update the connections in the store
  const existingIndex = connections.value.findIndex((c) => c.name === connectionToEdit.value.name);
  if (existingIndex === -1) {
    connections.value.push(connection);
  } else {
    connections.value[existingIndex] = connection;
  }

  showForm.value = false;
  connectionToEdit.value = null;
};

const cancelConnectionForm = () => {
  showForm.value = false;
  connectionToEdit.value = null;
};

const confirmDeleteConnection = (connection) => {
  connectionToDelete.value = connection;
  showDeleteAlert.value = true;
};

const deleteConnection = () => {
  const updatedConnections = connections.value.filter(
    (c) => c.name !== connectionToDelete.value.name
  );
  // Update the local state
  connections.value = updatedConnections;
  // Update the Pinia store
  connectionsStore.updateConnectionsFromMessage(updatedConnections);
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};

const cancelDeleteConnection = () => {
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};
</script>
