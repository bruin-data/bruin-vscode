<template>
  <div class="flex flex-col w-full h-full">
    <div class="flex-1 overflow-auto">
      <!-- Configuration Inputs -->
      <div
        class="flex items-center gap-4 p-3 bg-editorWidget-bg border border-panel-border rounded-lg"
      >
        <!-- Connection 1 and Table 1 -->
        <div class="flex items-center gap-2">
          <vscode-dropdown
            v-model="sourceConnection"
            @change="onSourceConnectionChange"
            class="w-44"
            :disabled="isLoading"
          >
            <vscode-option value="">Connection 1...</vscode-option>
            <vscode-option v-for="conn in connections" :key="conn.name" :value="conn.name">
              {{ conn.name
              }}{{
                conn.environment && conn.environment !== "default" ? ` (${conn.environment})` : ""
              }}
            </vscode-option>
          </vscode-dropdown>

          <vscode-text-field
            placeholder="Table 1 (schema.table)"
            v-model="sourceTableInput"
            @input="onSourceTableInput"
            class="w-44"
            :disabled="isLoading"
          ></vscode-text-field>
        </div>

        <!-- Visual Separator -->
        <div class="text-editor-fg opacity-40 mx-2">
          <span class="codicon codicon-arrow-right"></span>
        </div>

        <!-- Connection 2 and Table 2 -->
        <div class="flex items-center gap-2">
          <vscode-dropdown
            v-model="targetConnection"
            @change="onTargetConnectionChange"
            class="w-44"
            :disabled="isLoading"
          >
            <vscode-option value="">Connection 2...</vscode-option>
            <vscode-option v-for="conn in connections" :key="conn.name" :value="conn.name">
              {{ conn.name
              }}{{
                conn.environment && conn.environment !== "default" ? ` (${conn.environment})` : ""
              }}
            </vscode-option>
          </vscode-dropdown>

          <vscode-text-field
            v-model="targetTableInput"
            @input="onTargetTableInput"
            placeholder="Table 2 (schema.table)"
            class="w-44"
            :disabled="isLoading"
          ></vscode-text-field>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 ml-auto">
          <vscode-button
            :disabled="!canExecuteComparison || isLoading"
            @click="executeComparison"
            appearance="primary"
          >
            <span v-if="!isLoading" class="codicon codicon-play mr-1"></span>
            <span v-if="isLoading" class="animate-spin codicon codicon-loading mr-1"></span>
            Compare
          </vscode-button>

          <vscode-button title="Clear Results" appearance="icon" @click="clearResults">
            <span class="codicon codicon-clear-all"></span>
          </vscode-button>
        </div>
      </div>

      <!-- Results -->
      <div v-if="hasResults || error" class="flex-1">
        <div v-if="error" class="p-4 border-b border-panel-border">
          <div class="flex items-center mb-2">
            <span class="codicon codicon-error text-red-500 mr-2"></span>
            <h3 class="text-sm font-medium text-editor-fg">Error</h3>
          </div>
          <div
            class="text-sm text-red-400 bg-editorWidget-bg p-3 rounded border border-commandCenter-border"
          >
            {{ error }}
          </div>
        </div>

        <div v-if="hasResults" class="p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center">
              <span class="codicon codicon-diff text-blue-500 mr-2"></span>
              <h3 class="text-sm font-medium text-editor-fg">Comparison Results</h3>
            </div>
            <div class="flex items-center gap-2">
              <vscode-badge class="text-xs">
                {{ comparisonInfo.source }} → {{ comparisonInfo.target }}
              </vscode-badge>
              <vscode-button title="Copy Results" appearance="icon" @click="copyResults">
                <span class="codicon codicon-copy text-editor-fg"></span>
              </vscode-button>
            </div>
          </div>

          <div
            class="bg-editorWidget-bg border border-commandCenter-border rounded overflow-hidden"
          >
            <div class="max-h-96 overflow-auto">
              <pre class="text-xs font-mono p-4 text-editor-fg whitespace-pre-wrap">{{
                results
              }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!hasResults && !error && !isLoading"
        class="flex items-center justify-center h-32 text-center"
      >
        <div class="text-editor-fg opacity-60">
          <span class="codicon codicon-diff text-4xl block mb-2 opacity-40"></span>
          <p class="text-sm">Configure connections and table names to compare</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <div class="text-center">
          <div class="spinner mb-2"></div>
          <p class="text-sm text-editor-fg opacity-75">Comparing tables...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { vscode } from "@/utilities/vscode";

// Types
interface Connection {
  name: string;
  type: string;
  environment: string;
}

interface Schema {
  name: string;
}

interface Table {
  name: string;
}

interface ComparisonInfo {
  source: string;
  target: string;
}

interface SavedState {
  sourceConnection?: string;
  targetConnection?: string;
  sourceTableInput?: string;
  targetTableInput?: string;
  isInputsCollapsed?: boolean;
}

// State
const connections = ref<Connection[]>([]);

// Connection variables - always use explicit mode
const sourceConnection = ref("");
const targetConnection = ref("");
const sourceTableInput = ref("");
const targetTableInput = ref("");

const isLoading = ref(false);
const isLoadingSchemas = ref(false);
const isLoadingSourceTables = ref(false);
const isLoadingTargetTables = ref(false);
const results = ref("");
const error = ref("");
const comparisonInfo = ref<ComparisonInfo>({ source: "", target: "" });
const isInputsCollapsed = ref(false);

// Computed
const hasResults = computed(() => results.value.length > 0);
const canExecuteComparison = computed(() => {
  const hasSourceTable = sourceTableInput.value.trim().length > 0;
  const hasTargetTable = targetTableInput.value.trim().length > 0;
  return sourceConnection.value && targetConnection.value && hasSourceTable && hasTargetTable;
});

// Methods

const onSourceConnectionChange = (event: Event) => {
  if (isRestoringState) return;

  const target = event.target as HTMLSelectElement;
  sourceConnection.value = target.value;
  saveState();
};

const onTargetConnectionChange = (event: Event) => {
  if (isRestoringState) return;

  const target = event.target as HTMLSelectElement;
  targetConnection.value = target.value;
  saveState();
};

const onSourceTableInput = (event: Event) => {
  if (isRestoringState) return;

  const target = event.target as HTMLInputElement;
  sourceTableInput.value = target.value;
  saveState();
};

const onTargetTableInput = (event: Event) => {
  if (isRestoringState) return;

  const target = event.target as HTMLInputElement;
  targetTableInput.value = target.value;
  saveState();
};

const toggleInputsCollapse = () => {
  isInputsCollapsed.value = !isInputsCollapsed.value;
  saveState();
};

const saveState = () => {
  const state = {
    sourceConnection: sourceConnection.value,
    targetConnection: targetConnection.value,
    sourceTableInput: sourceTableInput.value,
    targetTableInput: targetTableInput.value,
    isInputsCollapsed: isInputsCollapsed.value || false,
    results: results.value || "",
    error: error.value || "",
    comparisonInfo: {
      source: comparisonInfo.value?.source || "",
      target: comparisonInfo.value?.target || "",
    },
  };

  try {
    // Ensure the state is serializable by JSON parsing/stringifying
    const serializedState = JSON.parse(JSON.stringify(state));
    vscode.postMessage({
      command: "saveState",
      payload: serializedState,
    });
  } catch (error) {
    console.error("Error serializing state:", error);
  }
};

// Store the pending state to restore after data loads
let pendingStateRestore: any = null;
let isRestoringState = false;

const restoreFromState = (savedState: any) => {
  if (!savedState) return;

  // Store the state to restore after connections load
  pendingStateRestore = savedState;

  // Restore non-dropdown state immediately
  isInputsCollapsed.value = savedState.isInputsCollapsed || false;
  results.value = savedState.results || "";
  error.value = savedState.error || "";
  comparisonInfo.value = savedState.comparisonInfo || { source: "", target: "" };

  // Restore form values
  if (savedState.sourceConnection) {
    sourceConnection.value = savedState.sourceConnection;
  }
  if (savedState.targetConnection) {
    targetConnection.value = savedState.targetConnection;
  }
  if (savedState.sourceTableInput) {
    sourceTableInput.value = savedState.sourceTableInput;
  }
  if (savedState.targetTableInput) {
    targetTableInput.value = savedState.targetTableInput;
  }

  // If we have connections loaded, sync dropdowns
  if (connections.value.length > 0) {
    setTimeout(() => {
      syncDropdownsWithState();
      pendingStateRestore = null;
    }, 100);
  }
};

const syncDropdownsWithState = () => {
  const dropdowns = document.querySelectorAll("vscode-dropdown");
  dropdowns.forEach((dropdown: any) => {
    const modelValue = dropdown.getAttribute("v-model");
    const options = dropdown.querySelectorAll("vscode-option");

    let targetValue = "";
    if (modelValue === "sourceConnection") {
      targetValue = sourceConnection.value;
    } else if (modelValue === "targetConnection") {
      targetValue = targetConnection.value;
    }

    if (targetValue) {
      dropdown.value = targetValue;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === targetValue) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    }
  });

  // Sync text inputs
  const textFields = document.querySelectorAll("vscode-text-field");
  textFields.forEach((field: any) => {
    const modelValue = field.getAttribute("v-model");
    if (modelValue === "sourceTableInput") {
      field.value = sourceTableInput.value;
    } else if (modelValue === "targetTableInput") {
      field.value = targetTableInput.value;
    }
  });

};

