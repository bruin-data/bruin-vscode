<template>
  <div class="flex flex-col space-y-2 w-full h-full">
    <div
      class="header flex items-center justify-between border-b-2 border-commandCenter-border p-2"
    >
      <div class="flex items-center w-full justify-between space-x-4">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <vscode-button title="Run Query" appearance="icon" @click="runQuery">
              <PlayIcon class="h-4 w-4" />
            </vscode-button>
            <span class="text-sm text-editor-fg">Limit</span>
            <input
              type="number"
              v-model="limit"
              class="w-16 h-6 text-sm rounded bg-editorWidget-bg text-editor-fg hover:bg-input-background focus:bg-input-background focus:outline-none px-1"
              min="1"
              max="1000"
            />
          </div>
          <div class="flex items-center space-x-2">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="p-1 text-xm rounded transition-colors"
              :class="{
                'bg-input-background text-editor-fg': activeTab === tab.id,
                'text-editor-fg hover:bg-editorWidget-bg': activeTab !== tab.id,
              }"
            >
              <div class="flex items-center justify-between space-x-1">
                <TableCellsIcon class="h-4 w-4" />
               <span> {{ tab.label }} </span>
              </div>
            </button>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <vscode-button title="Copy as CSV" appearance="icon" @click="copyAsCSV">
            <DocumentDuplicateIcon class="h-4 w-4" />
          </vscode-button>
          <vscode-button title="Clear Results" appearance="icon" @click="clearQueryOutput">
            <XMarkIcon class="h-4 w-4" />
          </vscode-button>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-auto p-2">
      <!-- Query Output Tab -->
      <div v-if="activeTab === 'output'">
        <!-- Error Message -->
        <div v-if="error" class="text-red-500">
          <div class="font-medium mb-1">Query failed:</div>
          <div class="text-sm font-mono whitespace-pre-wrap">{{ error }}</div>
        </div>

        <!-- Results Table -->
        <table
          v-if="parsedOutput && !error"
          class="min-w-full divide-y divide-commandCenter-border"
        >
          <!-- Results Table -->
          <table
            v-if="parsedOutput && !error"
            class="min-w-full divide-y divide-commandCenter-border"
          >
            <thead class="bg-editor-bg">
              <tr>
                <th
                  v-for="column in parsedOutput.columns"
                  :key="column.name"
                  class="p-2 text-left text-xs font-medium tracking-wider text-editor-fg uppercase"
                >
                  {{ column.name }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-editor-bg divide-y divide-commandCenter-border">
              <tr v-for="(row, index) in parsedOutput.rows" :key="index">
                <td v-for="(value, colIndex) in row" :key="colIndex" class="p-2 whitespace-nowrap">
                  <div class="text-sm text-editor-fg">
                    {{ value }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { XMarkIcon, DocumentDuplicateIcon } from "@heroicons/vue/20/solid";
import { PlayIcon, TableCellsIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  output: any;
  error: any;
}>();

const limit = ref(100);
const tabs = ref([{ id: "output", label: "Output" }]);
const activeTab = ref("output");

const error = computed(() => {
  if (!props.error) return null;

  if (typeof props.error === "string") {
    try {
      const parsed = JSON.parse(props.error);
      return parsed.error || parsed;
    } catch (e) {
      return props.error;
    }
  }
  return props.error?.error || props.error || "Something went wrong";
});

const parsedOutput = computed(() => {
  if (error.value) return null;
  try {
    if (typeof props.output === "string") {
      return JSON.parse(props.output);
    }
    if (props.output?.data?.status === "success") {
      return JSON.parse(props.output.data.message);
    }
    return props.output;
  } catch (e) {
    console.error("Error parsing output:", e);
    return null;
  }
});
// Add CSV export functionality
const copyAsCSV = () => {
  console.log("Copy as a csv");
};

const runQuery = () => {
  if(limit.value > 1000 || limit.value < 1) {
    limit.value = 1000;
  }
  vscode.postMessage({ command: "bruin.getQueryOutput", payload: { limit: limit.value } });
};
const clearQueryOutput = () => {
  vscode.postMessage({ command: "bruin.clearQueryOutput" });
};
</script>
<style scoped>
input[type="number"] {
  border: none;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: textfield;
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
