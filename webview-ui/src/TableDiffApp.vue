<template>
  <div class="flex flex-col w-full h-full">
    <div class="flex-1 overflow-auto">
      <!-- Connection and Action Buttons -->
      <div class="p-2 border-b border-panel-border">
        <div class="flex items-end justify-between gap-3">
          <div class="flex-1">
            <label class="block text-xs text-editor-fg mb-1">Connection</label>
            <vscode-dropdown 
              v-model="selectedConnection" 
              @change="onConnectionChange"
              class="w-48 max-w-full"
              :disabled="isLoading"
            >
              <vscode-option value="">Select Connection...</vscode-option>
              <vscode-option
                v-for="conn in connections"
                :key="conn.name"
                :value="conn.name"
              >
                {{ conn.name }}{{ conn.environment && conn.environment !== 'default' ? ` (${conn.environment})` : '' }}
              </vscode-option>
            </vscode-dropdown>
          </div>
          <div class="flex items-center gap-2">
            <vscode-button
              :disabled="!canExecuteComparison"
              @click="executeComparison"
              appearance="primary"
            >
              <span v-if="!isLoading" class="codicon codicon-play mr-1"></span>
              <span v-if="isLoading" class="mr-1">
                <svg
                  class="animate-spin h-4 w-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </span>
              Compare
            </vscode-button>
            <vscode-button
              title="Clear Results"
              appearance="icon"
              @click="clearResults"
            >
              <span class="codicon codicon-clear-all text-editor-fg"></span>
            </vscode-button>
          </div>
        </div>
      </div>


      <!-- Collapsible Source and Target Selection -->
      <div class="border-b border-panel-border">
        <div class="flex items-center justify-between p-2 cursor-pointer" @click="toggleInputsCollapse">
          <div class="flex items-center gap-2">
            <span class="codicon codicon-settings text-editor-fg"></span>
            <span class="text-xs font-medium text-editor-fg">Table Selection</span>
          </div>
          <span :class="['codicon', isInputsCollapsed ? 'codicon-chevron-right' : 'codicon-chevron-down', 'text-editor-fg']"></span>
        </div>
        <div v-if="!isInputsCollapsed" class="p-3 space-y-3">
          <!-- Source Section -->
          <div class="space-y-2">
            <div class="flex items-center">
              <span class="codicon codicon-source-control text-green-500 mr-1"></span>
              <span class="text-xs font-medium text-editor-fg mr-3 w-12">Source</span>
              <div class="flex items-center gap-3 flex-1">
                <div class="flex-1">
                  <vscode-dropdown 
                    v-model="sourceSchema" 
                    @change="onSourceSchemaChange"
                    class="w-full"
                  >
                    <vscode-option value="">
                      {{ isLoadingSchemas ? 'Loading...' : 'Select Schema...' }}
                    </vscode-option>
                    <vscode-option
                      v-for="schema in schemas"
                      :key="schema.name"
                      :value="schema.name"
                    >
                      {{ schema.name }}
                    </vscode-option>
                  </vscode-dropdown>
                </div>
                <span class="text-editor-fg opacity-50">.</span>
                <div class="flex-1">
                  <vscode-dropdown 
                    v-model="sourceTable" 
                    @change="onSourceTableChange"
                    class="w-full"
                  >
                    <vscode-option value="">
                      {{ isLoadingSourceTables ? 'Loading...' : 'Select Table...' }}
                    </vscode-option>
                    <vscode-option
                      v-for="table in sourceTables"
                      :key="table.name"
                      :value="table.name"
                    >
                      {{ table.name }}
                    </vscode-option>
                  </vscode-dropdown>
                </div>
              </div>
            </div>
          </div>

          <!-- Target Section -->
          <div class="space-y-2">
            <div class="flex items-center">
              <span class="codicon codicon-target text-orange-500 mr-1"></span>
              <span class="text-xs font-medium text-editor-fg mr-3 w-12">Target</span>
              <div class="flex items-center gap-3 flex-1">
                <div class="flex-1">
                  <vscode-dropdown 
                    v-model="targetSchema" 
                    @change="onTargetSchemaChange"
                    class="w-full"
                  >
                    <vscode-option value="">
                      {{ isLoadingSchemas ? 'Loading...' : 'Select Schema...' }}
                    </vscode-option>
                    <vscode-option
                      v-for="schema in schemas"
                      :key="schema.name"
                      :value="schema.name"
                    >
                      {{ schema.name }}
                    </vscode-option>
                  </vscode-dropdown>
                </div>
                <span class="text-editor-fg opacity-50">.</span>
                <div class="flex-1">
                  <vscode-dropdown 
                    v-model="targetTable" 
                    @change="onTargetTableChange"
                    class="w-full"
                  >
                    <vscode-option value="">
                      {{ isLoadingTargetTables ? 'Loading...' : 'Select Table...' }}
                    </vscode-option>
                    <vscode-option
                      v-for="table in targetTables"
                      :key="table.name"
                      :value="table.name"
                    >
                      {{ table.name }}
                    </vscode-option>
                  </vscode-dropdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div v-if="hasResults || error" class="flex-1">
        <div v-if="error" class="p-4 border-b border-panel-border">
          <div class="flex items-center mb-2">
            <span class="codicon codicon-error text-red-500 mr-2"></span>
            <h3 class="text-sm font-medium text-editor-fg">Error</h3>
          </div>
          <div class="text-sm text-red-400 bg-editorWidget-bg p-3 rounded border border-commandCenter-border">
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
                {{ sourceSchema }}.{{ sourceTable }} → {{ targetSchema }}.{{ targetTable }}
              </vscode-badge>
              <vscode-button
                title="Copy Results"
                appearance="icon"
                @click="copyResults"
              >
                <span class="codicon codicon-copy text-editor-fg"></span>
              </vscode-button>
            </div>
          </div>
          
          <div class="bg-editorWidget-bg border border-commandCenter-border rounded overflow-hidden">
            <div class="max-h-96 overflow-auto">
              <pre class="text-xs font-mono p-4 text-editor-fg whitespace-pre-wrap">{{ results }}</pre>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="!hasResults && !error && !isLoading" class="flex items-center justify-center h-32 text-center">
        <div class="text-editor-fg opacity-60">
          <span class="codicon codicon-diff text-4xl block mb-2 opacity-40"></span>
          <p class="text-sm">Select connection, schemas, and tables to compare</p>
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
import { ref, computed, onMounted, watch } from 'vue';
import { vscode } from '@/utilities/vscode';

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
  selectedConnection?: string;
  sourceSchema?: string;
  targetSchema?: string;
  sourceTable?: string;
  targetTable?: string;
  isInputsCollapsed?: boolean;
}

