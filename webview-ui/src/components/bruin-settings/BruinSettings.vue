<template>
  <div class="flex flex-col space-y-6">
    <div>
      <BruinCLI :versionStatus="versionStatus" />
    </div>

    <div v-if="isBruinInstalled && !settingsOnlyMode" class="bg-editorWidget-bg shadow sm:rounded-lg">
      <ConnectionsList
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

    <div v-if="isBruinInstalled" class="bg-editorWidget-bg shadow sm:rounded-lg p-4">
      <div class="flex flex-col space-y-3">
        <h3 class="text-base font-medium text-editor-fg">Project Templates</h3>
        <div class="max-w-xl text-sm text-editor-fg">
          <p>
            Create new Bruin projects from pre-built templates. Choose a template that matches your use case and get started quickly with best practices.
          </p>
        </div>
        <div class="flex items-center justify-between">
          <div class="relative w-64">
            <vscode-dropdown 
              v-if="templates.length > 0"
              @change="handleTemplateSelect"
              class="w-full"
              ref="templateDropdownRef"
            >
              <vscode-option value="">Select a template...</vscode-option>
              <vscode-option 
                v-for="template in templates" 
                :key="template" 
                :value="template"
              >
                {{ template }}
              </vscode-option>
            </vscode-dropdown>
            <div v-else-if="templatesLoading" class="text-sm text-editor-fg opacity-70">
              Loading templates...
            </div>
            <div v-else class="text-sm text-editor-fg opacity-70">
              No templates available
            </div>
          </div>
          <vscode-button 
            appearance="primary"
            @click="handleCreateProject"
            :disabled="!selectedTemplate"
          >
            Create
          </vscode-button>
        </div>
        <div v-if="selectedTemplate" class="text-xs text-editor-fg opacity-75">
          Selected: <span class="font-medium">{{ selectedTemplate }}</span>
        </div>
        <div v-if="projectCreationSuccess" class="mt-3 p-3 bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md">
          <div class="text-sm text-green-800 dark:text-green-200 whitespace-pre-line">
            {{ successMessage }}
          </div>
        </div>
      </div>
    </div>


    

    <div v-if="showForm && !settingsOnlyMode" class="mt-6 bg-editorWidget-bg shadow sm:rounded-lg p-6" ref="formRef">
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
      v-if="showDeleteAlert && !settingsOnlyMode"
      title="Delete Connection"
      :message="`Are you sure you want to delete the connection ${connectionToDelete?.name}? This action cannot be undone.`"
      confirm-text="Delete"
      @confirm="deleteConnection"
      @cancel="cancelDeleteConnection"
    />

    <DeleteAlert
      v-if="showEnvironmentDeleteAlert && !settingsOnlyMode"
      title="Delete Environment"
      :message="`Are you sure you want to delete environment '${environmentToDelete}'? This action cannot be undone.`"
      confirm-text="Delete"
      @confirm="deleteEnvironment"
      @cancel="cancelDeleteEnvironment"
    />
  </div>
</template>

<script setup lang="ts">
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
  settingsOnlyMode: {
    type: Boolean,
    default: false
  },
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

// Templates state
const templates = ref([]);
const selectedTemplate = ref("");
const templatesLoading = ref(false);
const projectCreationSuccess = ref(false);
const successMessage = ref("");
const templateDropdownRef = ref(null);

const connectionFormKey = computed(() => {
  return connectionToEdit.value?.id ? `edit-${connectionToEdit.value.id}` : "new-connection";
});

onMounted(() => {
  window.addEventListener("message", handleMessage);
  
  // Only load connections data if not in settings-only mode
  if (!props.settingsOnlyMode) {
    vscode.postMessage({ command: "bruin.getConnectionsList" });
    vscode.postMessage({ command: "bruin.getConnectionsSchema" });
  }
  
  // Load templates if Bruin is installed
  if (props.isBruinInstalled) {
    loadTemplates();
  }
});

const handleMessage = (event: any) => {
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
    case "templates-list-message":
      handleTemplatesList(message.payload);
      break;
    case "project-init-message":
      handleProjectInit(message.payload);
      break;
  }
};

const getConnectionsListFromSchema = (payload: any) => {
  console.log("Received connections schema payload:", payload);
  connectionsStore.updateConnectionsSchema(payload.message);
};

