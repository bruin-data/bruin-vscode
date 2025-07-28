<template>
  <div class="flex flex-col w-full h-full">
    <div
      class="flex items-center justify-between border-b border-t border-panel-border bg-sideBarSectionHeader-bg"
    >
      <div class="flex items-center w-full justify-between h-8">
        <div class="flex items-center gap-1 ml-2">
          <div class="flex items-center">
            <vscode-button 
              v-if="!currentTab?.isLoading"
              title="Run Query" 
              appearance="icon" 
              @click="runQuery"
            >
              <span class="codicon codicon-play" style="font-size: 1.2em"></span>
            </vscode-button>
            <vscode-button
              v-if="currentTab?.isLoading"
              title="Cancel Query"
              appearance="icon"
              @click="cancelQuery"
            >
              <span class="codicon codicon-stop-circle text-red-500"></span>
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
            <div class="flex items-center">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="switchToTab(tab.id)"
                @dblclick="startEdit(tab)"
                @mouseover="hoveredTab = tab.id"
                @mouseleave="hoveredTab = ''"
                class="px-2 py-1 text-3xs rounded transition-colors uppercase flex items-center whitespace-nowrap relative"
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
                    @click.stop="closeTab(tab.id)"
                    class="flex items-center hover:bg-editorWidget-bg ml-1 w-4 h-4 justify-center transition-opacity duration-150"
                    :class="{
                      'opacity-0': hoveredTab !== tab.id && activeTab !== tab.id,
                      'opacity-100': hoveredTab === tab.id || activeTab === tab.id,
                    }"
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
          <div class="flex items-center space-x-2">
            <span class="text-2xs text-editor-fg opacity-65">Running in:</span>
            <vscode-badge :class="badgeClass" class="truncate">
              {{ currentEnvironment }}
            </vscode-badge>
            <vscode-badge
              v-if="currentTab?.parsedOutput?.connectionName"
              :class="badgeClass"
              class="truncate"
            >
              {{ currentTab?.parsedOutput.connectionName }}
            </vscode-badge>
            <span class="text-2xs text-editor-fg opacity-65">Timeout:</span>
            <vscode-badge class="default-badge">
              {{ queryTimeout }}s
            </vscode-badge>
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
          <vscode-button
            title="Show Query"
            appearance="icon"
            @click="toggleQueryVisibility"
            :class="{ 'is-active': currentTab?.showQuery }"
          >
            <span class="codicon codicon-code"></span>
          </vscode-button>
          <vscode-button title="Clear Results" appearance="icon" @click="clearTabResults">
            <span class="codicon codicon-clear-all text-editor-fg"></span>
          </vscode-button>
          <vscode-button title="Export Results" appearance="icon" @click="exportTabResults">
            <span
              v-if="!isExportLoading"
              class="codicon codicon-desktop-download text-editor-fg"
            ></span>
            <span v-else class="spinner"></span>
          </vscode-button>
          <vscode-button title="Reset Panel" appearance="icon" @click="resetPanel">
            <span class="codicon codicon-refresh text-editor-fg"></span>
          </vscode-button>
        </div>
      </div>
      <div
        v-if="showNotification"
        :class="[
          'fixed bottom-4 right-4 z-50 max-w-[80%] rounded-md shadow-md overflow-hidden',
          props.exportOutput
            ? 'bg-notification-bg border border-commandCenter-border hover:bg-commandCenter-bg'
            : '',
          props.exportError
            ? 'bg-notification-bg border border-commandCenter-border hover:bg-commandCenter-bg'
            : '',
        ]"
      >
        <div class="flex items-center px-2 py-1">
          <span
            class="codicon mr-2"
            :class="[
              props.exportOutput ? 'codicon-pass-filled text-[--vscode-testing-iconPassed]' : '',
              props.exportError ? 'codicon-error text-[--vscode-testing-iconFailed]' : '',
            ]"
          ></span>
          <div class="flex-1 p-2 text-sm text-notification-fg">
            {{ props.exportOutput || props.exportError }}
          </div>
          <vscode-button
            appearance="icon"
            class="ml-2 text-inherit opacity-70 hover:opacity-100 transition-opacity duration-200"
            @click="dismissNotification"
          >
            <span class="codicon codicon-close"></span>
          </vscode-button>
        </div>
      </div>
    </div>
    <!-- Query Output Tab -->
    <div v-if="activeTab" class="relative h-[calc(100vh-33px)]">
      <template v-for="tab in tabs" :key="tab.id">
        <div v-show="activeTab === tab.id" class="tab-content h-full">
          <!-- Tab-specific loading overlay - Fixed positioning to always be centered -->
          <div
            v-if="activeTab === tab.id && tab.isLoading"
            class="absolute inset-0 flex items-center justify-center bg-editor-bg bg-opacity-50 z-50"
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
          <!-- Display the executed query -->
          <div
            v-if="currentTab?.showQuery && currentTab?.parsedOutput?.query"
            class="query-panel bg-editorWidget-background border-b border-panel-border"
          >
            <div class="flex items-center justify-end gap-1">
              <vscode-button
                v-if="!copied"
                appearance="icon"
                title="Copy Query"
                @click="copyQuery(currentTab.parsedOutput.query)"
                class="text-xs hover:bg-panel-border"
              >
                <span class="codicon codicon-copy text-xs"></span>
              </vscode-button>
              <span
                v-else
                class="text-xs text-editor-fg opacity-70 hover:opacity-100 transition-opacity duration-200"
                >Copied!</span
              >
              <vscode-button
                appearance="icon"
                title="Close"
                @click="toggleQueryVisibility"
                class="text-xs hover:bg-panel-border"
              >
                <span class="codicon codicon-close text-xs"></span>
              </vscode-button>
            </div>
            <pre
              class="query-content px-3 pb-1 font-mono text-3xs leading-tight overflow-auto max-h-[150px]"
              >{{ formatQuery(currentTab.parsedOutput.query) }}</pre
            >
          </div>
          <div
            v-if="!currentTab?.parsedOutput && !currentTab?.error && !currentTab?.isLoading"
            class="flex items-center justify-center h-full w-full"
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
          <div
            v-if="currentTab?.parsedOutput && !currentTab?.error"
            class="overflow-auto h-full w-full"
          >
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
                  v-for="(row, index) in paginatedRows"
                  :key="(currentPage - 1) * pageSize + index"
                  class="hover:bg-menu-hoverBackground transition-colors duration-150"
                >
                  <td
                    class="p-1 opacity-50 text-editor-fg font-mono border border-commandCenter-border"
                  >
                    {{ (currentPage - 1) * pageSize + index + 1 }}
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
                            'uppercase text-descriptionForeground opacity-60 italic': formatCellValue(value).isNull
                          }"
                          v-html="highlightMatch(formatCellValue(value).text, currentTab.searchInput)"
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
            <div v-if="totalPages > 1" class="flex justify-center items-center my-2 gap-2">
              <button @click="currentPage = 1" :disabled="currentPage === 1" title="First Page">
                <span class="codicon codicon-chevron-double-left"></span>
              </button>
              <button @click="currentPage--" :disabled="currentPage === 1" title="Previous Page">
                <span class="codicon codicon-chevron-left"></span>
              </button>
              <span>Page {{ currentPage }} of {{ totalPages }}</span>
              <button @click="currentPage++" :disabled="currentPage === totalPages" title="Next Page">
                <span class="codicon codicon-chevron-right"></span>
              </button>
              <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" title="Last Page">
                <span class="codicon codicon-chevron-double-right"></span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  watch,
  ref,
  watchEffect,
  nextTick,
  shallowRef,
  triggerRef,
  reactive,
} from "vue";
import { TableCellsIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";
import QuerySearch from "../ui/query-preview/QuerySearch.vue";
import type { EditingState, TabData } from "@/types";

const props = defineProps<{
  output: any;
  error: any;
  isLoading: boolean;
  environment: string;
  connectionName: string;
  isExportLoading: boolean;
  exportOutput: any;
  exportError: any;
}>();

const currentEnvironment = ref<string>(props.environment);
const modifierKey = ref("⌘"); // Default to Mac symbol
const currentConnectionName = ref("");
const limit = ref(100);
const showSearchInput = ref(false);
const hoveredTab = ref("");
const copied = ref(false);
const queryTimeout = ref(60); // Default timeout in seconds
// State for expanded cells
const expandedCells = ref(new Set<string>());

const defaultTab = {
  id: "tab-1",
  label: "Tab 1",
  parsedOutput: undefined,
  error: null,
  isLoading: false,
  searchInput: "",
  limit: 100,
  filteredRows: [],
  totalRowCount: 0,
  filteredRowCount: 0,
  isEditing: false,
  environment: "",
  connectionName: props.connectionName,
  showQuery: false,
};
const tabs = shallowRef<TabData[]>([defaultTab]);
const copyQuery = (query: string) => {
  navigator.clipboard.writeText(query);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};

const toggleQueryVisibility = () => {
  if (!currentTab.value) return;

  const newTabs = tabs.value.map((tab) => {
    if (tab.id === currentTab.value?.id) {
      return { ...tab, showQuery: !tab.showQuery };
    }
    return tab;
  });

  tabs.value = newTabs;
  triggerRef(tabs);
  nextTick(() => {
    if (currentTab.value?.showQuery) {
      const panel = document.querySelector(".query-content");
      panel?.scrollTo(0, 0);
    }
  });
};

const activeTab = ref<string>("tab-1");
const tabCounter = ref(2); // Start from 2 since we already have "Tab 1"
const formatQuery = (query: string) => {
  const lines = query.split("\n");
  return lines.map((line, index) => (index === 0 ? line.trimStart() : line)).join("\n");
};
// Get current active tab
const currentTab = computed(() => {
  vscode.postMessage({
    command: "bruin.setActiveTabId",
    payload: { tabId: activeTab.value },
  });

  return tabs.value.find((tab) => tab.id === activeTab.value);
});

// Handle tab switching
const switchToTab = async (tabId: string) => {
  // Reset cell expansions when switching tabs
  await nextTick();
  expandedCells.value.clear();
  // Set the active tab
  activeTab.value = tabId;

  nextTick(() => {
    triggerRef(tabs);
  });
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
    limit: 100,
    isLoading: false,
    searchInput: "",
    filteredRows: [],
    totalRowCount: 0,
    filteredRowCount: 0,
    isEditing: false,
    environment: currentEnvironment.value,
    connectionName: currentConnectionName.value,
    showQuery: false,
  });

  tabCounter.value++;
  activeTab.value = newTabId;
  saveState();
};

