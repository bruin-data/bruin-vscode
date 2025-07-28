<template>
  <div class="flex flex-col space-y-6">
    <div>
      <BruinCLI :versionStatus="versionStatus" />
    </div>

    <div class="bg-editorWidget-bg shadow sm:rounded-lg">
      <ConnectionsList
        v-if="isBruinInstalled"
        :connections="connections"
        @new-connection="showConnectionForm"
        @edit-connection="showConnectionForm"
        @delete-connection="confirmDeleteConnection"
        @duplicate-connection="handleDuplicateConnection"
        @add-environment="handleAddEnvironment"
        @edit-environment="handleEditEnvironment"
        @delete-environment="handleDeleteEnvironment"
        :error="error"
      />
    </div>

    

    <div v-if="showForm" class="mt-6 bg-editorWidget-bg shadow sm:rounded-lg p-6" ref="formRef">
      <ConnectionForm
        :key="connectionFormKey"
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
      title="Delete Connection"
      :message="`Are you sure you want to delete the connection ${connectionToDelete?.name}? This action cannot be undone.`"
      confirm-text="Delete"
      @confirm="deleteConnection"
      @cancel="cancelDeleteConnection"
    />

    <DeleteAlert
      v-if="showEnvironmentDeleteAlert"
      title="Delete Environment"
      :message="`Are you sure you want to delete environment '${environmentToDelete}'? This action cannot be undone.`"
      confirm-text="Delete"
      @confirm="deleteEnvironment"
      @cancel="cancelDeleteEnvironment"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from "vue";
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
  versionStatus: Object,
});

const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);
const error = computed(() => connectionsStore.error);
const environmentsList = computed(() => props.environments || []);

const showForm = ref(false);
const connectionToEdit = ref(null);
const isEditing = ref(false);
const showDeleteAlert = ref(false);
const connectionToDelete = ref(null);
const formError = ref(null);
const formRef = ref(null);

// Environment states
const showEnvironmentDeleteAlert = ref(false);
const environmentToDelete = ref(null);

const connectionFormKey = computed(() => {
  return connectionToEdit.value?.id ? `edit-${connectionToEdit.value.id}` : "new-connection";
});

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
    case "environment-created-message":
      handleEnvironmentCreated(message.payload);
      break;
    case "environment-updated-message":
      handleEnvironmentUpdated(message.payload);
      break;
    case "environment-deleted-message":
      handleEnvironmentDeleted(message.payload);
      break;
  }
};

const getConnectionsListFromSchema = (payload) => {
  console.log("Received connections schema payload:", payload);
  connectionsStore.updateConnectionsSchema(payload.message);
};

const handleConnectionsList = (payload) => {
  console.log("Received connections list payload:", payload); // Log payload for debugging
  if (payload.status === "success") {
    // Pass the raw message directly to the store - it will handle both formats
    connectionsStore.updateConnectionsFromMessage(payload.message);
  } else {
    connectionsStore.updateErrorFromMessage(payload.message);
    console.log("Error received in settings:", payload.message);
  }
};

const handleConnectionDeleted = async (payload) => {
  if (payload.status === "success") {
    connectionsStore.removeConnection(connectionToDelete.value.id);
    showDeleteAlert.value = false;
    connectionToDelete.value = null;
  } else {
    console.error("Failed to delete connection:", payload.message);
  }
};

const handleConnectionCreated = (payload) => {
  if (payload.status === "success") {
    try {
      console.log("Payload received (created):", payload);
      if (payload.message && typeof payload.message === "object") {
        const newConnection = {
          ...payload.message,
          id: payload.message.id || uuidv4(),
        };
        connectionsStore.addConnection(newConnection);
        closeConnectionForm();
      } else {
        throw new Error("Invalid payload structure for created connection");
      }
    } catch (error) {
      console.error("Error adding connection:", error);
      formError.value = { field: "connection_name", message: error.message };
    }
  } else {
    formError.value = { field: "connection_name", message: errorMessage };
  }
};

const handleConnectionEdited = (payload) => {
  if (payload.status === "success") {
    console.log("Payload received (edited):", payload);
    if (payload.connection && payload.connection.id) {
      connectionsStore.updateConnection(payload.connection);
      closeConnectionForm();
    } else {
      formError.value = { field: "connection_name", message: "Failed to update connection: Missing ID" };
    }
  } else {
    let errorMessage = payload.message;
    try {
        const errorObj = JSON.parse(payload.message);
        if (errorObj.error) errorMessage = errorObj.error;
    } catch (e) {
        // Not a JSON string, use as is
    }
    formError.value = { field: "connection_name", message: errorMessage };
  }
};

