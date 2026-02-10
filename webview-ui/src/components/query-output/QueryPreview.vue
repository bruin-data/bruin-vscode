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
              max="50000"
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
              {{ displayEnvironment }}
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
          
          <!-- Clear Sorting Button -->
          <vscode-button 
            v-if="currentTab?.sortState?.length"
            title="Clear Sorting (Esc)" 
            appearance="icon" 
            @click="clearSorting"
            class="sort-active-indicator"
          >
            <span class="codicon codicon-arrow-up mr-1"></span>
            <span class="codicon codicon-close text-2xs"></span>
          </vscode-button>

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
            title="Show Query & Console"
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
          <!-- Display the executed query and console messages -->
          <div
            v-if="currentTab?.showQuery && (currentTab?.parsedOutput?.query || currentTab?.consoleMessages?.length > 0)"
            class="query-panel bg-editorWidget-background border-b border-panel-border"
          >
            <!-- Panel header with tabs and controls -->
            <div class="flex items-center justify-between border-b border-panel-border">
              <div class="flex items-center">
                <!-- Query tab -->
                <button
                  v-if="currentTab?.parsedOutput?.query"
                  @click="activeQueryPanelTab = 'query'"
                  class="px-3 py-1 text-xs font-medium transition-colors border-b-2 flex items-center"
                  :class="[
                    activeQueryPanelTab === 'query' 
                      ? 'text-editor-fg border-button-background bg-input-background' 
                      : 'text-editor-fg opacity-70 border-transparent hover:opacity-100 hover:bg-editorWidget-background'
                  ]"
                >
                  <span class="codicon codicon-code mr-1"></span>
                  Query
                </button>
                
                <!-- Console tab -->
                <button
                  v-if="currentTab?.consoleMessages?.length > 0"
                  @click="activeQueryPanelTab = 'console'"
                  class="px-3 py-1 text-xs font-medium transition-colors border-b-2 flex items-center"
                  :class="[
                    activeQueryPanelTab === 'console' 
                      ? 'text-editor-fg border-button-background bg-input-background' 
                      : 'text-editor-fg opacity-70 border-transparent hover:opacity-100 hover:bg-editorWidget-background'
                  ]"
                >
                  <span class="codicon codicon-terminal mr-1"></span>
                  Console
                  <span 
                    v-if="currentTab?.consoleMessages?.length > 0" 
                    class="ml-1 px-1 text-3xs bg-button-background text-button-foreground rounded min-w-[12px] h-[16px] leading-none flex items-center justify-center"
                  >
                    {{ currentTab.consoleMessages.length }}
                  </span>
                </button>
              </div>
              
              <!-- Controls -->
              <div class="flex items-center gap-1">
                <vscode-button
                  v-if="!copied && activeQueryPanelTab === 'query' && currentTab?.parsedOutput?.query"
                  appearance="icon"
                  title="Copy Query"
                  @click="copyQuery(currentTab.parsedOutput.query)"
                  class="text-xs hover:bg-panel-border"
                >
                  <span class="codicon codicon-copy text-xs"></span>
                </vscode-button>
                <span
                  v-else-if="copied && activeQueryPanelTab === 'query'"
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
            </div>
            
            <!-- Panel content -->
            <div class="max-h-[200px] overflow-auto">
              <!-- Query content -->
              <div v-if="activeQueryPanelTab === 'query' && currentTab?.parsedOutput?.query">
                <pre class="query-content px-3 py-2 font-mono text-3xs leading-tight">{{ formatQuery(currentTab.parsedOutput.query) }}</pre>
              </div>
              
              <!-- Console content -->
              <div v-else-if="activeQueryPanelTab === 'console' && currentTab?.consoleMessages?.length > 0" class="p-3">
                <div class="space-y-1">
                  <div 
                    v-for="(msg, index) in currentTab.consoleMessages" 
                    :key="index"
                    class="flex items-start gap-2 text-3xs font-mono leading-tight"
                    :class="{
                      'text-editor-fg': msg.type === 'stdout',
                      'text-errorForeground': msg.type === 'stderr', 
                      'text-descriptionForeground': msg.type === 'info'
                    }"
                  >
                    <span class="flex-shrink-0 opacity-50 w-16 font-mono">
                      {{ formatTimestamp(msg.timestamp) }}
                    </span>
                    <span 
                      class="flex-shrink-0 w-6 text-center rounded px-1"
                      :class="{
                        'bg-button-background text-button-foreground': msg.type === 'stdout',
                        'bg-errorBackground text-errorForeground': msg.type === 'stderr',
                        'bg-input-background text-descriptionForeground': msg.type === 'info'
                      }"
                    >
                      {{ msg.type === 'stdout' ? 'OUT' : msg.type === 'stderr' ? 'ERR' : 'INF' }}
                    </span>
                    <span class="flex-1 whitespace-pre-wrap break-words">{{ msg.message }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Empty state -->
              <div v-else class="p-3 text-center text-descriptionForeground text-xs">
                No {{ activeQueryPanelTab === 'query' ? 'query' : 'console messages' }} available
              </div>
            </div>
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
            class="overflow-x-auto overflow-y-auto h-full w-full"
          >
            <table
              class="bg-editor-bg font-mono font-normal text-xs border-t-0 border-collapse"
              style="table-layout: auto; min-width: 100%;"
            >
              <thead class="bg-editor-bg border-y-0">
                <tr>
                  <th
                    class="sticky top-0 left-0 p-1 text-left font-semibold text-editor-fg bg-editor-bg border-x border-commandCenter-border before:absolute before:bottom-0 before:left-0 before:w-full before:border-b before:border-commandCenter-border z-20"
                    style="width: 50px; min-width: 50px; max-width: 50px;"
                  ></th>
                  <th
                    v-for="(column, colIndex) in currentTab.parsedOutput.columns"
                    :key="typeof column === 'string' ? column : column.name"
                    @click="handleSort(column, $event)"
                    class="sticky top-0 p-1 text-left font-semibold text-editor-fg bg-editor-bg border-x border-commandCenter-border before:absolute before:bottom-0 before:left-0 before:w-full before:border-b before:border-commandCenter-border relative cursor-pointer select-none group hover:bg-input-background transition-colors"
                    :class="{
                      'sort-active bg-input-background': getSortDirection(column) !== null,
                      'truncated-warning': isResultTruncated()
                    }"
                    :style="getColumnWidthStyle(Number(colIndex))"
                  >
                    <div class="flex items-center w-full overflow-hidden pr-6">
                      <span class="truncate flex-1 min-w-0 block">{{ typeof column === 'string' ? column : (column.name || `Column ${Number(colIndex) + 1}`) }}</span>
                      
                      <!-- Sort Indicators -->
                      <div class="flex items-center gap-1 ml-1 flex-shrink-0">
                        <template v-if="getSortDirection(column)">
                          <span class="codicon text-xs" 
                            :class="getSortDirection(column) === 'asc' ? 'codicon-arrow-up' : 'codicon-arrow-down'"
                            :style="{ opacity: 1 - (getSortPriority(column) * 0.2) }"
                          ></span>
                          <span v-if="currentTab.sortState && currentTab.sortState.length > 1" 
                            class="text-3xs bg-button-background text-button-foreground rounded px-1 min-w-[14px] text-center">
                            {{ getSortPriority(column) + 1 }}
                          </span>
                        </template>
                        <span v-else class="codicon codicon-arrow-up opacity-0 group-hover:opacity-30 text-xs transition-opacity"></span>
                      </div>
                    </div>
                    
                    
                    <div
                      class="resize-handle"
                      @mousedown.stop="startResize($event, Number(colIndex))"
                      @click.stop
                      title="Drag to resize column"
                    ></div>
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
                    class="sticky left-0 p-1 opacity-50 text-editor-fg font-mono border border-commandCenter-border text-center bg-editor-bg z-10"
                    style="width: 50px; min-width: 50px; max-width: 50px;"
                  >
                    {{ (currentPage - 1) * pageSize + index + 1 }}
                  </td>
                  <td
                    v-for="(value, colIndex) in row"
                    :key="colIndex"
                    class="p-1 text-editor-fg font-mono border border-commandCenter-border relative"
                    :class="{ 'cursor-pointer': cellHasOverflow(value) }"
                    :style="getColumnWidthStyle(Number(colIndex))"
                  >
                    <div class="flex flex-col">
                      <div v-if="Array.isArray(value)" class="array-cell">
                        <div
                          v-for="(item, itemIndex) in (isExpanded(index, colIndex as number) ? value : value.slice(0, 10))"
                          :key="itemIndex"
                          class="array-item break-words overflow-hidden"
                        >
                          {{ item === null || item === undefined ? 'NULL' : item }}
                        </div>
                        <div v-if="value.length === 0" class="text-descriptionForeground opacity-60 italic uppercase">
                          Empty Array
                        </div>
                        <div v-if="value.length > 10" class="text-descriptionForeground opacity-60 italic text-xs mt-1">
                          {{ isExpanded(index, colIndex as number) ? `Showing all ${value.length} items` : `... and ${value.length - 10} more` }}
                          <button
                            @click.stop="toggleCellExpansion(index, colIndex as number)"
                            class="ml-2 underline hover:no-underline"
                          >
                            {{ isExpanded(index, colIndex as number) ? 'Collapse' : 'Show all' }}
                          </button>
                        </div>
                      </div>
                      <template v-else>
                        <div
                          :class="{
                            'max-h-6 overflow-hidden': !isExpanded(index, colIndex as number),
                            'max-h-none': isExpanded(index, colIndex as number),
                          }"
                          class="transition-all duration-75 pr-6 break-words"
                        >
                          <div
                            :class="{
                              'whitespace-nowrap overflow-hidden text-ellipsis': !isExpanded(
                                index,
                                colIndex as number
                              ),
                              'whitespace-pre-wrap': isExpanded(index, colIndex as number),
                              'uppercase text-descriptionForeground opacity-60 italic': formatCellValue(value).isNull
                            }"
                            v-html="highlightMatch(formatCellValue(value).text as string, currentTab.searchInput)"
                          ></div>
                        </div>
                        <div v-if="cellHasOverflow(value)" class="absolute right-1 top-1 flex items-center z-10">
                          <vscode-button
                            appearance="icon"
                            @click.stop="toggleCellExpansion(index, colIndex as number)"
                            class="text-editor-fg opacity-70 hover:opacity-100 bg-editor-bg"
                            :title="isExpanded(index, colIndex as number) ? 'Collapse' : 'Expand'"
                          >
                            <span
                              class="codicon text-xs"
                              :class="
                                isExpanded(index, colIndex as number)
                                  ? 'codicon-chevron-down'
                                  : 'codicon-chevron-right'
                              "
                            ></span>
                          </vscode-button>
                        </div>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- Truncation Warning Popover -->
            <div
              v-if="showTruncationWarning"
              class="fixed inset-0 z-50 flex items-center justify-center"
              @click.self="dismissTruncationWarning(false)"
            >
              <div class="bg-editorWidget-bg border border-commandCenter-border rounded-lg shadow-xl p-4 max-w-sm mx-4">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="codicon codicon-warning text-[--vscode-editorWarning-foreground]"></span>
                    <span class="font-semibold text-sm">Partial Results</span>
                  </div>
                  <button
                    @click="dismissTruncationWarning(false)"
                    class="text-editor-fg opacity-60 hover:opacity-100 transition-opacity"
                    title="Close"
                  >
                    <span class="codicon codicon-close"></span>
                  </button>
                </div>

                <p class="text-xs text-descriptionForeground mb-4">
                  Results are limited to <strong>{{ formatNumber(currentTab?.limit || 0) }}</strong> rows.
                  Sorting will apply only to the fetched data, not the full dataset.
                </p>

                <div class="flex justify-end gap-2">
                  <vscode-button
                    appearance="secondary"
                    @click="dismissTruncationWarning(false)"
                  >
                    Cancel
                  </vscode-button>
                  <vscode-button
                    appearance="primary"
                    @click="dismissTruncationWarning(true)"
                  >
                    Sort anyway
                  </vscode-button>
                </div>
              </div>
            </div>

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
} from "vue";
import { TableCellsIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";
import QuerySearch from "../ui/query-preview/QuerySearch.vue";
import type { EditingState, TabData } from "@/types";
import { useConnectionsStore } from "@/store/bruinStore";
import { flattenStructColumns } from "@/utilities/structUtils";

// Sorting interfaces
interface SortState {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
}

// Constants
const MAX_CONSOLE_MESSAGES = 1000;
const COST_WARNING_THRESHOLD = 10000; // Show cost warning above this row count
const limitConsoleMessages = (messages: any[]) => {
  if (messages.length > MAX_CONSOLE_MESSAGES) {
    return messages.slice(-MAX_CONSOLE_MESSAGES);
  }
  return messages;
};

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

const connectionsStore = useConnectionsStore();
const currentEnvironment = ref<string>(props.environment);
const modifierKey = ref("⌘");
const currentConnectionName = ref("");
const limit = ref(1000);
const showSearchInput = ref(false);
const hoveredTab = ref("");
const copied = ref(false);
const queryTimeout = ref(60);
const currentStartDate = ref("");
const currentEndDate = ref("");
const expandedCells = ref(new Set<string>());
const activeQueryPanelTab = ref<'query' | 'console'>('query');
const columnWidths = ref<Map<string, Map<number, number>>>(new Map());
const showTruncationWarning = ref(false);
const resizeState = ref<{
  isResizing: boolean;
  columnIndex: number;
  startX: number;
  startWidth: number;
} | null>(null);

const defaultTab: TabData = {
  id: "tab-1",
  label: "Tab 1",
  parsedOutput: undefined,
  error: null,
  isLoading: false,
  searchInput: "",
  limit: 1000,
  filteredRows: [],
  totalRowCount: 0,
  filteredRowCount: 0,
  isEditing: false,
  environment: "",
  executedEnvironment: "",
  connectionName: props.connectionName,
  showQuery: false,
  consoleMessages: [],
  sortState: [],
};

const tabs = shallowRef<TabData[]>([defaultTab]);

// Sorting Helpers
const getSortDirection = (column: any): 'asc' | 'desc' | null => {
  if (!currentTab.value?.sortState) return null;
  const colName = typeof column === 'string' ? column : column.name;
  const sort = currentTab.value.sortState.find((s: SortState) => s.column === colName);
  return sort ? sort.direction : null;
};

const getSortPriority = (column: any): number => {
  if (!currentTab.value?.sortState) return -1;
  const colName = typeof column === 'string' ? column : column.name;
  return currentTab.value.sortState.findIndex((s: SortState) => s.column === colName);
};

const shouldShowCostWarning = (): boolean => {
  return (currentTab.value?.totalRowCount || 0) > COST_WARNING_THRESHOLD;
};

const isResultTruncated = (): boolean => {
  // Check if row count equals the limit used when query was executed
  const executedLimit = currentTab.value?.limit || 0;
  const rowCount = currentTab.value?.totalRowCount || 0;
  return executedLimit > 0 && rowCount >= executedLimit;
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num);
};

