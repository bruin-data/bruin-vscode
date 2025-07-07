<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-editor-fg">Manage Environments</h3>
      <vscode-button @click="showCreateModal = true" appearance="primary">
        <span class="codicon codicon-plus"></span>
        Create New Environment
      </vscode-button>
    </div>

    <div v-if="environments.length === 0" class="text-sm text-editor-fg opacity-70">
      No environments found. Create your first environment to get started.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="env in environments"
        :key="env"
        class="flex items-center justify-between p-3 border border-commandCenter-border rounded"
      >
        <span class="text-editor-fg">{{ env }}</span>
        <span class="text-xs text-editor-fg opacity-70">Environment</span>
      </div>
    </div>

    <!-- Create Environment Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closeModal"
    >
      <div
        class="bg-editorWidget-bg border border-commandCenter-border rounded-lg p-6 w-96"
        @click.stop
      >
        <h4 class="text-lg font-medium text-editor-fg mb-4">Create New Environment</h4>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-editor-fg mb-2">
            Environment Name
          </label>
          <input
            v-model="newEnvironmentName"
            type="text"
            placeholder="Enter environment name"
            class="w-full px-3 py-2 bg-input-background text-input-foreground border border-input-border rounded focus:outline-none focus:ring-2 focus:ring-inputOption-activeBorder"
            @keyup.enter="createEnvironment"
            ref="environmentInput"
          />
          <div v-if="errorMessage" class="text-errorForeground text-sm mt-1">
            {{ errorMessage }}
          </div>
        </div>

        <div class="flex justify-end space-x-2">
          <vscode-button @click="closeModal" appearance="secondary">
            Cancel
          </vscode-button>
          <vscode-button @click="createEnvironment" appearance="primary" :disabled="!newEnvironmentName.trim()">
            Create
          </vscode-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  environments: string[];
}>();

const showCreateModal = ref(false);
const newEnvironmentName = ref("");
const errorMessage = ref("");
const environmentInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  window.addEventListener("message", handleMessage);
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "environment-created-message":
      if (message.payload.status === "success") {
        console.log("Environment created successfully:", message.payload.message);
        closeModal();
        // The parent component will refresh the environments list
      } else {
        errorMessage.value = message.payload.message || "Failed to create environment";
      }
      break;
  }
};

const closeModal = () => {
  showCreateModal.value = false;
  newEnvironmentName.value = "";
  errorMessage.value = "";
};

const createEnvironment = async () => {
  if (!newEnvironmentName.value.trim()) {
    errorMessage.value = "Environment name is required";
    return;
  }

  // Basic validation
  if (!/^[a-zA-Z0-9_-]+$/.test(newEnvironmentName.value)) {
    errorMessage.value = "Environment name can only contain letters, numbers, underscores, and hyphens";
    return;
  }

  if (props.environments.includes(newEnvironmentName.value)) {
    errorMessage.value = "Environment already exists";
    return;
  }

  errorMessage.value = "";
  
  try {
    await vscode.postMessage({
      command: "bruin.createEnvironment",
      payload: {
        environmentName: newEnvironmentName.value
      }
    });
  } catch (error) {
    console.error("Error creating environment:", error);
    errorMessage.value = "Failed to create environment";
  }
};

// Auto-focus the input when modal opens
const focusInput = async () => {
  await nextTick();
  if (environmentInput.value) {
    environmentInput.value.focus();
  }
};

// Watch for modal opening to focus input
const originalShowCreateModal = showCreateModal.value;
const watchShowCreateModal = () => {
  if (showCreateModal.value && !originalShowCreateModal) {
    focusInput();
  }
};
</script>

<style scoped>
.fixed {
  position: fixed;
}

.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.z-50 {
  z-index: 50;
}
</style> 