// Reset the entire panel
const resetPanel = () => {
  // Clear all tabs except the first one
  tabs.value = [defaultTab];

  // Reset tab counter
  tabCounter.value = 2;

  // Set active tab to the first tab
  activeTab.value = "tab-1";

  // Reset expanded cells
  expandedCells.value.clear();

  // Hide search input
  showSearchInput.value = false;
  // Clear state from storage
  vscode.postMessage({
    command: "bruin.resetState",
  });

  // Force UI update
  nextTick(() => {
    triggerRef(tabs);
  });
};

const saveState = () => {
  // Sanitize data before sending
  const sanitizedTabs = tabs.value.map((tab) => ({
    id: tab.id,
    label: tab.label,
    parsedOutput: tab.parsedOutput ? JSON.parse(JSON.stringify(tab.parsedOutput)) : null,
    error: tab.error
      ? {
          message: tab.error,
        }
      : null,
    searchInput: tab.searchInput,
    totalRowCount: tab.totalRowCount,
    filteredRowCount: tab.filteredRowCount,
    environment: currentEnvironment.value,
    showQuery: tab.showQuery,
    connectionName: tab.connectionName,
    tabCounter: tabCounter.value,
  }));

  const state = {
    limit: limit.value,
    tabs: sanitizedTabs,
    activeTab: activeTab.value,
    expandedCells: Array.from(expandedCells.value),
    environment: currentEnvironment.value,
    connectionName: currentConnectionName.value,
    showSearchInput: showSearchInput.value,
    tabCounter: tabCounter.value,
  };

  try {
    // Verify serializability
    JSON.parse(JSON.stringify(state));
    vscode.postMessage({
      command: "bruin.saveState",
      payload: state,
    });
  } catch (e) {
    console.error("State serialization failed:", e);
  }
};