const truncationWarningAcknowledged = ref(false);
const pendingSortColumn = ref<any>(null);
const pendingSortEvent = ref<MouseEvent | null>(null);

const dismissTruncationWarning = (proceed: boolean = false) => {
  showTruncationWarning.value = false;
  if (proceed && pendingSortColumn.value) {
    truncationWarningAcknowledged.value = true;
    performSort(pendingSortColumn.value, pendingSortEvent.value);
  }
  pendingSortColumn.value = null;
  pendingSortEvent.value = null;
};

const handleSort = async (column: any, event: MouseEvent) => {
  if (!currentTab.value) return;

  // Show warning if results are truncated and user hasn't acknowledged yet
  if (isResultTruncated() && !truncationWarningAcknowledged.value) {
    pendingSortColumn.value = column;
    pendingSortEvent.value = event;
    showTruncationWarning.value = true;
    return;
  }

  performSort(column, event);
};

const performSort = (column: any, event: MouseEvent | null) => {
  if (!currentTab.value) return;

  const colName = typeof column === 'string' ? column : column.name;
  const isMultiSort = event?.ctrlKey || event?.metaKey;

  // Client-side sorting logic
  let newSortState: SortState[] = [...(currentTab.value.sortState || [])];
  const existingIndex = newSortState.findIndex((s: SortState) => s.column === colName);

  if (existingIndex === -1) {
    const newSort: SortState = {
      column: colName,
      direction: 'asc',
      priority: newSortState.length
    };
    newSortState = isMultiSort ? [...newSortState, newSort] : [newSort];
  } else {
    const current = newSortState[existingIndex];
    if (current.direction === 'asc') {
      newSortState[existingIndex] = { ...current, direction: 'desc' };
    } else {
      newSortState.splice(existingIndex, 1);
      newSortState.forEach((s, i) => s.priority = i);
    }

    if (!isMultiSort && newSortState.length > 1) {
      newSortState = newSortState.filter((s: SortState) => s.column === colName);
    }
  }

  // Update tab with new sort state
  const tabIndex = tabs.value.findIndex(t => t.id === activeTab.value);
  if (tabIndex !== -1) {
    const newTab = {
      ...tabs.value[tabIndex],
      sortState: newSortState
    };
    tabs.value.splice(tabIndex, 1, newTab);
    triggerRef(tabs); // Trigger reactivity before applySorting reads the new state
    applySorting();
    saveState();
  }
};

