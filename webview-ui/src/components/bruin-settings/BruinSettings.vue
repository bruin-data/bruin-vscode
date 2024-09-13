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

    <div v-if="showForm" class="mt-6 bg-editorWidget-bg shadow sm:rounded-lg p-6" ref="formRef">
      <ConnectionForm
        :connection="connectionToEdit"
        :environments="environments"
        @submit="createConnection"
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
import { v4 as uuidv4 } from "uuid";

const props = defineProps({
  isBruinInstalled: Boolean,
  environments: Array,
});

const showForm = ref(false);
const connectionToEdit = ref(null);
const showDeleteAlert = ref(false);
const connectionToDelete = ref(null);
const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);
const error = computed(() => connectionsStore.error);
const formRef = ref(null);

onMounted(() => {
  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.command === "connections-list-message") {
      if (message.payload.status === "success") {
        const connectionsWithIds = message.payload.message.map((conn) => {
          if (!conn.id) {
            return { ...conn, id: uuidv4() };
          }
          return conn;
        });
        connectionsStore.updateConnectionsFromMessage(connectionsWithIds);
      } else {
        connectionsStore.updateErrorFromMessage(message.payload.message);
      }
    }

    if (message.command === "connection-deleted-message") {
      if (message.payload.status === "success") {
        // Connection already removed from local state, no need to update
        console.log("Connection deleted successfully");
      } else {
        console.error("Failed to delete connection:", message.payload.message);
        // Optionally, refresh the connections list if the local state is out of sync
        vscode.postMessage({ command: "bruin.getConnectionsList" });
      }
    }
  });

  vscode.postMessage({ command: "bruin.getConnectionsList" });
});

const showConnectionForm = (connection = null) => {
  connectionToEdit.value = connection || { name: "", type: "", environment: "" };
  showForm.value = true;
  setTimeout(() => {
    if (formRef.value) {
      formRef.value.scrollIntoView({ behavior: "smooth" });
    }
  }, 100);
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
    // Remove the deleted connection from the local state
    connectionsStore.removeConnection(connectionToDelete.value);

    showDeleteAlert.value = false;
    connectionToDelete.value = null;
  } catch (error) {
    console.error("Error deleting connection:", error);
  }
};
const closeForm = () => {
  showForm.value = false;
  connectionToEdit.value = null;
};

const createConnection = async (connection) => {
  try {
    // Create the new connection
    const newConnection = {
      id: uuidv4(),
      name: connection.name,
      type: connection.type,
      environment: connection.environment,
      credentials: connection.credentials,
    };
    await vscode.postMessage({
      command: "bruin.createConnection",
      payload: newConnection,
    });

    // Wait for the creation to complete before updating the UI
    // Close the form after successful creation

    await new Promise((resolve) => {
      const messageListener = (event) => {
        const message = event.data;
        if (message.command === "connection-created-message") {
          window.removeEventListener("message", messageListener);
          // Add the new connection to the local state
          connectionsStore.addConnection(newConnection);

          closeForm();
        } else {
          console.error("Failed to create connection:", message.payload.message);
        }
        resolve();
      };
      window.addEventListener("message", messageListener);
    });
  } catch (error) {
    console.error("Error creating connection:", error);
  }
};
const cancelDeleteConnection = () => {
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};
</script>