// Watch for state changes with debounce
let saveTimeout: NodeJS.Timeout;
watchEffect(() => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveState, 500);
});

const reviveParsedOutput = (parsedOutput: any) => {
  try {
    return {
      ...parsedOutput,
      rows: parsedOutput.rows || [],
      columns: parsedOutput.columns || [],
      connectionName: parsedOutput.connectionName || parsedOutput.meta?.connectionName || null,
    };
  } catch (e) {
    console.error("Error reviving parsed output:", e);
    return undefined;
  }
};
// Handle state restoration
window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.command === "bruin.restoreState") {
    const state = message.payload;
    if (state) {
      if (state.tabCounter) {
        tabCounter.value = state.tabCounter;
      }
      if (state.environment) {
        currentEnvironment.value = state.environment;
      }

      // Revive complex objects
      tabs.value = (state.tabs || []).map((t) => ({
        ...t,
        parsedOutput: t.parsedOutput ? reviveParsedOutput(t.parsedOutput) : undefined,
        connectionName: reviveParsedOutput(t.parsedOutput)?.connectionName || t.connectionName,
        showQuery: !!t.showQuery,
        error: t.error ? new Error(t.error.message) : null,
        isLoading: false,
        isEditing: false,
        filteredRows: t.parsedOutput?.rows || [],
      }));

      currentConnectionName.value =
        tabs.value.find((t) => t.id === state.activeTab)?.connectionName || state.connectionName;
      activeTab.value = state.activeTab || "tab-1";
      expandedCells.value = new Set(state.expandedCells || []);
      showSearchInput.value = state.showSearchInput || false;
    }
  } else if (message.command === "bruin.timeoutResponse") {
    if (message.payload && typeof message.payload.timeout === "number") {
      queryTimeout.value = message.payload.timeout;
    }
  } else if (message.command === "bruin.executePreviewQuery") {
    // Handle preview intellisense query execution with current limit
    const tabId = message.payload.tabId || activeTab.value;
    const selectedEnvironment = currentEnvironment.value;
    const extractedQuery = message.payload.extractedQuery || "";
    
    // Send query execution request with current limit from UI
    vscode.postMessage({
      command: "bruin.getQueryOutput",
      payload: {
        environment: selectedEnvironment,
        limit: limit.value.toString(),
        query: extractedQuery,
        tabId: tabId,
      },
    });
  }

  // Handle tab-specific query results
  if (message.command === "query-output-message") {
    // Extract the tab ID from the message if available
    const tabId = message.payload?.tabId;
    if (!tabId) {
      console.error("Received query output message without tabId");
      return;
    }

    // Find the specific tab to update
    const tabToUpdate = tabs.value.find((tab) => tab.id === tabId);

    if (tabToUpdate) {
      if (message.payload.status === "loading") {
        // Update loading state for this specific tab only
        tabToUpdate.isLoading = message.payload.message;

        // Force UI update immediately
        triggerRef(tabs);
      } else if (message.payload.status === "success") {
        try {
          // Process successful response for this specific tab
          const outputData =
            typeof message.payload.message === "string"
              ? JSON.parse(message.payload.message)
              : message.payload.message;

          tabToUpdate.parsedOutput = outputData;
          tabToUpdate.totalRowCount = outputData.rows?.length || 0;
          tabToUpdate.filteredRows = outputData.rows || [];
          tabToUpdate.error = null;
          tabToUpdate.isLoading = false; // Always ensure loading is set to false

          if (outputData.connectionName) {
            tabToUpdate.connectionName = outputData.connectionName;
          }
        } catch (e) {
          console.error("Error processing tab output:", e);
          tabToUpdate.error = "Error processing query results: " + (e as Error).message;
          tabToUpdate.isLoading = false; // Always ensure loading is set to false
        }
      } else if (message.payload.status === "error") {
        // Process error for this specific tab
        tabToUpdate.error = message.payload.message;
        tabToUpdate.isLoading = false; // Always ensure loading is set to false
      }

      // Force a UI update for this tab
      triggerRef(tabs);
    }
  }
  if (message.command === "query-output-clear" && message.payload?.status === "success") {
    const tabId = message.payload.message?.tabId;
    // Find the specific tab to clear if tabId is provided
    if (tabId) {
      const tabToClear = tabs.value.find((tab) => tab.id === tabId);
      if (tabToClear) {
        tabToClear.parsedOutput = undefined;
        tabToClear.error = null;
        tabToClear.filteredRows = [];
        tabToClear.totalRowCount = 0;
        tabToClear.filteredRowCount = 0;
      }
    } else {
      // If no tabId specified, clear the current tab
      if (currentTab.value) {
        currentTab.value.parsedOutput = undefined;
        currentTab.value.error = null;
        currentTab.value.filteredRows = [];
        currentTab.value.totalRowCount = 0;
        currentTab.value.filteredRowCount = 0;
      }
    }
    // Force a UI update
    nextTick(() => {
      if (tabs.value) {
        triggerRef(tabs);
      }
    });
  }
});