const applySorting = () => {
  if (!currentTab.value?.parsedOutput?.rows) return;

  const columns = currentTab.value.parsedOutput.columns;
  const searchTerm = currentTab.value.searchInput?.trim().toLowerCase();

  // Start with original rows, then filter if there's a search term
  let rows: any[];
  if (searchTerm) {
    rows = currentTab.value.parsedOutput.rows.filter((row: any[]) => {
      for (let i = 0; i < row.length; i++) {
        const cell = row[i];
        if (cell !== null && String(cell).toLowerCase().includes(searchTerm)) {
          return true;
        }
      }
      return false;
    });
  } else {
    rows = [...currentTab.value.parsedOutput.rows];
  }

  // Apply sorting if there's a sort state
  if (currentTab.value.sortState && currentTab.value.sortState.length > 0) {
    rows.sort((a, b) => {
      for (const sort of currentTab.value!.sortState!) {
        const colIndex = columns.findIndex((c: any) =>
          (typeof c === 'string' ? c : c.name) === sort.column
        );

        if (colIndex === -1) continue;

        let valA = a[colIndex];
        let valB = b[colIndex];

        if (valA === null || valA === undefined) valA = -Infinity;
        if (valB === null || valB === undefined) valB = -Infinity;

        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (!isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
          comparison = new Date(valA).getTime() - new Date(valB).getTime();
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        }

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  // Update filtered rows count
  const tabIndex = tabs.value.findIndex(t => t.id === activeTab.value);
  if (tabIndex !== -1) {
    const newTab = {
      ...tabs.value[tabIndex],
      filteredRows: rows,
      filteredRowCount: rows.length
    };
    tabs.value.splice(tabIndex, 1, newTab);
  }
  triggerRef(tabs);
};

const clearSorting = () => {
  if (!currentTab.value) return;
  const tabIndex = tabs.value.findIndex(t => t.id === activeTab.value);
  if (tabIndex !== -1) {
    const newTab = {
      ...tabs.value[tabIndex],
      sortState: []
    };
    tabs.value.splice(tabIndex, 1, newTab);
    applySorting();
    saveState();
  }
};

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
      if (currentTab.value?.error && currentTab.value?.consoleMessages?.length > 0) {
        activeQueryPanelTab.value = 'console';
      } else {
        activeQueryPanelTab.value = currentTab.value?.parsedOutput?.query ? 'query' : 'console';
      }
      const panel = document.querySelector(".query-content");
      panel?.scrollTo(0, 0);
    }
  });
};

