<template>
  <div class="flex flex-col py-2 sm:py-1 h-full w-56 relative">
    <div class="flex justify-end mb-4">
      <vscode-button :disabled="isConfigFile" @click="addCustomCheck" class="py-1 focus:outline-none disabled:cursor-not-allowed">
        Add Check
      </vscode-button>
    </div>
    <table class="min-w-full border-collapse border-editor-fg">
      <thead>
        <tr class="border-opacity-test text-xs font-semibold text-left opacity-65 border-b-2">
          <th class="px-2 py-1 w-1/4">Name</th>
          <th class="px-2 py-1 w-1/6 text-center">Value</th>
          <th class="px-2 py-1 w-1/4 text-center">Description</th>
          <th class="px-2 py-1 w-1/2">Query</th>
          <th class="px-2 py-1 w-1/4"></th>
        </tr>
      </thead>
      <tbody v-if="localCustomChecks.length">
        <tr
          v-for="(check, index) in localCustomChecks"
          :key="index"
          class="border-b border-commandCenter-border"
        >
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/4">
            <div v-if="editingIndex === index" class="flex flex-col gap-1">
              <textarea
                v-model="(editingCustomCheck as CustomChecks).name"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
                rows="2"
                ></textarea>
            </div>
            <div v-else class="break-words whitespace-normal truncate" :title="check.name">
              {{ check.name }}
            </div>
          </td>
          <!-- Value -->
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/6 text-center">
            <div v-if="editingIndex === index" class="flex flex-col gap-1">
              <input
                v-model="(editingCustomCheck as CustomChecks).value"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
              />
            </div>
            <div
              v-else-if="check.value !== null && check.value !== undefined"
              class="truncate"
              :title="String(check.value)"
            >
              {{ check.value }}
            </div>
            <div v-else class="italic opacity-70 truncate whitespace-normal">undefined</div>
          </td>
          <!-- Description -->
          <td class="px-2 py-1 text-xs w-1/4 text-center">
            <div v-if="editingIndex === index" class="flex flex-col gap-1">
              <textarea
                v-model="(editingCustomCheck as CustomChecks).description"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
                rows="2"
              />
            </div>
            <div
              v-else-if="check.description"
              class="truncate whitespace-normal"
              :title="check.description"
            >
              {{ check.description }}
            </div>
            <div v-else class="italic opacity-70 truncate whitespace-normal">
              No description provided
            </div>
          </td>
          <!-- Query -->
          <td class="px-2 py-1 text-xs w-1/2">
            <div v-if="editingIndex === index">
              <textarea
                v-model="(editingCustomCheck as CustomChecks).query"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
                rows="4"
              ></textarea>
            </div>
            <div
              v-else
              v-html="highlightedLines(check.query)"
              class="break-words whitespace-normal truncate"
              :title="check.query"
            ></div>
          </td>
          <td class="px-2 py-1 text-xs w-1/4">
            <div v-if="editingIndex === index" class="flex items-center gap-1">
              <vscode-button
                appearance="icon"
                @click="saveCustomChecks"
                aria-label="Save"
                class="flex items-center"
              >
                <CheckIcon class="h-3 w-3" />
              </vscode-button>
              <vscode-button
                appearance="icon"
                @click="resetEditing"
                aria-label="Cancel"
                class="flex items-center"
              >
                <XMarkIcon class="h-3 w-3" />
              </vscode-button>
            </div>
            <div v-if="editingIndex !== index" class="flex items-center gap-1">
              <vscode-button
                appearance="icon"
                @click="showDeleteAlert = index"
                aria-label="Delete"
                class="flex items-center"
              >
                <TrashIcon class="h-3 w-3" />
              </vscode-button>
              <vscode-button
                appearance="icon"
                @click="startEditing(index)"
                aria-label="Edit"
                class="flex items-center"
              >
                <PencilIcon class="h-3 w-3" />
              </vscode-button>
            </div>
          </td>
          <div>
            <DeleteAlert
              v-if="showDeleteAlert === index"
              :elementName="check.name"
              elementType="custom check"
              @confirm="deleteCustomCheck(index)"
              @cancel="showDeleteAlert = null"
              class="absolute z-50"
            />
          </div>
        </tr>
      </tbody>
      <div class="w-56 text-left p-2 text-md italic opacity-70" v-else>
        <span> No custom checks to display. </span>
      </div>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { CustomChecks } from "@/types";
import "highlight.js/styles/default.css";
import hljs from "highlight.js/lib/core";
import { ref, watch } from "vue";
import { v4 as uuidv4 } from "uuid";
import { vscode } from "@/utilities/vscode";
import { CheckIcon, TrashIcon, PencilIcon, XMarkIcon } from "@heroicons/vue/24/solid";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";

const props = defineProps<{
  customChecks: CustomChecks[];
  isConfigFile: boolean;
}>();

const localCustomChecks = ref<CustomChecks[]>([]);
const editingIndex = ref<number | null>(null);
const editingCustomCheck = ref<CustomChecks | null>(null);

const showDeleteAlert = ref<number | null>(null);
const addCustomCheck = () => {
  try {
    const newCustomCheck = {
      id: uuidv4(),
      name: "New Custom Check",
      value: 1,
      description: "Description for the new custom check",
      query: "",
    };

    localCustomChecks.value.push(newCustomCheck);
    editingIndex.value = localCustomChecks.value.length - 1;
    editingCustomCheck.value = JSON.parse(JSON.stringify(newCustomCheck)) as CustomChecks;
  } catch (error) {
    console.error("Error adding new custom check:", error);
  }
};

const startEditing = (index: number) => {
  editingIndex.value = index;
  editingCustomCheck.value = JSON.parse(
    JSON.stringify(localCustomChecks.value[index])
  ) as CustomChecks;
};

const resetEditing = () => {
  editingIndex.value = null;
  editingCustomCheck.value = null;
};

const deleteCustomCheck = (index: number) => {
  try {
    localCustomChecks.value.splice(index, 1);
    showDeleteAlert.value = null;
    saveCustomChecks();
  } catch (error) {
    console.error("Error deleting custom check:", error);
  }
};

const saveCustomChecks = () => {
  try {
    if (editingIndex.value !== null && editingCustomCheck.value) {
      // Convert value to number explicitly
      const updatedCheck = {
        ...editingCustomCheck.value,
        value: Number(editingCustomCheck.value.value) || 0,
      };

      // Update local checks
      localCustomChecks.value[editingIndex.value] = updatedCheck;
    }

    editingIndex.value = null;
    editingCustomCheck.value = null;

    const formattedCustomChecks = localCustomChecks.value.map((check) => ({
      ...check,
      value: Number(check.value) || 0, 
    }));

    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: { custom_checks: formattedCustomChecks },
      source: "saveCustomChecks",
    });

  } catch (error) {
    console.error("Error saving custom checks:", error);
  }
};
const highlightedLines = (query) => {
  if (!query) return []; 
  const highlighted = hljs.highlight(query, { language: "sql" }).value;

  let lines = highlighted.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.map((line) => `<div>${line}</div>`).join(""); 
};

watch(
  () => props.customChecks,
  (newCustomChecks) => {
    editingIndex.value = null;
    editingCustomCheck.value = null;
    showDeleteAlert.value = null;
    localCustomChecks.value = newCustomChecks.map((check) => ({
      ...check,
    }));
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
table thead tr.border-opacity-test {
  border: 0.7 !important; 
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

input,
textarea {
  @apply text-xs bg-input-background text-input-foreground border-none outline-none p-1;
}

input:focus,
textarea:focus {
  outline: none;
}
</style>