// Close a tab
const closeTab = (tabId: string) => {
  // Reset cell expansions
  expandedCells.value.clear();
  const tabIndex = tabs.value.findIndex((tab) => tab.id === tabId);

  if (tabIndex !== -1) {
    // Remove tab first
    tabs.value.splice(tabIndex, 1);

    // If no tabs left, create a new default tab
    if (tabs.value.length === 0) {
      const newDefaultTab = {
        id: "tab-1",
        label: "Tab 1",
        parsedOutput: undefined,
        error: null,
        isLoading: false,
        searchInput: "",
        limit: 100,
        filteredRows: [],
        totalRowCount: 0,
        filteredRowCount: 0,
        isEditing: false,
        environment: currentEnvironment.value,
        connectionName: props.connectionName,
        showQuery: false,
      };
      tabs.value.push(newDefaultTab);
      activeTab.value = "tab-1";
      tabCounter.value = 2; // Reset counter
    } else {
      // If we're closing the active tab, determine which tab to activate next
      if (activeTab.value === tabId) {
        // If there's a tab to the right, use that
        if (tabIndex < tabs.value.length) {
          activeTab.value = tabs.value[tabIndex].id;
        }
        // Otherwise use the tab to the left (previous tab)
        else if (tabIndex > 0) {
          activeTab.value = tabs.value[tabIndex - 1].id;
        }
        // Otherwise use the first available tab
        else {
          activeTab.value = tabs.value[0].id;
        }
      }

      // Reset the counter when only tab-1 is left
      if (tabs.value.length === 1 && tabs.value[0].id === "tab-1") {
        tabCounter.value = 2;
      }
    }

    // Clear editing state if closing edited tab
    if (editingState.value?.tabId === tabId) {
      cancelEdit();
    }

    // Force Vue to update immediately
    nextTick(() => {
      triggerRef(tabs);
    });
  }

  saveState();
};

