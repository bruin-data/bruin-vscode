<template>
  <div class="flex flex-col space-y-2 w-full">
    <div
      class="header flex items-center justify-between border-b-2 border-commandCenter-border p-2"
    >
      <div class="flex items-center w-full justify-start space-x-2">
        <div class="flex items-center space-x-2">
          <span class="text-sm text-editor-fg">LIMIT</span>
          <input
            type="number"
            v-model="limit"
            class="w-16 h-6 text-sm rounded bg-editorWidget-bg text-editor-fg border border-commandCenter-border px-1"
          />
        </div>
        <vscode-button title="Run Query" appearance="icon" @click="runQuery">
          <PlayIcon class="h-4 w-4" />
        </vscode-button>
      </div>
      <div class="flex items-center space-x-2 justify-end">
        <vscode-button title="Clear Query Output" appearance="icon" @click="clearQueryOutput">
          <XMarkIcon class="h-4 w-4" />
        </vscode-button>
      </div>
    </div>

    <!-- Query Output Area -->
    <div class="overflow-x-auto p-2">
      <!-- Error Message -->
      <div  class="text-red-500">
        <div class="font-medium mb-1">Query failed:</div>
        <div class="text-sm font-mono whitespace-pre-wrap">{{ props.error }}</div>
      </div>

      <!-- Results Table -->
      <table v-if="parsedOutput && !error" class="min-w-full divide-y divide-commandCenter-border">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import { PlayIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  output: any;
  error: any;
}>();

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

const limit = ref(100);
const runQuery = () => {
  vscode.postMessage({ command: "bruin.getQueryOutput", payload: { limit: limit.value } });
};
const clearQueryOutput = () => {
  vscode.postMessage({ command: "bruin.clearQueryOutput" });
};
</script>