// Auto-save state periodically and when panel becomes hidden
let autoSaveInterval: NodeJS.Timeout | null = null;

const startAutoSave = () => {
  // Save state every 5 seconds
  autoSaveInterval = setInterval(() => {
    saveState();
  }, 5000);
};

const stopAutoSave = () => {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
};

const executeComparison = () => {
  if (!canExecuteComparison.value) return;

  isLoading.value = true;
  results.value = "";
  error.value = "";

  vscode.postMessage({
    command: "executeTableDiff",
    connectionMode: "explicit",
    sourceConnection: sourceConnection.value,
    targetConnection: targetConnection.value,
    sourceTable: sourceTableInput.value.trim(),
    targetTable: targetTableInput.value.trim(),
  });
};

const clearResults = () => {
  results.value = "";
  error.value = "";
  comparisonInfo.value = { source: "", target: "" };
};

const newComparison = () => {
  sourceConnection.value = "";
  targetConnection.value = "";
  sourceTableInput.value = "";
  targetTableInput.value = "";

  clearResults();
};

const copyResults = () => {
  if (results.value) {
    navigator.clipboard.writeText(results.value);
  }
};

// Message handling
const handleMessage = (event: MessageEvent) => {
  const message = event.data;

  switch (message.command) {
    case "updateConnections":
      connections.value = message.connections || [];
      // Restore state when connections are loaded
      if (pendingStateRestore && connections.value.length > 0) {
        setTimeout(() => {
          syncDropdownsWithState();
          pendingStateRestore = null;
          isRestoringState = false;
        }, 100);
      }
      break;

    case "showResults":
      isLoading.value = false;
      if (message.error) {
        error.value = message.error;
        results.value = "";
      } else {
        error.value = "";
        results.value = message.results || "";
        // Auto-collapse inputs when results are shown
        isInputsCollapsed.value = true;
      }
      comparisonInfo.value = {
        source: message.source || "",
        target: message.target || "",
      };
      break;

    case "clearResults":
      clearResults();
      break;

    case "restoreState":
      if (message.payload) {
        restoreFromState(message.payload);
      }
      break;

    case "init":
      // When panel becomes visible again, request state restoration
      vscode.postMessage({ command: "requestState" });
      startAutoSave(); // Start auto-saving when panel is visible
      break;

    case "panelHidden":
      // When panel becomes hidden, save state and stop auto-save
      saveState();
      stopAutoSave();
      break;
  }
};

onMounted(() => {
  vscode.postMessage({ command: "getConnections" });
  vscode.postMessage({ command: "requestState" });
  window.addEventListener("message", handleMessage);

  // Save state when component is about to be unmounted
  window.addEventListener("beforeunload", () => {
    saveState();
  });

  // Start auto-saving
  startAutoSave();
});
</script>

<style>
vscode-text-field {
  font-size: 12px;
  border: none !important;
  background: rebeccapurple !important;
}
</style>