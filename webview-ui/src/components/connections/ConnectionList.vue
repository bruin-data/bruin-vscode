<template>
  <div class="max-w-7xl h-full mx-auto p-4">
    <div class="flex-col items-center">
      <div class="flex flex-col items-start space-y-2 mb-2">
        <h2 class="text-xl font-semibold text-editor-fg">Connections</h2>
        <div v-if="!error" class="mt-2 max-w-xl text-sm text-editor-fg">
          <p>
            Manage your connections across different environments all in one place. View existing
            connections, edit their details, or delete them as needed.
          </p>
        </div>
      </div>
      <div class="flex items-center justify-end">
        <vscode-button
          @click="$emit('new-connection')"
          class="mt-2 rounded-md px-1 py-2 text-sm font-semibold"
        >
          New connection
        </vscode-button>
      </div>
    </div>

    <div v-if="error">
      <AlertMessage :message="error" />
    </div>

    <div
      v-else
      v-for="(connections, environment) in groupedConnections"
      :key="environment"
      class="mt-6"
    >
      <h3 class="text-lg font-medium text-editor-fg mb-2 font-mono">
        {{ environment === defaultEnvironment ? `${environment} (default)` : environment }}
      </h3>
      <div class="relative bg-editorWidget-bg">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-commandCenter-border">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="w-2/5 px-2 py-2 text-left text-sm font-semibold text-editor-fg opacity-70"
                >
                  Name
                </th>
                <th
                  scope="col"
                  class="w-2/5 px-2 py-2 text-left text-sm font-semibold text-editor-fg opacity-70"
                >
                  Type
                </th>
                <th
                  scope="col"
                  class="w-1/5 px-2 py-2 text-right text-sm font-semibold text-editor-fg opacity-70"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="connection in connections"
                :key="connection.name"
                class="hover:bg-editor-hoverBackground"
              >
                <td
                  class="w-2/5 whitespace-nowrap px-2 py-2 text-sm font-medium text-editor-fg font-mono"
                  :class="{ 'opacity-80 italic': !connection.name }"
                >
                  {{ connection.name || "undefined" }}
                </td>
                <td class="w-2/5 whitespace-nowrap px-2 py-2 text-sm text-descriptionFg font-mono">
                  {{ connection.type }}
                </td>
                <td class="w-1/5 whitespace-nowrap px-2 py-2 text-right text-sm font-medium">
                  <button
                    @click="$emit('edit-connection', connection)"
                    class="text-descriptionFg hover:text-editor-fg mr-3"
                    title="Edit"
                  >
                    <PencilIcon class="h-4 w-4 inline-block" />
                  </button>
                  <button
                    @click="$emit('delete-connection', { name: connection.name, environment })"
                    class="text-descriptionFg opacity-70 hover:text-editorError-foreground"
                    title="Delete"
                  >
                    <TrashIcon class="h-4 w-4 inline-block" />
                  </button>
                  <div class="relative inline-block align-middle">
                    <button
                      @click="toggleMenu(connection.name, $event)"
                      class="text-descriptionFg hover:text-editor-fg align-middle"
                    >
                      <EllipsisVerticalIcon class="h-5 w-5 inline-block" />
                    </button>
                    <div
                      v-if="activeMenu === connection.name"
                      class="absolute right-0 mt-2 w-48 bg-editorWidget-bg border border-commandCenter-border rounded shadow-lg z-10"
                      :style="menuPosition"
                      ref="menuRef"
                    >
                      <button
                        @click="handleTestConnection(connection)"
                        class="flex items-center space-x-1 w-full text-left px-2 py-1 text-sm text-editor-fg hover:bg-editor-button-hover-bg"
                      >
                        <BeakerIcon class="h-4 w-4 inline-block mr-1" />
                        <span> Test </span>
                      </button>
                      <button
                        @click="handleDuplicateConnection(connection)"
                        class="flex items-center space-x-1 w-full text-left px-2 py-1 text-sm text-editor-fg hover:bg-editor-button-hover-bg"
                      >
                        <DocumentDuplicateIcon class="h-4 w-4 inline-block mr-1" />

                        <span> Duplicate </span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <TestStatus
      v-if="connectionTestStatus"
      :status="connectionTestStatus"
      @dismiss="connectionTestStatus = null"
      :successMessage="successMessage"
      :isLoading="loadingMessage"
      :failureMessage="failureMessage"
      :supportMessage="supportMessage"
    />
  </div>