// State
const connections = ref<Connection[]>([]);
const schemas = ref<Schema[]>([]);
const sourceTables = ref<Table[]>([]);
const targetTables = ref<Table[]>([]);

const selectedConnection = ref('');
const sourceSchema = ref('');
const targetSchema = ref('');
const sourceTable = ref('');
const targetTable = ref('');

const isLoading = ref(false);
const isLoadingSchemas = ref(false);
const isLoadingSourceTables = ref(false);
const isLoadingTargetTables = ref(false);
const results = ref('');
const error = ref('');
const comparisonInfo = ref<ComparisonInfo>({ source: '', target: '' });
const isInputsCollapsed = ref(false);

// Computed
const hasResults = computed(() => results.value.length > 0);
const canExecuteComparison = computed(() => 
  selectedConnection.value && 
  sourceSchema.value && 
  targetSchema.value && 
  sourceTable.value && 
  targetTable.value
);

// Methods

const onConnectionChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as HTMLSelectElement;
  const newValue = target.value;
  
  // Manually update the value since v-model might not be working
  selectedConnection.value = newValue;
  
  // Clear dependent selections
  sourceSchema.value = '';
  targetSchema.value = '';
  sourceTable.value = '';
  targetTable.value = '';
  
  // Clear dependent data
  schemas.value = [];
  sourceTables.value = [];
  targetTables.value = [];
  
  if (newValue) {
    isLoadingSchemas.value = true;
    const message = { 
      command: 'getSchemas', 
      connectionName: newValue,
      type: 'both'
    };
    vscode.postMessage(message);
  } else {
    isLoadingSchemas.value = false;
  }
  
  saveState();
};

const onSourceSchemaChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as HTMLSelectElement;
  const newValue = target.value;
  
  sourceSchema.value = newValue;
  
  sourceTable.value = '';
  sourceTables.value = [];
  
  if (newValue && selectedConnection.value) {
    isLoadingSourceTables.value = true;
    const message = { 
      command: 'getTables', 
      connectionName: selectedConnection.value,
      schemaName: newValue,
      type: 'source'
    };
    vscode.postMessage(message);
  }
  
  saveState();
};

const onTargetSchemaChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as HTMLSelectElement;
  const newValue = target.value;
  
  // Manually update the value
  targetSchema.value = newValue;
  
  targetTable.value = '';
  targetTables.value = [];
  
  if (newValue && selectedConnection.value) {
    isLoadingTargetTables.value = true;
    const message = { 
      command: 'getTables', 
      connectionName: selectedConnection.value,
      schemaName: newValue,
      type: 'target'
    };
    vscode.postMessage(message);
  }
  
  saveState();
};

const onSourceTableChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as HTMLSelectElement;
  sourceTable.value = target.value;
  saveState();
};

const onTargetTableChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as HTMLSelectElement;
  targetTable.value = target.value;
  saveState();
};

