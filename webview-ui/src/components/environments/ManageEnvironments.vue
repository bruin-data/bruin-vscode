<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg p-6 relative">
    <span 
      @click="!isCreating && (isCollapsed = !isCollapsed)"
      class="codicon absolute top-4 right-4 z-10" 
      :class="[
        isCollapsed ? 'codicon-chevron-down' : 'codicon-chevron-up',
        !isCreating ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      ]"
    ></span>

    <div v-if="!isCreating">
      <div class="flex items-center w-full mb-2">
        <div class="flex items-center">
          <h3 class="text-lg font-medium text-editor-fg">Environments</h3>
        </div>
      </div>
      
      <p class="text-sm text-editor-fg opacity-70 mb-4">
         Manage your environments and create new ones
      </p>

      <div v-if="!isCollapsed">
        <div v-if="environments.length === 0" class="text-sm text-editor-fg opacity-70">
          No environments found. Create your first environment to get started.
        </div>
        <div v-else class="space-y-2">
          <table class="min-w-full divide-y divide-commandCenter-border">
            <thead>
              <tr>
                <th
                  scope="col"
                  class="w-4/5 px-2 py-2 text-left text-sm font-semibold text-editor-fg opacity-70"
                >
                  Name
                </th>
                <th>
                  <vscode-button @click.stop="isCreating = true" appearance="primary">
          <div class="flex items-center">
            <span class="codicon codicon-plus"></span>
            <span class="ml-1">Environment</span>
          </div>
        </vscode-button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="env in environments" :key="env" class="hover:bg-editor-hoverBackground">
                <td class="w-4/5 whitespace-nowrap px-2 py-2 text-sm font-medium text-editor-fg">
                  {{ env }}
                </td>
              
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        
      </div>
    </div>

    <div v-else>
      <h4 class="text-lg font-medium text-editor-fg mb-4">Create New Environment</h4>

      <div class="mb-4">
        <label class="block text-sm font-medium text-editor-fg mb-2"> Environment Name </label>
        <input
          v-model="newEnvironmentName"
          type="text"
          placeholder="Enter environment name"
          class="w-1/2 px-3 py-2 h-8 bg-input-background text-input-foreground border border-input-border rounded focus:outline-none focus:ring-2 focus:ring-inputOption-activeBorder"
          @keyup.enter="createEnvironment"    
          ref="environmentInput"
        />
        <div v-if="errorMessage" class="text-errorForeground text-sm mt-1">
          {{ errorMessage }}
        </div>
      </div>

      <div class="flex justify-end space-x-2">
        <vscode-button @click="cancelCreation" appearance="secondary"> Cancel </vscode-button>
        <vscode-button
          @click="createEnvironment"
          appearance="primary"
          :disabled="!newEnvironmentName.trim()"
        >
          Create
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from "vue";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  environments: string[];
}>();

const isCreating = ref(false);
const isCollapsed = ref(true);
const newEnvironmentName = ref("");
const errorMessage = ref("");
const environmentInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  window.addEventListener("message", handleMessage);
});

watch(isCreating, (newValue) => {
  if (newValue) {
    focusInput();
  }
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "environment-created-message":
      if (message.payload.status === "success") {
        console.log("Environment created successfully:", message.payload.message);
        cancelCreation();
      } else {
        errorMessage.value = message.payload.message || "Failed to create environment";
      }
      break;
  }
};

const cancelCreation = () => {
  isCreating.value = false;
  newEnvironmentName.value = "";
  errorMessage.value = "";
};

const createEnvironment = async () => {
  if (!newEnvironmentName.value.trim()) {
    errorMessage.value = "Environment name is required";
    return;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(newEnvironmentName.value)) {
    errorMessage.value =
      "Environment name can only contain letters, numbers, underscores, and hyphens";
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
        environmentName: newEnvironmentName.value,
      },
    });
  } catch (error) {
    console.error("Error creating environment:", error);
    errorMessage.value = "Failed to create environment";
  }
};

const focusInput = async () => {
  await nextTick();
  if (environmentInput.value) {
    environmentInput.value.focus();
  }
};
</script>

<style scoped>
/* Scoped styles can remain if they are simple and don't conflict */
</style> 