</template>

<script setup>
import { useConnectionsStore } from "@/store/bruinStore";
import { computed, onMounted, ref, defineEmits, onUnmounted } from "vue";
import {
  TrashIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  BeakerIcon,
} from "@heroicons/vue/24/outline";
import AlertMessage from "@/components/ui/alerts/AlertMessage.vue";
import { vscode } from "@/utilities/vscode";
import TestStatus from "@/components/ui/alerts/TestStatus.vue";
import { onClickOutside } from '@vueuse/core'
const connectionsStore = useConnectionsStore();
const connections = computed(() => connectionsStore.connections);
const error = computed(() => connectionsStore.error);
const defaultEnvironment = computed(() => connectionsStore.getDefaultEnvironment());
const emit = defineEmits([
  "new-connection",
  "edit-connection",
  "delete-connection",
  "duplicate-connection",
]);

// Track which menu is currently active
const activeMenu = ref(null);
const connectionTestStatus = ref(null);
const failureMessage = ref(null);
const successMessage = ref(null);
const supportMessage = ref(null);
const loadingMessage = ref(null);
const menuPosition = ref({});
const menuRef = ref(null);

const groupedConnections = computed(() => {
  return connections.value.reduce((grouped, connection) => {
    const environment = connection.environment;
    (grouped[environment] = grouped[environment] || []).push(connection);
    return grouped;
  }, {});
});

const toggleMenu = (connectionName, event) => {
  activeMenu.value = activeMenu.value === connectionName ? null : connectionName;
  if (activeMenu.value) {
    menuPosition.value = getMenuPosition(event); // Calculate position using the event
  }
};

const getMenuPosition = (event) => {
  const buttonRect = event.target.getBoundingClientRect(); // Get button dimensions
  const viewportHeight = window.innerHeight;

  const dropdownHeight = 100;

  // Check for overflow
  const willOverflow = buttonRect.bottom + dropdownHeight > viewportHeight;

  // Adjust position based on overflow
  if (willOverflow) {
    return {
      bottom: "100%",
      right: "4",
      top: "auto",
    };
  }

  return {
    top: "100%",
    right: "4",
    bottom: "auto",
  };
};

onClickOutside(menuRef, () => {
  activeMenu.value = null; 
});

const testConnection = (connection) => {
  try {
    console.log("Testing connection:", connection);
    const connectionData = {
      name: connection.name,
      type: connection.type,
      environment: connection.environment,
      credentials: connection.credentials,
    };
    vscode.postMessage({
      command: "bruin.testConnection",
      payload: connectionData,
    });
  } catch (error) {
    console.error("Error testing connection:", error);
  }
};

const handleConnectionTested = (payload) => {
  switch (payload.status) {
    case "success":
      console.log("Connection tested successfully:", payload.message);
      connectionTestStatus.value = "success";
      successMessage.value = payload.message;
      break;
    case "loading":
      console.log("Connection test in progress:", payload.message);
      connectionTestStatus.value = "loading";
      loadingMessage.value = payload.message;
      break;
    case "unsupported":
    console.log("Connection test :", payload.message);
      connectionTestStatus.value = "unsupported";
      supportMessage.value = payload.message;  
    break;
    default:
      console.error("Failed to test connection:", payload.message);
      connectionTestStatus.value = "failure";
      failureMessage.value = JSON.parse(payload.message).error;
  }
};

const handleTestConnection = (connection) => {
  testConnection(connection);
  activeMenu.value = null; // Close menu after action
};

const handleDuplicateConnection = (connection) => {
  emit("duplicate-connection", connection);
  activeMenu.value = null; // Close menu after action
};

const handleMessage = (event) => {
  const message = event.data;
  switch (message.command) {
    case "connection-tested-message":
      console.log("Connection tested:", message.payload);
      handleConnectionTested(message.payload);
      break;
    default:
      break;
  }
};
onMounted(() => {
  window.addEventListener("message", handleMessage);
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}
.divide-y-opacity {
  border: 0.5;
}
</style>
