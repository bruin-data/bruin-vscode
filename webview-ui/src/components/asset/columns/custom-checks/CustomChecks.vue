<template>
  <div class="flex flex-col py-2 sm:py-1 h-full w-56 relative">
    <div class="flex justify-end mb-4 px-4">
      <vscode-button @click="addCustomCheck" class="py-1 focus:outline-none">
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
          <th class="px-2 py-1 w-1/2"></th>
        </tr>
      </thead>
      <tbody v-if="localCustomChecks.length">
        <tr
          v-for="(check, index) in localCustomChecks"
          :key="index"
          class="border-b border-commandCenter-border"
        >
          <!-- Check Name with improved handling -->
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/4">
            <div v-if="editingIndex === index" class="flex flex-col gap-1">
              <input
                v-model="(editingCustomCheck as CustomChecks).name"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
              />
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
              <input
                v-model="(editingCustomCheck as CustomChecks).description"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
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
            <div v-if="editingIndex === index" class="flex flex-col gap-1">
              <input
                v-model="(editingCustomCheck as CustomChecks).query"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
              />
            </div>
            <div
              v-else
              v-html="highlightedLines(check.query)"
              class="truncate"
              :title="check.query"
            ></div>
          </td>
          <td class="px-2 py-1 text-xs w-1/2">
            <vscode-button
              appearance="icon"
              v-if="editingIndex === index"
              @click="saveCustomChecks"
              aria-label="Save"
              class="flex items-center"
            >
              <CheckIcon class="h-3 w-3" />
            </vscode-button>
          </td>
          <td class="px-2 py-1 text-xs w-1/2">
            <vscode-button
              appearance="icon"
              @click="deleteCustomCheck(index)"
              aria-label="Delete"
              class="flex items-center"
            >
              <TrashIcon class="h-3 w-3 " />
            </vscode-button>
          </td>
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
import { CheckIcon, TrashIcon } from "@heroicons/vue/24/solid";

const props = defineProps<{
  customChecks: CustomChecks[];
}>();

const localCustomChecks = ref<CustomChecks[]>([]);
const editingIndex = ref<number | null>(null);
const editingCustomCheck = ref<CustomChecks | null>(null);
const emit = defineEmits(["update:customChecks"]);

const addCustomCheck = () => {
  // Add custom check logic here
  try {
    const newCustomCheck = {
      id: uuidv4(),
      name: "New Custom Check",
      value: 1,
      description: "Description for the new custom check",
      query: "",
    };

    // Add new custom check to local custom checks
    localCustomChecks.value.push(newCustomCheck);
    editingIndex.value = localCustomChecks.value.length - 1;
    editingCustomCheck.value = JSON.parse(JSON.stringify(newCustomCheck)) as CustomChecks;
  } catch (error) {
    console.error("Error adding new custom check:", error);
  }
};

const deleteCustomCheck = (index: number) => {
  try {
    // Remove the custom check from local custom checks
    localCustomChecks.value.splice(index, 1);
   
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

    // Reset editing state
    editingIndex.value = null;
    editingCustomCheck.value = null;

    // Post-process and emit checks
    const formattedCustomChecks = localCustomChecks.value.map((check) => ({
      ...check,
      value: Number(check.value) || 0, // Ensure value is numeric
    }));

    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: { custom_checks: formattedCustomChecks },
    });

    emit("update:customChecks", formattedCustomChecks);
  } catch (error) {
    console.error("Error saving custom checks:", error);
  }
};
const highlightedLines = (query) => {
  if (!query) return []; // Return an empty array if no query is provided
  const highlighted = hljs.highlight(query, { language: "sql" }).value;

  // Split the highlighted output into lines
  let lines = highlighted.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop(); // Remove the last empty line if it exists
  }

  // Return each line wrapped in a <div> for proper formatting
  return lines.map((line) => `<div>${line}</div>`).join(""); // Join lines with <div> for line breaks
};

watch(
  () => props.customChecks,
  (newCustomChecks) => {
    localCustomChecks.value = newCustomChecks.map((check) => ({
      ...check,
    }));
  },
  { deep: true }
);
</script>

<style scoped>
table thead tr.border-opacity-test {
  border: 0.7 !important; /* Adjust the opacity value as needed */
}
</style>
