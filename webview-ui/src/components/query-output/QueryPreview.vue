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
          <div class="flex items-center space-x-1">
            <div class="flex items-center overflow-x-auto max-w-lg">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="switchToTab(tab.id)"
                @dblclick="startEdit(tab)"
                @mouseover="hoveredTab = tab.id"
                @mouseleave="hoveredTab = ''"
                class="px-2 py-1 text-3xs rounded transition-colors uppercase flex items-center whitespace-nowrap"
                :class="{
                  'bg-input-background text-editor-fg': activeTab === tab.id,
                  'text-editor-fg hover:bg-editorWidget-bg': activeTab !== tab.id,
                }"
              >
                <div v-if="editingState?.tabId === tab.id" class="flex items-center">
                  <input
                    v-model="editingState.currentLabel"
                    @keyup.enter="saveEdit"
                    @keyup.escape="cancelEdit"
                    @blur="saveEdit"
                    class="bg-transparent text-current outline-none border-none text-3xs w-auto p-0 m-0"
                    v-focus
                    @click.stop
                  />
                </div>
                <div v-else class="flex items-center">
                  <TableCellsIcon class="h-4 w-4 mr-1" />
                  <span>{{ tab.label }}</span>
                  <span
                    v-if="tab.id !== 'output' && (hoveredTab === tab.id || activeTab === tab.id)"
                    @click.stop="closeTab(tab.id)"
                    class="flex items-center hover:bg-editorWidget-bg ml-1"
                  >
                    <span class="text-3xs codicon codicon-close"></span>
                  </span>
                </div>
              </button>
            </div>
            <vscode-button title="Add Tab" appearance="icon" @click="addTab">
              <span class="codicon codicon-add"></span>
            </vscode-button>
          </div>
        </div>

        <div class="relative flex items-center gap-1 mr-2">
          <!-- Search Component -->
           <div>
            Selected Environment: {{ currentEnvironment }}
           </div>
          <QuerySearch
            :visible="showSearchInput"
            :total-count="currentTab?.totalRowCount || 0"
            :filtered-count="currentTab?.filteredRowCount || 0"
            @update:visible="showSearchInput = $event"
            @update:searchTerm="updateSearchTerm"
            @close="showSearchInput = false"
          />
          <vscode-button
            v-if="!showSearchInput"
            title="Search (Ctrl+F)"
            appearance="icon"
            @click="toggleSearchInput"
          >
            <span class="codicon codicon-search text-editor-fg"></span>
          </vscode-button>
          <vscode-button title="Clear Results" appearance="icon" @click="clearTabResults">
            <span class="codicon codicon-clear-all text-editor-fg"></span>
          </vscode-button>
        </div>
      </div>
    </div>
    <!-- Query Output Tab -->
    <div v-if="activeTab" class="relative">
      <div
        v-if="currentTab?.isLoading"
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
        v-if="currentTab?.error"
        class="my-2 border border-commandCenter-border rounded text-errorForeground bg-editorWidget-bg p-2"
      >
        <div class="text-sm font-medium mb-2 pb-1 border-b border-commandCenter-border">
          Query Execution Failed
        </div>
        <div
          class="text-xs font-mono text-red-300 bg-editorWidget-bg whitespace-pre-wrap break-all leading-relaxed"
        >
          {{ currentTab.error }}
        </div>
      </div>
      <div
        v-if="!currentTab?.parsedOutput && !currentTab?.error && !currentTab?.isLoading"
        class="flex items-center justify-center h-[100vh] w-full"
      >
        <div class="flex items-center space-x-2 text-sm text-editor-fg">
          <vscode-button appearance="icon" @click="runQuery">
            <span class="codicon codicon-play text-editor-fg" style="font-size: 1.2em"></span>
          </vscode-button>
          <span class="opacity-50">Run query preview</span>
          <div class="flex items-center">
            <span class="keybinding">{{ modifierKey }}</span>
            <span class="keybinding"> Enter </span>
          </div>
        </div>
      </div>
      <!-- Results Table -->
      <div v-if="currentTab?.parsedOutput && !currentTab?.error" class="overflow-auto h-[calc(100vh-33px)] w-full">
        <table
          class="w-[calc(100vw-100px)] bg-editor-bg font-mono font-normal text-xs border-t-0 border-collapse"
        >
          <thead class="bg-editor-bg border-y-0">
            <tr>
              <th
                class="sticky top-0 p-1 text-left font-semibold text-editor-fg bg-editor-bg border-x border-commandCenter-border before:absolute before:bottom-0 before:left-0 before:w-full before:border-b before:border-commandCenter-border"
              ></th>
              <th
                v-for="column in currentTab.parsedOutput.columns"
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
              v-for="(row, index) in currentTab.filteredRows"
              :key="index"
              class="hover:bg-menu-hoverBackground transition-colors duration-150"
            >
              <td
                class="p-1 opacity-50 text-editor-fg font-mono border border-commandCenter-border"
              >
                {{ index + 1 }}
              </td>
              <td
                v-for="(value, colIndex) in row"
                :key="colIndex"
                class="p-1 text-editor-fg font-mono border border-commandCenter-border relative max-w-40"
                :class="{ 'cursor-pointer': cellHasOverflow(value) }"
              >
                <!-- Cell with in-place expansion -->
                <div class="flex flex-col">
                  <!-- Content container with conditional height -->
                  <div
                    :class="{
                      'max-h-6 overflow-hidden': !isExpanded(index, colIndex),
                      'max-h-12 overflow-y-auto': isExpanded(index, colIndex),
                    }"
                    class="transition-all duration-75 pr-6"
                  >
                    <!-- Cell content with word-wrapping when expanded -->
                    <div
                      :class="{
                        'whitespace-nowrap overflow-hidden text-ellipsis': !isExpanded(
                          index,
                          colIndex
                        ),
                        'whitespace-pre-wrap break-words': isExpanded(index, colIndex),
                      }"
                      v-html="highlightMatch(value, currentTab.searchInput)"
                    ></div>
                  </div>
                  <!-- (expand/collapse) -->
                  <div class="absolute right-2 top-0 flex items-center">
                    <vscode-button
                      appearance="icon"
                      v-if="cellHasOverflow(value)"
                      @click.stop="toggleCellExpansion(index, colIndex)"
                      class="text-editor-fg opacity-70 hover:opacity-100"
                      :title="isExpanded(index, colIndex) ? 'Collapse' : 'Expand'"
                    >
                      <span
                        class="codicon text-xs"
                        :class="
                          isExpanded(index, colIndex)
                            ? 'codicon-chevron-down'
                            : 'codicon-chevron-right'
                        "
                      ></span>
                    </vscode-button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { TableCellsIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";
import QuerySearch from "../ui/query-preview/QuerySearch.vue";
import type { EditingState, TabData } from "@/types";

const props = defineProps<{
  output: any;
  error: any;
  isLoading: boolean;
  environment: string;
}>();

const currentEnvironment = computed(() => props.environment || "");

const limit = ref(100);
const showSearchInput = ref(false);
const hoveredTab = ref("");

// State for expanded cells
const expandedCells = ref(new Set<string>());

const tabs = ref<TabData[]>([
  {
    id: "output",
    label: "Output",
    parsedOutput: undefined,
    error: null,
    isLoading: false,
    searchInput: "",
    filteredRows: [],
    totalRowCount: 0,
    filteredRowCount: 0,
    isEditing: false,
  },
]);

const activeTab = ref<string>("output");
const tabCounter = ref(1);

// Get current active tab
const currentTab = computed(() => {
  return tabs.value.find((tab) => tab.id === activeTab.value);
});

// Handle tab switching
const switchToTab = (tabId: string) => {
  // Reset cell expansions when switching tabs
  expandedCells.value.clear();
  activeTab.value = tabId;
};

// Add a new tab
const addTab = () => {
  const newTabId = `tab-${tabCounter.value}`;
  const newTabLabel = `Tab ${tabCounter.value}`;
  
  tabs.value.push({
    id: newTabId,
    label: newTabLabel,
    parsedOutput: undefined,
    error: null,
    isLoading: false,
    searchInput: "",
    filteredRows: [],
    totalRowCount: 0,
    filteredRowCount: 0,
    isEditing: false,
  });
  
  tabCounter.value++;
  activeTab.value = newTabId;
};

// Close a tab
const closeTab = (tabId: string) => {
  // Reset cell expansions
  expandedCells.value.clear();
  const tabIndex = tabs.value.findIndex((tab) => tab.id === tabId);

  if (tabIndex !== -1) {
    tabs.value.splice(tabIndex, 1);

    // Clear editing state if closing edited tab
    if (editingState.value?.tabId === tabId) {
      cancelEdit();
    }
    // If we closed the active tab, switch to the first available tab
    if (activeTab.value === tabId) {
      activeTab.value = tabs.value[0]?.id || "";
    }
  }
};

// Clear results for the current tab
const clearTabResults = () => {
  // Reset cell expansions
  expandedCells.value.clear();
  if (currentTab.value) {
    currentTab.value.parsedOutput = undefined;
    currentTab.value.error = null;
    currentTab.value.filteredRows = [];
    currentTab.value.totalRowCount = 0;
    currentTab.value.filteredRowCount = 0;
  }
  
  vscode.postMessage({ command: "bruin.clearQueryOutput" });
};

// Check if a cell has overflow (needs expand button)
const cellHasOverflow = (value) => {
  if (value === null || value === undefined) return false;
  const stringValue = String(value);
  // Show expand button if content is longer than 30 chars
  return stringValue.length > 30;
};

// Create a unique key for tracking expanded cells
const getCellKey = (rowIndex, colIndex) => {
  return `${activeTab.value}-${rowIndex}-${colIndex}`;
};

// Check if a specific cell is expanded
const isExpanded = (rowIndex, colIndex) => {
  return expandedCells.value.has(getCellKey(rowIndex, colIndex));
};

// Toggle cell expansion
const toggleCellExpansion = (rowIndex, colIndex) => {
  const cellKey = getCellKey(rowIndex, colIndex);
  if (expandedCells.value.has(cellKey)) {
    expandedCells.value.delete(cellKey);
  } else {
    expandedCells.value.add(cellKey);
  }
};

// Parse output for the current tab
watch(() => props.output, (newOutput) => {
  if (!currentTab.value) return;
  
  try {
    let parsedData;
    if (typeof newOutput === "string") {
      parsedData = JSON.parse(newOutput);
    } else if (newOutput?.data?.status === "success") {
      parsedData = JSON.parse(newOutput.data.message);
    } else {
      parsedData = newOutput;
    }
    
    if (parsedData) {
      currentTab.value.parsedOutput = parsedData;
      currentTab.value.totalRowCount = parsedData.rows?.length || 0;
      updateFilteredRows();
    }
  } catch (e) {
    console.error("Error parsing output:", e);
  }
});

// Update error state for the current tab
watch(() => props.error, (newError) => {
  if (!currentTab.value) return;
  
  if (!newError) {
    currentTab.value.error = null;
    return;
  }
  
  if (typeof newError === "string") {
    try {
      const parsed = JSON.parse(newError);
      currentTab.value.error = parsed.error || parsed;
    } catch (e) {
      currentTab.value.error = newError;
    }
  } else {
    currentTab.value.error = newError?.error || newError || "Something went wrong";
  }
});

// Update loading state for the current tab
watch(() => props.isLoading, (newIsLoading) => {
  if (currentTab.value) {
    currentTab.value.isLoading = newIsLoading;
  }
});

// Update search term and filtered rows
const updateSearchTerm = (term: string) => {
  // Reset cell expansions when searching
  expandedCells.value.clear();
  if (currentTab.value) {
    currentTab.value.searchInput = term;
    updateFilteredRows();
  }
};

// Update filtered rows based on search input
const updateFilteredRows = () => {
  if (!currentTab.value || !currentTab.value.parsedOutput || !currentTab.value.parsedOutput.rows) {
    if (currentTab.value) {
      currentTab.value.filteredRows = [];
      currentTab.value.filteredRowCount = 0;
    }
    return;
  }
  
  const searchTerm = currentTab.value.searchInput.trim().toLowerCase();
  
  if (!searchTerm) {
    currentTab.value.filteredRows = currentTab.value.parsedOutput.rows;
    currentTab.value.filteredRowCount = currentTab.value.totalRowCount;
    return;
  }
  
  const filtered = currentTab.value.parsedOutput.rows.filter((row) => {
    return row.some((cell) => cell !== null && String(cell).toLowerCase().includes(searchTerm));
  });
  
  currentTab.value.filteredRows = filtered;
  currentTab.value.filteredRowCount = filtered.length;
};

// Run query and store results in the current tab
const runQuery = () => {
  // Reset cell expansions when running a new query
  expandedCells.value.clear();
  if (limit.value > 1000 || limit.value < 1) {
    limit.value = 1000;
  }
  const selectedEnvironment = currentEnvironment.value;
  vscode.postMessage({
    command: "bruin.getQueryOutput",
    payload: { environment: selectedEnvironment, limit: limit.value.toString(), query: "" },
  });
};

// Toggle search input visibility
const toggleSearchInput = () => {
  showSearchInput.value = !showSearchInput.value;
};

// Highlight matching text in search results
const highlightMatch = (value, searchTerm) => {
  if (!searchTerm || !searchTerm.trim() || value === null) {
    return String(value);
  }
  
  const stringValue = String(value);
  
  if (!stringValue.toLowerCase().includes(searchTerm.toLowerCase())) {
    return stringValue;
  }
  
  // Use regex with 'i' flag for case-insensitive matching
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
  return stringValue.replace(regex, '<span class="bg-yellow-500 text-black">$1</span>');
};

// Helper function to escape regex special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// Handle keyboard shortcuts
const handleKeyDown = (event) => {
  // Run query with Cmd+Enter or Ctrl+Enter
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    runQuery();
  }
  
  // Toggle search with Cmd+F or Ctrl+F
  if ((event.ctrlKey || event.metaKey) && event.key === "f") {
    event.preventDefault();
    toggleSearchInput();
  }

  // Close all expanded cells with Escape
  if (event.key === "Escape" && expandedCells.value.size > 0) {
    expandedCells.value.clear();
    event.preventDefault();
  }
};

