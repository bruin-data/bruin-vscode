<template>
  <div class="flex flex-col space-y-6">
    <div>
      <BruinCLI />
    </div>

    <div class="bg-editorWidget-bg shadow sm:rounded-lg">
      <ConnectionsList
        v-if="isBruinInstalled"
        :connections="connections"
        @new-connection="showConnectionForm"
        @edit-connection="showConnectionForm"
        @delete-connection="confirmDeleteConnection"
        @duplicate-connection="handleDuplicateConnection"
        :error="error"
      />
    </div>

    <div v-if="showForm" class="mt-6 bg-editorWidget-bg shadow sm:rounded-lg p-6" ref="formRef">
      <ConnectionForm
        :connection="connectionToEdit"
        :isEditing="isEditing"
        :environments="environments"
        @submit="handleConnectionSubmit"
        @cancel="closeConnectionForm"
        :error="formError"
      />
    </div>

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
import { ref, computed, onMounted } from "vue";
import BruinCLI from "@/components/bruin-settings/BruinCLI.vue";
import ConnectionsList from "@/components/connections/ConnectionList.vue";
import ConnectionForm from "@/components/connections/ConnectionsForm.vue";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";
import { useConnectionsStore } from "@/store/bruinStore";
import { vscode } from "@/utilities/vscode";
import { v4 as uuidv4 } from "uuid";

const props = defineProps({
  isBruinInstalled: Boolean,
  environments: Array,
});

const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);
const error = computed(() => connectionsStore.error);

const showForm = ref(false);
const connectionToEdit = ref(null);
const isEditing = ref(false);
const showDeleteAlert = ref(false);
const connectionToDelete = ref(null);
const formError = ref(null);
const formRef = ref(null);

onMounted(() => {
  window.addEventListener("message", handleMessage);
  vscode.postMessage({ command: "bruin.getConnectionsList" });
  vscode.postMessage({ command: "bruin.getConnectionsSchema" });
});

const handleMessage = (event) => {
  const message = event.data;
  switch (message.command) {
    case "connections-list-message":
      handleConnectionsList(message.payload);
      break;
    case "connection-deleted-message":
      handleConnectionDeleted(message.payload);
      break;
    case "connection-created-message":
      handleConnectionCreated(message.payload);
      break;
    case "connection-edited-message":
      handleConnectionEdited(message.payload);
      break;
    case "connections-schema-message":
      getConnectionsListFromSchema(message.payload);
      break;
  }
};

const getConnectionsListFromSchema = (payload) => {
  console.log("Received connections schema payload:", payload); 
  connectionsStore.updateConnectionsSchema(payload.message);
  console.log("Connections schema:", connectionsStore.connectionsSchema);
};

const handleConnectionsList = (payload) => {
  console.log("Received connections list payload:", payload); // Log payload for debugging
  if (payload.status === "success") {
    const connectionsWithIds = payload.message.map((conn) => ({
      ...conn,
      id: conn.id || uuidv4(),
    }));
    connectionsStore.updateConnectionsFromMessage(connectionsWithIds);
  } else {
    connectionsStore.updateErrorFromMessage(payload.message);
  }
};

const handleConnectionDeleted = async (payload) => {
  if (payload.status === "success") {
    connectionsStore.removeConnection(connectionToDelete.value.id);
    showDeleteAlert.value = false;
    connectionToDelete.value = null;

    // Fetch updated connections list from the backend
    await vscode.postMessage({ command: "bruin.getConnectionsList" });
  } else {
    console.error("Failed to delete connection:", payload.message);
  }
};

const handleConnectionCreated = (payload) => {
  if (payload.status === "success") {
    try {
      console.log("Payload received:", payload);
      if (payload.message && typeof payload.message === "object") {
        const newConnection = {
          ...payload.message,
          id: payload.message.id || uuidv4(),
        };
        connectionsStore.addConnection(newConnection);
        closeConnectionForm();
      } else {
        throw new Error("Invalid payload structure");
      }
    } catch (error) {
      console.error("Error adding connection:", error);
      formError.value = { field: "connection_name", message: error.message };
    }
  } else {
    formError.value = { field: "connection_name", message: payload.message };
  }
};
const handleConnectionEdited = (payload) => {
  if (payload.status === "success") {
    connectionsStore.updateConnection(payload.connection);
    closeConnectionForm();
  } else {
    formError.value = { field: "connection_name", message: payload.message };
  }
};

const showConnectionForm = (connection = null, duplicate = false) => {
  if (connection) {
    const duplicatedName = duplicate ? `${connection.name} (Copy)` : connection.name;
    connectionToEdit.value = {
      ...connection,
      name: duplicatedName,
      // Ensure credentials and other fields are preserved
      credentials: { ...connection },
    };

    // Set isEditing to true only if not duplicating
    isEditing.value = !duplicate;
  } else {
    // Default empty connection object if creating a new connection
    connectionToEdit.value = {
      name: "",
      type: "",
      environment: "",
      credentials: {},
    };
    isEditing.value = false;
  }

  // Show the form
  showForm.value = true;

  // Scroll to form
  setTimeout(() => {
    if (formRef.value) {
      formRef.value.scrollIntoView({ behavior: "smooth" });
    }
  }, 100);
};

const handleDuplicateConnection = (connection) => {
  showConnectionForm(connection, true);
};

const handleConnectionSubmit = async (connectionData) => {
  clearFormError();
  try {
    const sanitizedConnectionData = JSON.parse(JSON.stringify(connectionData)); // Ensure no circular refs

    if (isEditing.value) {
      await vscode.postMessage({
        command: "bruin.editConnection",
        payload: {
          oldConnection: JSON.parse(JSON.stringify(connectionToEdit.value)),
          newConnection: sanitizedConnectionData,
        },
      });
    } else {
      await vscode.postMessage({
        command: "bruin.createConnection",
        payload: { ...sanitizedConnectionData, id: uuidv4() },
      });
    }
  } catch (error) {
    console.error("Error submitting connection:", error);
    formError.value = { field: "connection_name", message: error.message };
  }
};

const closeConnectionForm = () => {
  showForm.value = false;
  connectionToEdit.value = null;
  isEditing.value = false;
  clearFormError();
};

const clearFormError = () => {
  formError.value = null;
};

const confirmDeleteConnection = (connection) => {
  connectionToDelete.value = connection;
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
    // Close the delete alert after successful deletion
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
@/store/bruinStore
