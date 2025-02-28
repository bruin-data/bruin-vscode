<template>
  <div class="flex flex-col w-full h-full">
    <div
      class="flex items-center justify-between border-b border-t border-panel-border bg-sideBarSectionHeader-bg"
    >
      <div class="flex items-center w-full justify-between h-8">
        <div class="flex items-center gap-1 ml-2">
          <div class="flex items-center">
            <vscode-button title="Run Query" appearance="icon" @click="runQuery">
              <span class="codicon codicon-play" style="font-size: 1.2em"></span>
            </vscode-button>
            <span class="text-3xs text-editor-fg uppercase px-1">Limit</span>
            <input
              type="number"
              v-model="limit"
              class="w-12 h-6 text-3xs rounded bg-editorWidget-bg text-editor-fg hover:bg-input-background focus:bg-input-background focus:outline-none px-1"
              min="1"
              max="1000"
            />
          </div>
          <div class="flex items-center space-x-2 opacity-50">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="p-1 text-3xs rounded transition-colors uppercase"
              :class="{
                'bg-input-background text-editor-fg': activeTab === tab.id,
                'text-editor-fg hover:bg-editorWidget-bg px-2': activeTab !== tab.id,
              }"
            >
              <div class="flex items-center justify-between">
                <TableCellsIcon class="h-4 w-4 mr-1" />
                <span> {{ tab.label }} </span>
              </div>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-1 mr-2">
          <vscode-button title="Clear Results" appearance="icon" @click="clearQueryOutput">
            <!-- Use the VS Code codicon for clear-all -->
            <span class="codicon codicon-clear-all" style="font-size: 1.2em"></span>
          </vscode-button>
        </div>
      </div>
    </div>
    <!-- Query Output Tab -->
    <div v-if="activeTab === 'output'" class="relative">
      <div
        v-if="isLoading"
        class="fixed inset-0 flex items-center justify-center bg-editor-bg bg-opacity-50 z-50"
      >
        <div class="relative w-8 h-8">
          <!-- Gradient Spinner -->
          <div
            class="w-8 h-8 border-4 border-t-transparent border-solid rounded-full animate-spin"
            style="border-image: linear-gradient(to right, #e05f5f, #fff) 1"
          ></div>
        </div>
      </div>
      <!-- Error Message -->
      <div
        v-if="error"
        class="my-2 border border-commandCenter-border rounded text-errorForeground bg-editorWidget-bg p-2"
      >
        <div class="text-sm font-medium mb-2 pb-1 border-b border-commandCenter-border">
          Query Execution Failed
        </div>
        <div
          class="text-xs font-mono text-red-300 bg-editorWidget-bg whitespace-pre-wrap break-all leading-relaxed"
        >
          {{ error }}
        </div>
      </div>
      <div
        v-if="!parsedOutput && !error && !isLoading"
        class="flex items-center justify-center h-[100vh] w-full"
      >
        <div class="flex items-center space-x-2 text-sm text-editor-fg">
          <vscode-button appearance="icon" @click="runQuery">
            <span class="codicon codicon-play" style="font-size: 1.2em"></span>
          </vscode-button>
          <span class="opacity-50">Run query preview</span>
          <div class="flex items-center">
            <span class="keybinding"> ⌘ </span>
            <span class="keybinding">Enter</span>
          </div>
        </div>
      </div>
      <!-- Results Table -->
      <div v-if="parsedOutput && !error" class="overflow-auto h-[calc(100vh-33px)] w-full">
        <table
          class="w-[calc(100vw-100px)] bg-editor-bg font-mono font-normal text-xs border-t-0 border-collapse"
        >
          <thead class="bg-editor-bg border-y-0">
            <tr>
              <th
                class="sticky top-0 p-1 text-left font-semibold text-editor-fg bg-editor-bg border-x border-commandCenter-border before:absolute before:bottom-0 before:left-0 before:w-full before:border-b before:border-commandCenter-border"
              ></th>
              <th
                v-for="column in parsedOutput.columns"
                :key="column.name"
                class="sticky top-0 p-1 text-left font-semibold text-editor-fg bg-editor-bg border-x border-commandCenter-border before:absolute before:bottom-0 before:left-0 before:w-full before:border-b before:border-commandCenter-border"
              >
                <div class="flex items-center">
                  <span class="truncate">{{ column.name }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in parsedOutput.rows"
              :key="index"
              class="hover:bg-menu-hoverBackground transition-colors duration-150"
            >
              <td
                class="p-1 whitespace-nowrap text-editor-fg font-mono border border-commandCenter-border"
              >
                {{ index + 1 }}
              </td>
              <td
                v-for="(value, colIndex) in row"
                :key="colIndex"
                class="p-1 whitespace-nowrap text-editor-fg font-mono border border-commandCenter-border"
              >
                <div class="truncate max-w-[200px]">{{ value }}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, defineEmits } from "vue";
import { TableCellsIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  output: any;
  error: any;
  isLoading: boolean;
}>();

const limit = ref(100);
const tabs = ref([{ id: "output", label: "Output" }]);
const activeTab = ref("output");
const environment = ref("");
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

const runQuery = () => {
  if (limit.value > 1000 || limit.value < 1) {
    limit.value = 1000;
  }
  vscode.postMessage({
    command: "bruin.getQueryOutput",
    payload: { environment: environment.value, limit: limit.value.toString(), query: "" },
  });
};
const emit = defineEmits(["resetData"]);
const clearQueryOutput = () => {
  emit("resetData");

  vscode.postMessage({ command: "bruin.clearQueryOutput" });
};
const handleKeyDown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    runQuery();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  clearQueryOutput();
  window.removeEventListener("message", postMessage);
});
</script>
<style scoped>
input[type="number"] {
  border: none;
  outline: none;
  appearance: none;
}
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}
thead th {
  position: sticky !important;
  top: 0;
  z-index: 2;
  background-color: var(--vscode-editor-background) !important;
}

thead th::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  border-bottom: 1px solid var(--vscode-commandCenter-border);
  z-index: 1;
}
</style>

<style>
body {
  padding: 0 !important;
  margin: 0 !important;
}

.keybinding {
  background-color: var(--vscode-keybindingLabel-background);
  border-top: 1px solid transparent;
  border-right: 1px solid transparent;
  border-bottom-color: var(--vscode-keybindingLabel-bottomBorder);
  border-left: 1px solid transparent;
  box-shadow: inset 0 -1px 0 var(--vscode-widget-shadow);
  display: inline-block;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-radius: 3px;
  vertical-align: middle;
  font-size: 11px;
  padding: 3px 5px;
  margin: 0px 2px;
  color: var(--vscode-keybindingLabel-foreground);
  align-items: center;
  line-height: 10px;
}
</style>
