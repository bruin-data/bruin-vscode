<template>
  <div class="flex flex-col w-full h-full">
    <div class="flex-1 overflow-auto">
      <!-- Header with Action Buttons -->
      <div class="p-3 border-b border-panel-border">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="codicon codicon-diff text-blue-500"></span>
            <h3 class="text-sm font-medium text-editor-fg">Table Comparison</h3>
          </div>
          
          <div class="flex items-center gap-2">
            <vscode-button
              :disabled="!canExecuteComparison || isLoading"
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


      <!-- Configuration Section -->
      <div class="border-b border-panel-border">
        <div class="flex items-center justify-between p-3 cursor-pointer" @click="toggleInputsCollapse">
          <div class="flex items-center gap-2">
            <span class="codicon codicon-settings text-editor-fg"></span>
            <span class="text-sm font-medium text-editor-fg">Configuration</span>
          </div>
          <span :class="['codicon', isInputsCollapsed ? 'codicon-chevron-right' : 'codicon-chevron-down', 'text-editor-fg']"></span>
        </div>
        
        <div v-if="!isInputsCollapsed" class="p-4 space-y-6">
          <!-- Connection Mode -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-editor-fg mb-2">Connection Mode</label>
            <vscode-radio-group @change="onConnectionModeRadioChange">
              <vscode-radio 
                value="single" 
                :checked="connectionMode === 'single'"
              >
                Single Connection
              </vscode-radio>
              <vscode-radio 
                value="explicit" 
                :checked="connectionMode === 'explicit'"
              >
                Per-Table Connection
              </vscode-radio>
            </vscode-radio-group>
          </div>

          <!-- Single Connection Mode -->
          <div v-if="connectionMode === 'single'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-editor-fg mb-2">Default Connection</label>
              <vscode-dropdown 
                v-model="defaultConnection" 
                @change="onDefaultConnectionChange"
                class="w-full"
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
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-editor-fg mb-2">
                  <span class="codicon codicon-source-control text-green-500 mr-1"></span>
                  Source Table
                </label>
                <vscode-text-field
                  v-model="sourceTableInput"
                  @input="onSourceTableInput"
                  placeholder="e.g., public.users or users"
                  class="w-full"
                  :disabled="isLoading"
                >
                </vscode-text-field>
                <div class="text-xs text-editor-fg opacity-60 mt-1">
                  Enter schema.table or just table name
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-editor-fg mb-2">
                  <span class="codicon codicon-target text-orange-500 mr-1"></span>
                  Target Table
                </label>
                <vscode-text-field
                  v-model="targetTableInput"
                  @input="onTargetTableInput"
                  placeholder="e.g., public.users or users"
                  class="w-full"
                  :disabled="isLoading"
                >
                </vscode-text-field>
                <div class="text-xs text-editor-fg opacity-60 mt-1">
                  Enter schema.table or just table name
                </div>
              </div>
            </div>
          </div>

          <!-- Explicit Connection Mode -->
          <div v-if="connectionMode === 'explicit'" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Source Configuration -->
              <div class="space-y-3">
                <h4 class="text-sm font-medium text-editor-fg flex items-center gap-2">
                  <span class="codicon codicon-source-control text-green-500"></span>
                  Source
                </h4>
                <div>
                  <label class="block text-xs text-editor-fg mb-1">Connection</label>
                  <vscode-dropdown 
                    v-model="sourceConnection" 
                    @change="onSourceConnectionChange"
                    class="w-full"
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
                <div>
                  <label class="block text-xs text-editor-fg mb-1">Table</label>
                  <vscode-text-field
                    v-model="sourceTableInput"
                    @input="onSourceTableInput"
                    placeholder="e.g., public.users or users"
                    class="w-full"
                    :disabled="isLoading"
                  >
                  </vscode-text-field>
                  <div class="text-xs text-editor-fg opacity-60 mt-1">
                    Enter schema.table or just table name
                  </div>
                </div>
              </div>
              
              <!-- Target Configuration -->
              <div class="space-y-3">
                <h4 class="text-sm font-medium text-editor-fg flex items-center gap-2">
                  <span class="codicon codicon-target text-orange-500"></span>
                  Target
                </h4>
                <div>
                  <label class="block text-xs text-editor-fg mb-1">Connection</label>
                  <vscode-dropdown 
                    v-model="targetConnection" 
                    @change="onTargetConnectionChange"
                    class="w-full"
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
                <div>
                  <label class="block text-xs text-editor-fg mb-1">Table</label>
                  <vscode-text-field
                    v-model="targetTableInput"
                    @input="onTargetTableInput"
                    placeholder="e.g., public.users or users"
                    class="w-full"
                    :disabled="isLoading"
                  >
                  </vscode-text-field>
                  <div class="text-xs text-editor-fg opacity-60 mt-1">
                    Enter schema.table or just table name
                  </div>
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
                {{ comparisonInfo.source }} → {{ comparisonInfo.target }}
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
  connectionMode?: 'single' | 'explicit';
  defaultConnection?: string;
  sourceConnection?: string;
  targetConnection?: string;
  sourceTableInput?: string;
  targetTableInput?: string;
  isInputsCollapsed?: boolean;
}