// Clear results for the current tab
const clearTabResults = () => {
  // Reset cell expansions
  expandedCells.value.clear();

  // Immediately clear local state
  if (currentTab.value) {
    // Create a completely new object instead of modifying properties
    const index = tabs.value.findIndex((tab) => tab.id === currentTab.value?.id);
    if (index !== -1) {
      const newTab = {
        ...tabs.value[index],
        parsedOutput: undefined,
        error: null,
        filteredRows: [],
        totalRowCount: 0,
        filteredRowCount: 0,
      };
      tabs.value.splice(index, 1, newTab);
    }
  }
  // Force a UI update
  nextTick(() => {
    triggerRef(tabs);
  });
  vscode.postMessage({
    command: "bruin.clearQueryOutput",
    payload: { tabId: activeTab.value },
  });

  saveState();
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

// Modified to only process when the tab matches
watch(
  () => props.output,
  (newOutput) => {
    if (!newOutput) return;
    // We don't need to process this here anymore since we handle it in the message handler
  }
);

// Update error state for the current tab
watch(
  () => props.error,
  (newError) => {
    if (!newError) return;
    // We don't need to process this here anymore since we handle it in the message handler
  }
);

// Update environment when prop changes
watch(
  () => props.environment,
  (newEnvironment) => {
    if (newEnvironment && newEnvironment !== currentEnvironment.value) {
      currentEnvironment.value = newEnvironment;
      
      // Update the environment for all tabs
      const newTabs = tabs.value.map(tab => ({
        ...tab,
        environment: newEnvironment
      }));
      tabs.value.splice(0, tabs.value.length, ...newTabs);
      triggerRef(tabs);
    }
  },
  { immediate: true }
);

// Update loading state for the current tab - we don't use this anymore
watch(
  () => props.isLoading,
  (newIsLoading) => {
    // We don't need this anymore since loading is tab-specific
  }
);

const updateSearchTerm = (term: string) => {
  // Reset cell expansions when searching
  expandedCells.value.clear();
  if (currentTab.value) {
    currentTab.value.searchInput = term;
    // Force immediate update of filtered rows with the new term
    nextTick(() => {
      updateFilteredRows();
      // Force component update after updating filtered rows
      triggerRef(tabs);
    });
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
    // When search term is empty, immediately restore all rows
    currentTab.value.filteredRows = currentTab.value.parsedOutput.rows;
    currentTab.value.filteredRowCount = currentTab.value.totalRowCount;
    return;
  }

  // Don't use requestAnimationFrame for filtering to ensure immediate updates
  const filtered = currentTab.value.parsedOutput.rows.filter((row) => {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i];
      if (cell !== null && String(cell).toLowerCase().includes(searchTerm)) {
        return true;
      }
    }
    return false;
  });

  if (currentTab.value) {
    currentTab.value.filteredRows = filtered;
    currentTab.value.filteredRowCount = filtered.length;
  }
};