const activeTab = ref<string>("tab-1");
const tabCounter = ref(2);
const formatQuery = (query: string) => {
  const lines = query.split("\n");
  return lines.map((line, index) => (index === 0 ? line.trimStart() : line)).join("\n");
};

const timestampCache = new Map<string, string>();

const formatTimestamp = (timestamp: string) => {
  if (timestampCache.has(timestamp)) {
    return timestampCache.get(timestamp)!;
  }
  
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const formatted = `${hours}:${minutes}:${seconds}`;
  
  timestampCache.set(timestamp, formatted);
  if (timestampCache.size > 1000) {
    const firstKey = timestampCache.keys().next().value;
    if (firstKey !== undefined) {
      timestampCache.delete(firstKey);
    }
  }
  
  return formatted;
};

const currentTab = computed(() => {
  vscode.postMessage({
    command: "bruin.setActiveTabId",
    payload: { tabId: activeTab.value },
  });

  return tabs.value.find((tab) => tab.id === activeTab.value);
});

const switchToTab = async (tabId: string) => {
  await nextTick();
  expandedCells.value.clear();
  activeTab.value = tabId;

  nextTick(() => {
    triggerRef(tabs);
  });
};

const addTab = () => {
  const newTabId = `tab-${tabCounter.value}`;
  const newTabLabel = `Tab ${tabCounter.value}`;

  tabs.value.push({
    id: newTabId,
    label: newTabLabel,
    parsedOutput: undefined,
    error: null,
    limit: 1000,
    isLoading: false,
    searchInput: "",
    filteredRows: [],
    totalRowCount: 0,
    filteredRowCount: 0,
    isEditing: false,
    environment: currentEnvironment.value,
    executedEnvironment: "",
    connectionName: currentConnectionName.value,
    showQuery: false,
    consoleMessages: [],
    sortState: [],
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
    environment: currentEnvironment.value,
    showQuery: tab.showQuery,
    connectionName: tab.connectionName,
    tabCounter: tabCounter.value,
    consoleMessages: limitConsoleMessages(tab.consoleMessages || []),
    sortState: tab.sortState || [],
  }));

  const state = {
    tabs: sanitizedTabs,
    activeTab: activeTab.value,
    expandedCells: Array.from(expandedCells.value),
    environment: currentEnvironment.value,
    connectionName: currentConnectionName.value,
    showSearchInput: showSearchInput.value,
    tabCounter: tabCounter.value,
    columnWidths: Object.fromEntries(
      Array.from(columnWidths.value.entries()).map(([tabId, widths]) => [
        tabId,
        Object.fromEntries(widths)
      ])
    ),
  };

  try {
    JSON.parse(JSON.stringify(state));
    vscode.postMessage({
      command: "bruin.saveState",
      payload: state,
    });
  } catch (e) {
    console.error("State serialization failed:", e);
  }
};