// State
const connections = ref<Connection[]>([]);

// New connection mode variables
const connectionMode = ref<'single' | 'explicit'>('single');
const defaultConnection = ref('');
const sourceConnection = ref('');
const targetConnection = ref('');
const sourceTableInput = ref('');
const targetTableInput = ref('');

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
const canExecuteComparison = computed(() => {
  const hasSourceTable = sourceTableInput.value.trim().length > 0;
  const hasTargetTable = targetTableInput.value.trim().length > 0;
  
  if (connectionMode.value === 'single') {
    return defaultConnection.value && hasSourceTable && hasTargetTable;
  } else {
    return sourceConnection.value && targetConnection.value && hasSourceTable && hasTargetTable;
  }
});

// Methods
const onConnectionModeRadioChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as any;
  connectionMode.value = target.value as 'single' | 'explicit';
  
  // Clear all selections when mode changes
  defaultConnection.value = '';
  sourceConnection.value = '';
  targetConnection.value = '';
  sourceTableInput.value = '';
  targetTableInput.value = '';
  
  saveState();
};

const onDefaultConnectionChange = (event: Event) => {
  if (isRestoringState) return;
  
  const target = event.target as HTMLSelectElement;
  defaultConnection.value = target.value;
  saveState();
};

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
  
  // If we have connections loaded, sync dropdowns
  if (connections.value.length > 0) {
    setTimeout(() => {
      syncDropdownsWithState();
      pendingStateRestore = null;
    }, 100);
  }
};

const syncDropdownsWithState = () => {
  const dropdowns = document.querySelectorAll('vscode-dropdown');
  dropdowns.forEach((dropdown: any) => {
    const modelValue = dropdown.getAttribute('v-model');
    const options = dropdown.querySelectorAll('vscode-option');
    
    let targetValue = '';
    if (modelValue === 'defaultConnection') {
      targetValue = defaultConnection.value;
    } else if (modelValue === 'sourceConnection') {
      targetValue = sourceConnection.value;
    } else if (modelValue === 'targetConnection') {
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
  const textFields = document.querySelectorAll('vscode-text-field');
  textFields.forEach((field: any) => {
    const modelValue = field.getAttribute('v-model');
    if (modelValue === 'sourceTableInput') {
      field.value = sourceTableInput.value;
    } else if (modelValue === 'targetTableInput') {
      field.value = targetTableInput.value;
    }
  });
  
  // Sync radio buttons
  const radioButtons = document.querySelectorAll('vscode-radio');
  radioButtons.forEach((radio: any) => {
    if (radio.value === connectionMode.value) {
      radio.checked = true;
    } else {
      radio.checked = false;
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
  results.value = '';
  error.value = '';
  
  vscode.postMessage({
    command: 'executeTableDiff',
    connectionMode: connectionMode.value,
    defaultConnection: defaultConnection.value,
    sourceConnection: sourceConnection.value,
    targetConnection: targetConnection.value,
    sourceTable: sourceTableInput.value.trim(),
    targetTable: targetTableInput.value.trim()
  });
};

const clearResults = () => {
  results.value = '';
  error.value = '';
  comparisonInfo.value = { source: '', target: '' };
};

const newComparison = () => {
  connectionMode.value = 'single';
  defaultConnection.value = '';
  sourceConnection.value = '';
  targetConnection.value = '';
  sourceTableInput.value = '';
  targetTableInput.value = '';
  
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
    case 'updateConnections':
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