const toggleInputsCollapse = () => {
  isInputsCollapsed.value = !isInputsCollapsed.value;
  saveState();
};

const saveState = () => {
  const state = {
    selectedConnection: selectedConnection.value || '',
    sourceSchema: sourceSchema.value || '',
    targetSchema: targetSchema.value || '',
    sourceTable: sourceTable.value || '',
    targetTable: targetTable.value || '',
    isInputsCollapsed: isInputsCollapsed.value || false,
    results: results.value || '',
    error: error.value || '',
    comparisonInfo: {
      source: comparisonInfo.value?.source || '',
      target: comparisonInfo.value?.target || ''
    }
  };
  
  try {
    // Ensure the state is serializable by JSON parsing/stringifying
    const serializedState = JSON.parse(JSON.stringify(state));
    vscode.postMessage({
      command: 'saveState',
      payload: serializedState
    });
  } catch (error) {
    console.error('Error serializing state:', error);
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
  results.value = savedState.results || '';
  error.value = savedState.error || '';
  comparisonInfo.value = savedState.comparisonInfo || { source: '', target: '' };
  
  // If we have connections loaded, restore immediately
  if (connections.value.length > 0) {
    restoreDropdownSelections(savedState);
  }
};

const syncDropdownsWithState = () => {
  const dropdowns = document.querySelectorAll('vscode-dropdown');
  dropdowns.forEach((dropdown: any, index) => {
    const options = dropdown.querySelectorAll('vscode-option');
    
    // Connection dropdown (first one)
    if (index === 0 && selectedConnection.value) {
      dropdown.value = selectedConnection.value;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === selectedConnection.value) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    }
    // Source schema dropdown
    else if (index === 1 && sourceSchema.value) {
      dropdown.value = sourceSchema.value;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === sourceSchema.value) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    }
    // Source table dropdown  
    else if (index === 2 && sourceTable.value) {
      dropdown.value = sourceTable.value;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === sourceTable.value) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    }
    // Target schema dropdown
    else if (index === 3 && targetSchema.value) {
      dropdown.value = targetSchema.value;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === targetSchema.value) {
          dropdown.selectedIndex = i;
          break;
        }
      }
    }
    // Target table dropdown
    else if (index === 4 && targetTable.value) {
      dropdown.value = targetTable.value;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === targetTable.value) {
          dropdown.selectedIndex = i;
          break;
        }
      }
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

const restoreDropdownSelections = (savedState: any) => {
  console.log('Restoring dropdown selections:', savedState);
  
  // Only restore if we have the required data
  if (connections.value.length > 0 && schemas.value.length > 0) {
    selectedConnection.value = savedState.selectedConnection || '';
    sourceSchema.value = savedState.sourceSchema || '';
    targetSchema.value = savedState.targetSchema || '';
    
    // If we have schemas, request tables for the saved schemas
    if (savedState.sourceSchema) {
      isLoadingSourceTables.value = true;
      vscode.postMessage({ 
        command: 'getTables', 
        connectionName: savedState.selectedConnection,
        schemaName: savedState.sourceSchema,
        type: 'source'
      });
    }
    
    if (savedState.targetSchema) {
      isLoadingTargetTables.value = true;
      vscode.postMessage({ 
        command: 'getTables', 
        connectionName: savedState.selectedConnection,
        schemaName: savedState.targetSchema,
        type: 'target'
      });
    }
    
    // Restore table selections after tables are loaded
    setTimeout(() => {
      sourceTable.value = savedState.sourceTable || '';
      targetTable.value = savedState.targetTable || '';
    }, 200);
  }
};

// Enhanced state restoration that handles data loading order
const attemptStateRestoration = () => {
  if (!pendingStateRestore) return;
  
  // Try to restore immediately if we have all required data
  if (connections.value.length > 0 && schemas.value.length > 0) {
    restoreDropdownSelections(pendingStateRestore);
    pendingStateRestore = null;
    return;
  }
  
  // If we don't have connections yet, wait for them
  if (connections.value.length === 0) {
    console.log('Waiting for connections to load before restoring state...');
    return;
  }
  
  // If we have connections but no schemas, request schemas first
  if (schemas.value.length === 0 && pendingStateRestore.selectedConnection) {
    console.log('Requesting schemas for state restoration...');
    isLoadingSchemas.value = true;
    vscode.postMessage({ 
      command: 'getSchemas', 
      connectionName: pendingStateRestore.selectedConnection,
      type: 'both'
    });
  }
};

const executeComparison = () => {
  if (!canExecuteComparison.value) return;
  
  isLoading.value = true;
  results.value = '';
  error.value = '';
  
  vscode.postMessage({
    command: 'executeTableDiff',
    sourceConnection: selectedConnection.value,
    sourceSchema: sourceSchema.value,
    sourceTable: sourceTable.value,
    targetConnection: selectedConnection.value,
    targetSchema: targetSchema.value,
    targetTable: targetTable.value
  });
};