let saveTimeout: NodeJS.Timeout;
watchEffect(() => {
  const hasLoadingTab = tabs.value.some(tab => tab.isLoading);
  if (!hasLoadingTab) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveState, 500);
  }
});

const reviveParsedOutput = (parsedOutput: any) => {
  try {
    if (!parsedOutput || parsedOutput === null) {
      return undefined;
    }
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

      tabs.value = (state.tabs || []).map((t: any) => {
        const revivedParsedOutput = t.parsedOutput ? reviveParsedOutput(t.parsedOutput) : undefined;
        return {
          ...t,
          parsedOutput: revivedParsedOutput,
          connectionName: revivedParsedOutput?.connectionName || t.connectionName,
          showQuery: !!t.showQuery,
          error: t.error ? new Error(t.error.message) : null,
          isLoading: false,
          isEditing: false,
          filteredRows: revivedParsedOutput?.rows || [],
          consoleMessages: limitConsoleMessages(t.consoleMessages || []),
          sortState: t.sortState || [],
        };
      });

      currentConnectionName.value =
        tabs.value.find((t) => t.id === state.activeTab)?.connectionName || state.connectionName;
      activeTab.value = state.activeTab || "tab-1";
      expandedCells.value = new Set(state.expandedCells || []);
      showSearchInput.value = state.showSearchInput || false;
      
      // Apply sorting if restored
      nextTick(() => {
        applySorting();
      });
    }
  } else if (message.command === "init") {
    vscode.postMessage({ command: "bruin.requestState" });
    vscode.postMessage({ command: "bruin.requestTimeout" });
  } else if (message.command === "bruin.timeoutResponse") {
    if (message.payload && typeof message.payload.timeout === "number") {
      queryTimeout.value = message.payload.timeout;
    }
  } else if (message.command === "update-query-dates") {
    if (message.payload && message.payload.message) {
      const { startDate, endDate } = message.payload.message;
      currentStartDate.value = startDate || "";
      currentEndDate.value = endDate || "";
    }
  } else if (message.command === "bruin.executePreviewQuery") {
    const tabId = message.payload.tabId || activeTab.value;
    const selectedEnvironment = currentEnvironment.value;
    const extractedQuery = message.payload.extractedQuery || "";

    vscode.postMessage({
      command: "bruin.getQueryOutput",
      payload: {
        environment: selectedEnvironment,
        limit: limit.value.toString(),
        query: extractedQuery,
        tabId: tabId,
        startDate: currentStartDate.value,
        endDate: currentEndDate.value,
      },
    });
  }

  if (message.command === "query-output-message") {
    if (message.payload.status === "timeoutUpdate") {
      if (message.payload.message && typeof message.payload.message.timeout === "number") {
        queryTimeout.value = message.payload.message.timeout;
      }
      return;
    }

    const tabId = message.payload?.tabId;
    if (!tabId) {
      console.error("Received query output message without tabId");
      return;
    }

    const tabToUpdate = tabs.value.find((tab) => tab.id === tabId);

    if (tabToUpdate) {
      if (message.payload.status === "loading") {
        const tabIndex = tabs.value.findIndex(t => t.id === tabId);
        if (tabIndex !== -1) {
          let newTab = { ...tabToUpdate, isLoading: message.payload.message };
          
          if (message.payload.message === true) {
            newTab = {
              ...newTab,
              parsedOutput: undefined,
              error: null,
              filteredRows: [],
              totalRowCount: 0,
              filteredRowCount: 0,
              consoleMessages: [],
              sortState: [],
            };
            // Reset truncation warning acknowledgment for new query
            truncationWarningAcknowledged.value = false;
          }
          
          tabs.value.splice(tabIndex, 1, newTab);
        }

        triggerRef(tabs);
      } else if (message.payload.status === "success") {
        try {
          const rawOutputData =
            typeof message.payload.message === "string"
              ? JSON.parse(message.payload.message)
              : message.payload.message;

          const outputData = {
            columns: rawOutputData.columns || [],
            rows: rawOutputData.rows || [],
            connectionName: rawOutputData.connectionName || rawOutputData.meta?.connectionName || null,
            query: rawOutputData.query || null
          };

          const flattenedData = flattenStructColumns(outputData.columns, outputData.rows, outputData.query);

          if (flattenedData.columns.length > 0 && flattenedData.rows.length > 0) {
            const expectedColumnCount = flattenedData.columns.length;
            const firstRowLength = flattenedData.rows[0]?.length || 0;
            
            if (expectedColumnCount !== firstRowLength) {
              console.warn(`Column/row mismatch: ${expectedColumnCount} columns but ${firstRowLength} values in first row`);
            }
          }

          outputData.columns = flattenedData.columns;
          outputData.rows = flattenedData.rows;

          const consoleMessages = limitConsoleMessages(message.payload.consoleMessages || []);

          const tabIndex = tabs.value.findIndex(t => t.id === tabId);
          if (tabIndex !== -1) {
            const newTab = {
              ...tabToUpdate,
              parsedOutput: outputData,
              totalRowCount: outputData.rows?.length || 0,
              filteredRows: outputData.rows || [],
              error: null,
              isLoading: false,
              connectionName: outputData.connectionName || tabToUpdate.connectionName,
              consoleMessages: consoleMessages,
              sortState: tabToUpdate.sortState || [],
            };
            
            tabs.value.splice(tabIndex, 1, newTab);
            saveState();
            
            // Apply existing sorting to new data
            nextTick(() => {
              applySorting();
            });
          }
        } catch (e) {
          console.error("Error processing tab output:", e);
          
          const consoleMessages = limitConsoleMessages(message.payload.consoleMessages || []);
          const tabIndex = tabs.value.findIndex(t => t.id === tabId);
          if (tabIndex !== -1) {
            const newTab = {
              ...tabToUpdate,
              error: "Error processing query results: " + (e as Error).message,
              isLoading: false,
              consoleMessages: consoleMessages
            };
            tabs.value.splice(tabIndex, 1, newTab);
            saveState();
          }
        }
      } else if (message.payload.status === "error") {
        const consoleMessages = limitConsoleMessages(message.payload.consoleMessages || []);
        const tabIndex = tabs.value.findIndex(t => t.id === tabId);
        if (tabIndex !== -1) {
          const newTab = {
            ...tabToUpdate,
            error: message.payload.message,
            isLoading: false,
            consoleMessages: consoleMessages
          };
          
          tabs.value.splice(tabIndex, 1, newTab);         
          saveState();
        }
      }

      triggerRef(tabs);
    }
  }
  if (message.command === "query-output-clear" && message.payload?.status === "success") {
    const tabId = message.payload.message?.tabId;
    
    if (tabId) {
      const tabToClear = tabs.value.find((tab) => tab.id === tabId);
      if (tabToClear) {
        tabToClear.parsedOutput = undefined;
        tabToClear.error = null;
        tabToClear.filteredRows = [];
        tabToClear.totalRowCount = 0;
        tabToClear.filteredRowCount = 0;
        tabToClear.consoleMessages = [];
        tabToClear.sortState = [];
      }
    } else {
      if (currentTab.value) {
        currentTab.value.parsedOutput = undefined;
        currentTab.value.error = null;
        currentTab.value.filteredRows = [];
        currentTab.value.totalRowCount = 0;
        currentTab.value.filteredRowCount = 0;
        currentTab.value.consoleMessages = [];
        currentTab.value.sortState = [];
      }
    }
    nextTick(() => {
      if (tabs.value) {
        triggerRef(tabs);
      }
    });
  }
});