const editingState = ref<EditingState | null>(null);

const startEdit = (tab: TabData) => {
  editingState.value = {
    tabId: tab.id,
    originalLabel: tab.label,
    currentLabel: tab.label,
  };
};

const saveEdit = () => {
  if (!editingState.value) return;

  const tab = tabs.value.find((t) => t.id === editingState.value!.tabId);
  if (tab) {
    tab.label = editingState.value.currentLabel.trim() || editingState.value.originalLabel;
  }
  editingState.value = null;
};

const cancelEdit = () => {
  editingState.value = null;
};

// Add focus directive
const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus(),
};

// Lifecycle hooks
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  
  // Initialize the Output tab with current data
  if (props.output && tabs.value[0]) {
    try {
      let parsedData;
      if (typeof props.output === "string") {
        parsedData = JSON.parse(props.output);
      } else if (props.output?.data?.status === "success") {
        parsedData = JSON.parse(props.output.data.message);
      } else {
        parsedData = props.output;
      }
      
      if (parsedData) {
        tabs.value[0].parsedOutput = parsedData;
        tabs.value[0].totalRowCount = parsedData.rows?.length || 0;
        tabs.value[0].filteredRows = parsedData.rows || [];
        tabs.value[0].filteredRowCount = tabs.value[0].totalRowCount;
      }
    } catch (e) {
      console.error("Error initializing tab with data:", e);
    }
  }
  
  if (props.error && tabs.value[0]) {
    if (typeof props.error === "string") {
      try {
        const parsed = JSON.parse(props.error);
        tabs.value[0].error = parsed.error || parsed;
      } catch (e) {
        tabs.value[0].error = props.error;
      }
    } else {
      tabs.value[0].error = props.error?.error || props.error || "Something went wrong";
    }
  }
  
  if (tabs.value[0]) {
    tabs.value[0].isLoading = props.isLoading;
  }
});
const modifierKey = ref('⌘'); // Default to Mac symbol

onMounted(() => {
  // Detect if running on Windows or macOS
  const isMac = navigator.platform.toUpperCase().startsWith('MAC');  
  // Update the modifier key symbol based on platform
  modifierKey.value = isMac ? '⌘' : 'Ctrl';
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("message", postMessage);
});

watch(
  () => props.environment,
  (newEnv) => {
    console.log("Environment updated:", newEnv);
  },
  { immediate: true , deep: true} 
);
watch(currentEnvironment, (newVal) => {
  console.log("Computed environment updated:", newVal);
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