const clearResults = () => {
  results.value = '';
  error.value = '';
  comparisonInfo.value = { source: '', target: '' };
};

const newComparison = () => {
  selectedConnection.value = '';
  sourceSchema.value = '';
  targetSchema.value = '';
  sourceTable.value = '';
  targetTable.value = '';
  
  clearResults();
  
  schemas.value = [];
  sourceTables.value = [];
  targetTables.value = [];
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
    case 'updateConnections':
      connections.value = message.connections || [];
      // Restore connection selection immediately when connections are loaded
      if (pendingStateRestore && connections.value.length > 0) {
        isRestoringState = true;
        
        setTimeout(() => {
          selectedConnection.value = pendingStateRestore.selectedConnection || '';
          
          // If we have a saved connection, request schemas
          if (pendingStateRestore.selectedConnection) {
            setTimeout(() => {
              isLoadingSchemas.value = true;
              vscode.postMessage({ 
                command: 'getSchemas', 
                connectionName: pendingStateRestore.selectedConnection,
                type: 'both'
              });
            }, 100);
          }
        }, 100);
      }
      break;
      
    case 'updateSchemas':
      schemas.value = message.schemas || [];
      isLoadingSchemas.value = false;
      // Restore schema selections when schemas are loaded
      if (pendingStateRestore && schemas.value.length > 0) {
        setTimeout(() => {
          sourceSchema.value = pendingStateRestore.sourceSchema || '';
          targetSchema.value = pendingStateRestore.targetSchema || '';
        }, 100);
        
        // Request tables for saved schemas
        if (pendingStateRestore.sourceSchema && pendingStateRestore.selectedConnection) {
          setTimeout(() => {
            isLoadingSourceTables.value = true;
            vscode.postMessage({ 
              command: 'getTables', 
              connectionName: pendingStateRestore.selectedConnection,
              schemaName: pendingStateRestore.sourceSchema,
              type: 'source'
            });
          }, 100);
        }
        
        if (pendingStateRestore.targetSchema && pendingStateRestore.selectedConnection) {
          setTimeout(() => {
            isLoadingTargetTables.value = true;
            vscode.postMessage({ 
              command: 'getTables', 
              connectionName: pendingStateRestore.selectedConnection,
              schemaName: pendingStateRestore.targetSchema,
              type: 'target'
            });
          }, 100);
        }
      }
      break;
      
    case 'updateTables':
      if (message.type === 'source') {
        sourceTables.value = message.tables || [];
        isLoadingSourceTables.value = false;
        // Restore source table selection if we have pending state
        if (pendingStateRestore && sourceTables.value.length > 0 && pendingStateRestore.sourceTable) {
          setTimeout(() => {
            sourceTable.value = pendingStateRestore.sourceTable;
          }, 50);
        }
      } else if (message.type === 'target') {
        targetTables.value = message.tables || [];
        isLoadingTargetTables.value = false;
        // Restore target table selection if we have pending state
        if (pendingStateRestore && targetTables.value.length > 0 && pendingStateRestore.targetTable) {
          setTimeout(() => {
            targetTable.value = pendingStateRestore.targetTable;
            
            // Clear pending state once all selections are restored
            if (sourceTable.value && targetTable.value) {
              // Force sync all dropdowns with their reactive values
              setTimeout(() => {
                syncDropdownsWithState();
                pendingStateRestore = null;
                isRestoringState = false;
              }, 300);
            }
          }, 50);
        }
      }
      break;
      
    case 'showResults':
      isLoading.value = false;
      if (message.error) {
        error.value = message.error;
        results.value = '';
      } else {
        error.value = '';
        results.value = message.results || '';
        // Auto-collapse inputs when results are shown
        isInputsCollapsed.value = true;
      }
      comparisonInfo.value = {
        source: message.source || '',
        target: message.target || ''
      };
      break;
      
    case 'clearResults':
      clearResults();
      break;
      
    case 'restoreState':
      if (message.payload) {
        restoreFromState(message.payload);
      }
      break;
      
    case 'init':
      // When panel becomes visible again, request state restoration
      vscode.postMessage({ command: 'requestState' });
      startAutoSave(); // Start auto-saving when panel is visible
      break;
      
    case 'panelHidden':
      // When panel becomes hidden, save state and stop auto-save
      saveState();
      stopAutoSave();
      break;
  }
};

onMounted(() => {
  vscode.postMessage({ command: 'getConnections' });
  vscode.postMessage({ command: 'requestState' });
  window.addEventListener('message', handleMessage);
  
  // Save state when component is about to be unmounted
  window.addEventListener('beforeunload', () => {
    saveState();
  });
  
  // Start auto-saving
  startAutoSave();
});
</script>