// Run query and store results in the current tab
const runQuery = () => {
  // Reset cell expansions when running a new query
  expandedCells.value.clear();
  if (limit.value > 1000 || limit.value < 1) {
    limit.value = 1000;
  }
  // Set the loading state for the current tab only
  if (currentTab.value) {
    currentTab.value.isLoading = true;
    currentTab.value.error = null;

    triggerRef(tabs);
    const selectedEnvironment = currentEnvironment.value;
    vscode.postMessage({
      command: "bruin.getQueryOutput",
      payload: {
        environment: selectedEnvironment,
        limit: limit.value.toString(),
        query: "",
        tabId: activeTab.value,
      },
    });

    saveState();
  }
};

const exportTabResults = () => {
  // send a message to the panel to export currenttab results
  vscode.postMessage({
    command: "bruin.exportQueryOutput",
    payload: { tabId: activeTab.value, connectionName: currentConnectionName.value },
  });
  saveState();
};

// Toggle search input visibility
const toggleSearchInput = () => {
  showSearchInput.value = !showSearchInput.value;
};

// Highlight matching text in search results
const highlightMatch = (value, searchTerm) => {
  if (!searchTerm || !searchTerm.trim() || value === null || value === undefined) {
    return String(value === null || value === undefined ? "" : value);
  }

  const stringValue = String(value);
  const searchTermLower = searchTerm.toLowerCase();

  if (!stringValue.toLowerCase().includes(searchTermLower)) {
    return stringValue;
  }

  // Cache regex for better performance
  if (!highlightMatchRegexCache[searchTerm]) {
    highlightMatchRegexCache[searchTerm] = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
  }

  return stringValue.replace(
    highlightMatchRegexCache[searchTerm],
    '<span class="bg-yellow-500 text-black">$1</span>'
  );
};
const highlightMatchRegexCache = {};

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
  // Detect if running on Windows or macOS
  const isMac = navigator.platform.toUpperCase().startsWith("MAC");
  // Update the modifier key symbol based on platform
  modifierKey.value = isMac ? "⌘" : "Ctrl";

  vscode.postMessage({ command: "bruin.requestState" });
  vscode.postMessage({ command: "bruin.requestTimeout" });
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("message", postMessage);
  clearTimeout(saveTimeout);
});

