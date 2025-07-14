<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg p-6 relative">
    <span 
      @click="!isCreating && !isEditing && (isCollapsed = !isCollapsed)"
      class="codicon absolute top-4 right-4 z-10" 
      :class="[
        isCollapsed ? 'codicon-chevron-down' : 'codicon-chevron-up',
        !isCreating && !isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      ]"
    ></span>

    <div v-if="!isCreating && !isEditing">
      <div class="flex items-center w-full mb-2">
        <div class="flex items-center">
          <h3 class="text-lg font-medium text-editor-fg">Environments</h3>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-editor-fg opacity-70">
          Manage your environments and create new ones
        </p>
        <vscode-button @click.stop="isCreating = true" appearance="primary">
          <div class="flex items-center">
            <span class="codicon codicon-plus"></span>
            <span class="ml-1">Environment</span>
          </div>
        </vscode-button>
      </div>

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
                  class="px-2 py-2 text-left text-sm font-semibold text-editor-fg opacity-70"
                >
                  Name
                </th>
                <th class="px-2 py-2 text-right text-sm font-semibold text-editor-fg opacity-70 w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="env in environments" :key="env" class="hover:bg-editor-hoverBackground">
                <td class="whitespace-nowrap px-2 py-2 text-sm font-medium text-editor-fg">
                  {{ env }}
                </td>
                <td class="px-2 py-2 text-right w-24">
                  <button
                    @click="startEdit(env)" 
                    class="text-descriptionFg hover:text-editor-fg mr-3"
                    title="Edit"
                  >
                    <PencilIcon class="h-4 w-4 inline-block" />
                  </button>
                  <button
                    @click="confirmDelete(env)" 
                    class="text-descriptionFg opacity-70 hover:text-editorError-foreground"
                    title="Delete"
                  >
                    <TrashIcon class="h-4 w-4 inline-block" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        
      </div>
    </div>

    <div v-else-if="isCreating">
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

    <div v-else-if="isEditing">
      <h4 class="text-lg font-medium text-editor-fg mb-4">Edit Environment</h4>

      <div class="mb-4">
        <label class="block text-sm font-medium text-editor-fg mb-2"> Environment Name </label>
        <input
          v-model="editEnvironmentName"
          type="text"
          placeholder="Enter environment name"
          class="w-1/2 px-3 py-2 h-8 bg-input-background text-input-foreground border border-input-border rounded focus:outline-none focus:ring-2 focus:ring-inputOption-activeBorder"
          @keyup.enter="updateEnvironment"    
          ref="editEnvironmentInput"
        />
        <div v-if="errorMessage" class="text-errorForeground text-sm mt-1">
          {{ errorMessage }}
        </div>
      </div>

      <div class="flex justify-end space-x-2">
        <vscode-button @click="cancelEdit" appearance="secondary"> Cancel </vscode-button>
        <vscode-button
          @click="updateEnvironment"
          appearance="primary"
          :disabled="!editEnvironmentName.trim() || editEnvironmentName === currentEditingEnvironment"
        >
          Update
        </vscode-button>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-editorWidget-bg border border-commandCenter-border rounded-lg p-6 max-w-md w-full mx-4">
        <h4 class="text-lg font-medium text-editor-fg mb-4">Delete Environment</h4>
        <p class="text-sm text-editor-fg opacity-70 mb-4">
          Are you sure you want to delete environment "{{ environmentToDelete }}"? This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-2">
          <vscode-button @click="cancelDelete" appearance="secondary">Cancel</vscode-button>
          <vscode-button @click="deleteEnvironment" appearance="primary">Delete</vscode-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from "vue";
import { TrashIcon, PencilIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  environments: string[];
}>();

const isCreating = ref(false);
const isEditing = ref(false);
const isCollapsed = ref(true);
const newEnvironmentName = ref("");
const editEnvironmentName = ref("");
const currentEditingEnvironment = ref("");
const errorMessage = ref("");
const environmentInput = ref<HTMLInputElement | null>(null);
const editEnvironmentInput = ref<HTMLInputElement | null>(null);
const showDeleteConfirm = ref(false);
const environmentToDelete = ref("");

onMounted(() => {
  window.addEventListener("message", handleMessage);
});

watch(isCreating, (newValue) => {
  if (newValue) {
    focusInput();
  }
});

watch(isEditing, (newValue) => {
  if (newValue) {
    focusEditInput();
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
    case "environment-deleted-message":
      if (message.payload.status === "success") {
        console.log("Environment deleted successfully:", message.payload.message);
        showDeleteConfirm.value = false;
        environmentToDelete.value = "";
      } else {
        console.error("Failed to delete environment:", message.payload.message);
      }
      break;
    case "environment-updated-message":
      if (message.payload.status === "success") {
        console.log("Environment updated successfully:", message.payload.message);
        cancelEdit();
      } else {
        errorMessage.value = message.payload.message || "Failed to update environment";
      }
      break;
  }
};

const cancelCreation = () => {
  isCreating.value = false;
  newEnvironmentName.value = "";
  errorMessage.value = "";
};

const cancelEdit = () => {
  isEditing.value = false;
  editEnvironmentName.value = "";
  currentEditingEnvironment.value = "";
  errorMessage.value = "";
};

const startEdit = (environmentName: string) => {
  currentEditingEnvironment.value = environmentName;
  editEnvironmentName.value = environmentName;
  isEditing.value = true;
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

const updateEnvironment = async () => {
  if (!editEnvironmentName.value.trim()) {
    errorMessage.value = "Environment name is required";
    return;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(editEnvironmentName.value)) {
    errorMessage.value =
      "Environment name can only contain letters, numbers, underscores, and hyphens";
    return;
  }

  if (editEnvironmentName.value === currentEditingEnvironment.value) {
    errorMessage.value = "New name must be different from current name";
    return;
  }

  if (props.environments.includes(editEnvironmentName.value)) {
    errorMessage.value = "Environment name already exists";
    return;
  }

  errorMessage.value = "";

  try {
    await vscode.postMessage({
      command: "bruin.updateEnvironment",
      payload: {
        currentName: currentEditingEnvironment.value,
        newName: editEnvironmentName.value,
      },
    });
  } catch (error) {
    console.error("Error updating environment:", error);
    errorMessage.value = "Failed to update environment";
  }
};

const confirmDelete = (environmentName: string) => {
  environmentToDelete.value = environmentName;
  showDeleteConfirm.value = true;
};

const cancelDelete = () => {
  showDeleteConfirm.value = false;
  environmentToDelete.value = "";
};

const deleteEnvironment = async () => {
  try {
    await vscode.postMessage({
      command: "bruin.deleteEnvironment",
      payload: {
        environmentName: environmentToDelete.value,
      },
    });
  } catch (error) {
    console.error("Error deleting environment:", error);
  }
};

const focusInput = async () => {
  await nextTick();
  if (environmentInput.value) {
    environmentInput.value.focus();
  }
};

const focusEditInput = async () => {
  await nextTick();
  if (editEnvironmentInput.value) {
    editEnvironmentInput.value.focus();
  }
};
</script>

<style scoped>
/* Scoped styles can remain if they are simple and don't conflict */
</style> 