const closeTab = (tabId: string) => {
  expandedCells.value.clear();
  const tabIndex = tabs.value.findIndex((tab) => tab.id === tabId);

  if (tabIndex !== -1) {
    tabs.value.splice(tabIndex, 1);

    if (tabs.value.length === 0) {
      const newDefaultTab = {
        id: "tab-1",
        label: "Tab 1",
        parsedOutput: undefined,
        error: null,
        isLoading: false,
        searchInput: "",
        limit: 1000,
        filteredRows: [],
        totalRowCount: 0,
        filteredRowCount: 0,
        isEditing: false,
        environment: currentEnvironment.value,
        executedEnvironment: "",
        connectionName: props.connectionName,
        showQuery: false,
        consoleMessages: [],
        sortState: [],
      };
      tabs.value.push(newDefaultTab);
      activeTab.value = "tab-1";
      tabCounter.value = 2;
    } else {
      if (activeTab.value === tabId) {
        if (tabIndex < tabs.value.length) {
          activeTab.value = tabs.value[tabIndex].id;
        }
        else if (tabIndex > 0) {
          activeTab.value = tabs.value[tabIndex - 1].id;
        }
        else {
          activeTab.value = tabs.value[0].id;
        }
      }

      if (tabs.value.length === 1 && tabs.value[0].id === "tab-1") {
        tabCounter.value = 2;
      }
    }

    if (editingState.value?.tabId === tabId) {
      cancelEdit();
    }

    nextTick(() => {
      triggerRef(tabs);
    });
  }

  saveState();
};

