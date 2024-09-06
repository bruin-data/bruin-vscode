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

    if (message.command === "connections-list-after-delete") {
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
  console.log("Connection to delete:", connection);
  showDeleteAlert.value = true;
};

const deleteConnection = async () => {
  try {
    await vscode.postMessage({
      command: "bruin.deleteConnection",
      payload: {
        name: connectionToDelete.value.name,
        environment: connectionToDelete.value.environment,
      },
    });

    // Wait for the deletion to complete before updating the UI
    await new Promise((resolve) => {
      const messageListener = (event) => {
        const message = event.data;
        if (message.command === "connections-list-after-delete") {
          window.removeEventListener("message", messageListener);
          if (message.payload.status === "success") {
            connectionsStore.updateConnectionsFromMessage(message.payload.message);
          } else {
            connectionsStore.updateErrorFromMessage(message.payload.message);
          }
          resolve();
        }
      };
      window.addEventListener("message", messageListener);
    });

    showDeleteAlert.value = false;
    connectionToDelete.value = null;
  } catch (error) {
    console.error("Error deleting connection:", error);
  }
};

const cancelDeleteConnection = () => {
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};
</script>