const handleConnectionsList = (payload: any) => {
  console.log("Received connections list payload:", payload); // Log payload for debugging
  if (payload.status === "success") {
    // Pass the raw message directly to the store - it will handle both formats
    connectionsStore.updateConnectionsFromMessage(payload.message);
  } else {
    connectionsStore.updateErrorFromMessage(payload.message);
    console.log("Error received in settings:", payload.message);
  }
};

const handleConnectionDeleted = async (payload: any) => {
  if (payload.status === "success") {
    connectionsStore.removeConnection(connectionToDelete.value.id);
    showDeleteAlert.value = false;
    connectionToDelete.value = null;
  } else {
    console.error("Failed to delete connection:", payload.message);
  }
};

const handleConnectionCreated = (payload: any) => {
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

const handleConnectionEdited = (payload: any) => {
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

const showConnectionForm = (connectionOrEnvironment: any = null, duplicate = false) => {
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

const handleDuplicateConnection = (connection: any) => {
  showConnectionForm(connection, true);
};

const handleConnectionSubmit = async (connectionData: any) => {
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

const confirmDeleteConnection = (connection: any) => {
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
const handleAddEnvironment = async (environmentName: string) => {
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

const handleEditEnvironment = async (environmentData: any) => {
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

const handleDeleteEnvironment = (environmentName: string) => {
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

const handleEnvironmentCreated = (payload: any) => {
  if (payload.status === "success") {
    console.log("Environment created successfully:", payload.message);
  } else {
    console.error("Failed to create environment:", payload.message);
  }
};

const handleEnvironmentUpdated = (payload: any) => {
  if (payload.status === "success") {
    console.log("Environment updated successfully:", payload.message);
  } else {
    console.error("Failed to update environment:", payload.message);
  }
};

const handleEnvironmentDeleted = (payload: any) => {
  if (payload.status === "success") {
    console.log("Environment deleted successfully:", payload.message);
    showEnvironmentDeleteAlert.value = false;
    environmentToDelete.value = null;
  } else {
    console.error("Failed to delete environment:", payload.message);
  }
};

// Templates handlers
const loadTemplates = async () => {
  templatesLoading.value = true;
  try {
    await vscode.postMessage({ command: "bruin.getTemplatesList" });
  } catch (error) {
    console.error("Error loading templates:", error);
    templatesLoading.value = false;
  }
};

const handleTemplatesList = (payload: any) => {
  templatesLoading.value = false;
  if (payload.status === "success") {
    try {
      const templateData = typeof payload.message === 'string' 
        ? JSON.parse(payload.message) 
        : payload.message;
      templates.value = templateData.templates || [];
      console.log("Templates loaded:", templates.value);
    } catch (error) {
      console.error("Error parsing templates:", error);
      templates.value = [];
    }
  } else {
    console.error("Failed to load templates:", payload.message);
    templates.value = [];
  }
};

const handleTemplateSelect = (event: any) => {
  const template = (event.target as HTMLSelectElement).value;
  selectedTemplate.value = template;
  console.log("Selected template:", template);
};

const handleCreateProject = async () => {
  if (!selectedTemplate.value) {
    console.error("No template selected");
    return;
  }
  
  try {
    await vscode.postMessage({
      command: "bruin.initProject",
      payload: {
        templateName: selectedTemplate.value
      }
    });
  } catch (error) {
    console.error("Error creating project:", error);
  }
};

const handleProjectInit = (payload: any) => {
  if (payload.status === "success") {
    console.log("Project initialized successfully:", payload.message);
    projectCreationSuccess.value = true;
    successMessage.value = payload.message || "Project created successfully";
    // Reset the dropdown selection
    selectedTemplate.value = "";
    // Reset the dropdown DOM element
    nextTick(() => {
      if (templateDropdownRef.value) {
        templateDropdownRef.value.value = "";
      }
    });
    // Hide success message after 8 seconds
    setTimeout(() => {
      projectCreationSuccess.value = false;
      successMessage.value = "";
    }, 8000);
  } else if (payload.status === "cancelled") {
    console.log("Project creation cancelled:", payload.message);
  } else {
    console.error("Failed to initialize project:", payload.message);
  }
};

// Watch for isBruinInstalled changes to load templates
watch(() => props.isBruinInstalled, (newValue) => {
  if (newValue && templates.value.length === 0) {
    loadTemplates();
  }
});
</script>