const clearTabResults = () => {
  expandedCells.value.clear();

  if (currentTab.value) {
    const index = tabs.value.findIndex((tab) => tab.id === currentTab.value?.id);
    if (index !== -1) {
      const newTab = {
        ...tabs.value[index],
        parsedOutput: undefined,
        error: null,
        filteredRows: [],
        totalRowCount: 0,
        filteredRowCount: 0,
        consoleMessages: [],
        sortState: [],
      };
      tabs.value.splice(index, 1, newTab);
    }
  }
  nextTick(() => {
    triggerRef(tabs);
  });
  vscode.postMessage({
    command: "bruin.clearQueryOutput",
    payload: { tabId: activeTab.value },
  });

  saveState();
};

const cellHasOverflow = (value: any) => {
  if (value === null || value === undefined) return false;
  const stringValue = String(value);
  return stringValue.length > 30;
};

const getCellKey = (rowIndex: number, colIndex: number) => {
  return `${activeTab.value}-${rowIndex}-${colIndex}`;
};

const isExpanded = (rowIndex: number, colIndex: number) => {
  return expandedCells.value.has(getCellKey(rowIndex, colIndex));
};

const toggleCellExpansion = (rowIndex: number, colIndex: number) => {
  const cellKey = getCellKey(rowIndex, colIndex);
  if (expandedCells.value.has(cellKey)) {
    expandedCells.value.delete(cellKey);
  } else {
    expandedCells.value.add(cellKey);
  }
};

watch(
  () => props.output,
  (newOutput) => {
    if (!newOutput) return;
  }
);

watch(
  () => props.error,
  (newError) => {
    if (!newError) return;
  }
);