watch(
  () => props.environment,
  (newEnvironment) => {
    if (!newEnvironment) return;
    currentEnvironment.value = newEnvironment;
    tabs.value.forEach((tab) => {
      tab.environment = newEnvironment;
    });
    triggerRef(tabs);
    saveState();
  },
  { immediate: true }
);

const badgeClass = computed(() => {
  switch (currentEnvironment.value?.toLowerCase()) {
    case "production":
    case "prod":
      return "production-badge";
    case "staging":
    case "stg":
      return "staging-badge";
    case "development":
    case "dev":
      return "development-badge";
    default:
      return "default-badge";
  }
});
const showNotification = ref(false);

const dismissNotification = () => {
  showNotification.value = false;
};

watch(
  () => [props.exportOutput, props.exportError],
  () => {
    if (props.exportOutput || props.exportError) {
      showNotification.value = true;
      setTimeout(() => {
        showNotification.value = false;
      }, 5000);
    }
  }
);

const formatCellValue = (value) => {
  if (value === null || value === undefined) {
    return { text: "NULL", isNull: true };
  }
  return { text: value, isNull: false };
};

const pageSize = 50;
const currentPage = ref(1);

const totalRows = computed(() => currentTab.value?.filteredRows?.length || 0);
const totalPages = computed(() => Math.ceil(totalRows.value / pageSize));

const paginatedRows = computed(() => {
  if (!currentTab.value?.filteredRows) return [];
  const start = (currentPage.value - 1) * pageSize;
  return currentTab.value.filteredRows.slice(start, start + pageSize);
});

watch(
  () => currentTab.value?.filteredRows,
  () => {
    currentPage.value = 1;
  }
);

const cancelQuery = () => {
  vscode.postMessage({
    command: "bruin.cancelQuery",
    payload: { tabId: activeTab.value },
  });
};
</script>

<style scoped>
.query-panel {
  background-color: var(--vscode-edito-background);
  border-color: var(--vscode-panel-border);
}

.query-content {
  color: var(--vscode-descriptionForeground);
  white-space: pre-wrap;
  tab-size: 2;
  line-height: 1.4;
  font-family: var(--vscode-editor-font-family);
}

.is-active {
  color: var(--vscode-button-foreground);
  background-color: var(--vscode-button-background);
}

.is-active:hover {
  background-color: var(--vscode-button-hoverBackground);
}
.query-content:hover {
  background-color: var(--vscode-editorWidget-background);
}
.text-editor-foreground {
  color: var(--vscode-editor-foreground);
}
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
vscode-badge {
  min-width: 0;
  flex-shrink: 1;
}

vscode-badge::part(control) {
  max-width: 100%;
  overflow: hidden;
}
.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 3px solid var(--vscode-progressBar-background, rgba(255, 255, 255, 0.2));
  border-top: 3px solid var(--vscode-progressBar-foreground, #0078d4);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
.production-badge {
  --badge-background: var(--vscode-gitDecoration-addedResourceForeground);
  --badge-foreground: var(--vscode-editor-background);
}

.staging-badge {
  --badge-background: var(--vscode-gitDecoration-conflictingResourceForeground);
  --badge-foreground: var(--vscode-editor-background);
}

.development-badge {
  --badge-background: #5945f3;
  --badge-foreground: var(--vscode-editor-foreground);
}

.default-badge {
  --badge-background: var(--vscode-input-background);
  --badge-foreground: var(--vscode-editor-foreground);
}
</style>