const showConnectionForm = (connectionOrEnvironment = null, duplicate = false) => {
  // Reset form state before showing new data
  closeConnectionForm();
  nextTick(() => {
    // Check if it's a connection object (has name, type, etc.) or just an environment string
    const isConnection = connectionOrEnvironment && typeof connectionOrEnvironment === 'object' && connectionOrEnvironment.name;
    
    if (isConnection) {
      const connection = connectionOrEnvironment;
      const duplicatedName = duplicate ? `${connection.name} (Copy)` : connection.name;
      if (connection.type === "google_cloud_platform") {
        connectionToEdit.value = {
          ...connection,
          name: duplicatedName,
          service_account_file: connection.service_account_file || "",
          service_account_json: connection.service_account_json || "",
          credentials: {
            ...connection,
            service_account_file: connection.service_account_file || "",
            service_account_json: connection.service_account_json || "",
          },
        };
      } else {
        connectionToEdit.value = {
          ...connection,
          name: duplicatedName,
          // Ensure credentials and other fields are preserved
          credentials: { ...connection },
        };
      }

      // Set isEditing to true only if not duplicating
      isEditing.value = !duplicate;
    } else {
      // Default empty connection object if creating a new connection
      // If connectionOrEnvironment is a string, it's the environment name
      const environment = typeof connectionOrEnvironment === 'string' ? connectionOrEnvironment : "";
      connectionToEdit.value = {
        id: uuidv4(),
        name: "",
        type: "",
        environment: environment,
        credentials: {},
      };
      isEditing.value = false;
    }

    showForm.value = true;
  });
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
    const sanitizedConnectionData = JSON.parse(JSON.stringify(connectionData));

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
        payload: sanitizedConnectionData,
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
        id: connectionToDelete.value.id,
      },
    });
    showDeleteAlert.value = false;
  } catch (error) {
    console.error("Error deleting connection:", error);
  }
};

const cancelDeleteConnection = () => {
  showDeleteAlert.value = false;
  connectionToDelete.value = null;
};

// Environment handlers
const handleAddEnvironment = async (environmentName) => {
  try {
    await vscode.postMessage({
      command: "bruin.createEnvironment",
      payload: {
        environmentName: environmentName,
      },
    });
  } catch (error) {
    console.error("Error creating environment:", error);
  }
};

const handleEditEnvironment = async (environmentData) => {
  try {
    await vscode.postMessage({
      command: "bruin.updateEnvironment",
      payload: {
        currentName: environmentData.currentName,
        newName: environmentData.newName,
      },
    });
  } catch (error) {
    console.error("Error updating environment:", error);
  }
};

const handleDeleteEnvironment = (environmentName) => {
  environmentToDelete.value = environmentName;
  showEnvironmentDeleteAlert.value = true;
};

const confirmDeleteEnvironment = () => {
  showEnvironmentDeleteAlert.value = true;
};

const deleteEnvironment = async () => {
  try {
    await vscode.postMessage({
      command: "bruin.deleteEnvironment",
      payload: {
        environmentName: environmentToDelete.value,
      },
    });
    showEnvironmentDeleteAlert.value = false;
    environmentToDelete.value = null;
  } catch (error) {
    console.error("Error deleting environment:", error);
  }
};

const cancelDeleteEnvironment = () => {
  showEnvironmentDeleteAlert.value = false;
  environmentToDelete.value = null;
};

const handleEnvironmentCreated = (payload) => {
  if (payload.status === "success") {
    console.log("Environment created successfully:", payload.message);
  } else {
    console.error("Failed to create environment:", payload.message);
  }
};

const handleEnvironmentUpdated = (payload) => {
  if (payload.status === "success") {
    console.log("Environment updated successfully:", payload.message);
  } else {
    console.error("Failed to update environment:", payload.message);
  }
};

const handleEnvironmentDeleted = (payload) => {
  if (payload.status === "success") {
    console.log("Environment deleted successfully:", payload.message);
    showEnvironmentDeleteAlert.value = false;
    environmentToDelete.value = null;
  } else {
    console.error("Failed to delete environment:", payload.message);
  }
};
</script>