watch(
  () => props.environment,
  (newEnvironment) => {
    if (newEnvironment && newEnvironment !== currentEnvironment.value) {
      currentEnvironment.value = newEnvironment;
      
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

watch(
  () => props.isLoading,
  (newIsLoading) => {
  }
);

const updateSearchTerm = (term: string) => {
  expandedCells.value.clear();
  if (currentTab.value) {
    currentTab.value.searchInput = term;
    nextTick(() => {
      updateFilteredRows();
      triggerRef(tabs);
    });
  }
};

const updateFilteredRows = () => {
  if (!currentTab.value || !currentTab.value.parsedOutput || !currentTab.value.parsedOutput.rows) {
    if (currentTab.value) {
      const tabIndex = tabs.value.findIndex(t => t.id === activeTab.value);
      if (tabIndex !== -1) {
        const newTab = {
          ...tabs.value[tabIndex],
          filteredRows: [],
          filteredRowCount: 0
        };
        tabs.value.splice(tabIndex, 1, newTab);
        triggerRef(tabs);
      }
    }
    return;
  }

  // Use applySorting which handles both filtering and sorting
  applySorting();
};

const runQuery = () => {
  expandedCells.value.clear();
  if (limit.value > 50000 || limit.value < 1) {
    limit.value = 1000;
  }
  
  if (currentTab.value) {
    const tabIndex = tabs.value.findIndex(t => t.id === activeTab.value);
    if (tabIndex !== -1) {
      const clearedTab = {
        ...currentTab.value,
        parsedOutput: undefined,
        error: null,
        filteredRows: [],
        totalRowCount: 0,
        filteredRowCount: 0,
        isLoading: true,
        consoleMessages: [],
        sortState: [],
      };
      
      tabs.value.splice(tabIndex, 1, clearedTab);
    }

    triggerRef(tabs);
    const selectedEnvironment = currentEnvironment.value;
    
    if (currentTab.value) {
      const tabIndex = tabs.value.findIndex(t => t.id === activeTab.value);
      if (tabIndex !== -1) {
        const updatedTab = {
          ...tabs.value[tabIndex],
          executedEnvironment: selectedEnvironment,
          limit: limit.value  // Store the limit used for this query
        };
        tabs.value.splice(tabIndex, 1, updatedTab);
      }
    }
    
    vscode.postMessage({
      command: "bruin.getQueryOutput",
      payload: {
        environment: selectedEnvironment,
        limit: limit.value.toString(),
        query: "",
        tabId: activeTab.value,
        startDate: currentStartDate.value,
        endDate: currentEndDate.value,
      },
    });

    saveState();
  }
};

const exportTabResults = () => {
  vscode.postMessage({
    command: "bruin.exportQueryOutput",
    payload: { tabId: activeTab.value, connectionName: currentConnectionName.value },
  });
  saveState();
};

const toggleSearchInput = () => {
  showSearchInput.value = !showSearchInput.value;
};

const highlightMatch = (value: string, searchTerm: string) => {
  if (!searchTerm || !searchTerm.trim() || value === null || value === undefined) {
    return String(value === null || value === undefined ? "" : value);
  }

  const stringValue = String(value);
  const searchTermLower = searchTerm.toLowerCase();

  if (!stringValue.toLowerCase().includes(searchTermLower)) {
    return stringValue;
  }

  if (!highlightMatchRegexCache[searchTerm]) {
    highlightMatchRegexCache[searchTerm] = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
  }

  return stringValue.replace(
    highlightMatchRegexCache[searchTerm],
    '<span class="bg-yellow-500 text-black">$1</span>'
  );
};
const highlightMatchRegexCache: Record<string, RegExp> = {};

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    runQuery();
  }

  if ((event.ctrlKey || event.metaKey) && event.key === "f") {
    event.preventDefault();
    toggleSearchInput();
  }

  if (event.key === "Escape") {
    if (showTruncationWarning.value) {
      dismissTruncationWarning(false);
      event.preventDefault();
    } else if (expandedCells.value.size > 0) {
      expandedCells.value.clear();
      event.preventDefault();
    } else if (currentTab.value?.sortState?.length) {
      clearSorting();
      event.preventDefault();
    }
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

const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus(),
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  const isMac = navigator.platform.toUpperCase().startsWith("MAC");
  modifierKey.value = isMac ? "⌘" : "Ctrl";

  vscode.postMessage({ command: "bruin.requestState" });
  vscode.postMessage({ command: "bruin.requestTimeout" });
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  clearTimeout(saveTimeout);
  if (resizeState.value) {
    stopResize();
  }
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

const displayEnvironment = computed(() => {
  try {
    const storedEnv = connectionsStore?.getDefaultEnvironment?.();
    return currentTab.value?.executedEnvironment || storedEnv || currentEnvironment.value || "";
  } catch (error) {
    console.warn("Error accessing store in QueryPreview:", error);
    return currentTab.value?.executedEnvironment || currentEnvironment.value || "";
  }
});

const badgeClass = computed(() => {
  switch (displayEnvironment.value?.toLowerCase()) {
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

const formatCellValue = (value: any) => {
  if (value === null || value === undefined) {
    return { text: "NULL", isNull: true };
  }
  
  if (Array.isArray(value)) {
    return { text: value, isNull: false };
  }
  
  if (typeof value === 'object') {
    try {
      return { text: JSON.stringify(value, null, 2), isNull: false };
    } catch (e) {
      return { text: String(value), isNull: false };
    }
  }
  
  return { text: String(value), isNull: false };
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

const getColumnWidthStyle = (colIndex: number) => {
  if (!currentTab.value) return { minWidth: '120px', maxWidth: '300px' };
  
  const tabId = currentTab.value.id;
  const widths = columnWidths.value.get(tabId);
  
  if (widths && widths.has(colIndex)) {
    const width = widths.get(colIndex)!;
    return {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
    };
  }
  
  return { minWidth: '120px', maxWidth: '300px' };
};

const startResize = (event: MouseEvent, columnIndex: number) => {
  event.preventDefault();
  event.stopPropagation();
  
  if (!currentTab.value) return;
  
  const tabId = currentTab.value.id;
  const widths = columnWidths.value.get(tabId) || new Map();
  
  const headerElement = (event.target as HTMLElement).closest('th');
  const currentWidth = headerElement ? headerElement.offsetWidth : (widths.get(columnIndex) || 150);
  
  resizeState.value = {
    isResizing: true,
    columnIndex,
    startX: event.clientX,
    startWidth: currentWidth,
  };
  
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
};

const handleResize = (event: MouseEvent) => {
  if (!resizeState.value || !currentTab.value) return;
  
  const deltaX = event.clientX - resizeState.value.startX;
  const newWidth = Math.max(80, resizeState.value.startWidth + deltaX);
  
  const tabId = currentTab.value.id;
  if (!columnWidths.value.has(tabId)) {
    columnWidths.value.set(tabId, new Map());
  }
  
  const widths = columnWidths.value.get(tabId)!;
  widths.set(resizeState.value.columnIndex, newWidth);
};

const stopResize = () => {
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  
  resizeState.value = null;
  saveState();
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
  overflow: visible;
}

thead th > div:first-child {
  overflow: visible;
  white-space: nowrap;
}

thead th .resize-handle {
  background-color: var(--vscode-button-background);
  opacity: 0;
  transition: opacity 0.2s ease;
  position: absolute;
  right: -2px;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}

thead th:hover .resize-handle {
  opacity: 0.6;
}

thead th .resize-handle:hover {
  opacity: 1;
  background-color: var(--vscode-button-background);
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

/* Sorting Styles */
.sort-active {
  background-color: var(--vscode-input-background) !important;
  color: var(--vscode-button-foreground) !important;
}

.sort-active .codicon {
  color: var(--vscode-button-background);
}

.sort-tooltip {
  background-color: var(--vscode-editorWidget-background);
  border-color: var(--vscode-commandCenter-border);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sort-active-indicator {
  position: relative;
  color: var(--vscode-button-background);
}

.sort-active-indicator:hover {
  color: var(--vscode-button-hoverBackground);
}

/* Truncated results warning visual indicator on header */
th.truncated-warning.sort-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--vscode-editorWarning-foreground), transparent);
  opacity: 0.6;
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

.array-cell {
  display: flex;
  flex-direction: column;
}

.array-item {
  display: block;
  line-height: 1.4;
  word-break: break-all;
  overflow-wrap: break-word;
  white-space: normal;
  max-width: 100%;
}

.array-item:not(:last-child) {
  border-bottom: 1px solid var(--vscode-panel-border);
  padding-bottom: 2px;
  margin-bottom: 2px;
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