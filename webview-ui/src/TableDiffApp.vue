<template>
  <div class="flex flex-col w-full h-full">
    <div
      class="flex items-center justify-between border-b border-t border-panel-border bg-sideBarSectionHeader-bg"
    >
      <div class="flex items-center w-full justify-between h-8">
        <div class="flex items-center gap-2 ml-2">
          <span class="codicon codicon-diff text-blue-500"></span>
          <span class="text-sm font-medium text-editor-fg">Table Diff</span>
        </div>
        <div class="flex items-center gap-2 mr-2">
          <vscode-button
            :disabled="!canExecuteComparison"
            @click="executeComparison"
            appearance="primary"
          >
            <span v-if="!isLoading" class="codicon codicon-play mr-1"></span>
            <span v-if="isLoading" class="spinner mr-1"></span>
            {{ isLoading ? "Comparing..." : "Compare" }}
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

    <div class="flex-1 overflow-auto">
      <!-- Connection Selection -->
      <div class="p-2 border-b border-panel-border">
        <label class="block text-xs text-editor-fg mb-1">Connection</label>
        <vscode-dropdown 
          v-model="selectedConnection" 
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

      <!-- Source and Target Selection -->
      <div class="p-3 border-b border-panel-border">
        <div class="grid grid-cols-2 gap-4">
          <!-- Source Column -->
          <div class="space-y-2">
            <div class="flex items-center mb-2">
              <span class="codicon codicon-source-control text-green-500 mr-1"></span>
              <span class="text-xs font-medium text-editor-fg">Source</span>
            </div>
            
            <div>
              <label class="block text-xs text-editor-fg opacity-75 mb-1">Schema</label>
              <vscode-dropdown 
                v-model="sourceSchema" 
                @change="onSourceSchemaChange"
                class="w-full"
              >
                <vscode-option value="">
                  {{ isLoadingSchemas ? 'Loading...' : 'Schema...' }}
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
            
            <div>
              <label class="block text-xs text-editor-fg opacity-75 mb-1">Table</label>
              <vscode-dropdown 
                v-model="sourceTable" 
                @change="validateForm"
                class="w-full"
              >
                <vscode-option value="">
                  {{ isLoadingSourceTables ? 'Loading...' : 'Table...' }}
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

          <!-- Target Column -->
          <div class="space-y-2">
            <div class="flex items-center mb-2">
              <span class="codicon codicon-target text-orange-500 mr-1"></span>
              <span class="text-xs font-medium text-editor-fg">Target</span>
            </div>
            
            <div>
              <label class="block text-xs text-editor-fg opacity-75 mb-1">Schema</label>
              <vscode-dropdown 
                v-model="targetSchema" 
                @change="onTargetSchemaChange"
                class="w-full"
              >
                <vscode-option value="">
                  {{ isLoadingSchemas ? 'Loading...' : 'Schema...' }}
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
            
            <div>
              <label class="block text-xs text-editor-fg opacity-75 mb-1">Table</label>
              <vscode-dropdown 
                v-model="targetTable" 
                @change="validateForm"
                class="w-full"
              >
                <vscode-option value="">
                  {{ isLoadingTargetTables ? 'Loading...' : 'Table...' }}
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

const onSourceSchemaChange = () => {
  console.log('Source schema changed to:', sourceSchema.value);
  sourceTable.value = '';
  sourceTables.value = [];
  
  if (sourceSchema.value && selectedConnection.value) {
    isLoadingSourceTables.value = true;
    const message = { 
      command: 'getTables', 
      connectionName: selectedConnection.value,
      schemaName: sourceSchema.value,
      type: 'source'
    };
    console.log('Sending getTables message for source:', message);
    vscode.postMessage(message);
  }
  
  validateForm();
};

const onTargetSchemaChange = () => {
  console.log('Target schema changed to:', targetSchema.value);
  targetTable.value = '';
  targetTables.value = [];
  
  if (targetSchema.value && selectedConnection.value) {
    isLoadingTargetTables.value = true;
    const message = { 
      command: 'getTables', 
      connectionName: selectedConnection.value,
      schemaName: targetSchema.value,
      type: 'target'
    };
    console.log('Sending getTables message for target:', message);
    vscode.postMessage(message);
  }
  
  validateForm();
};

const validateForm = () => {
  // Form validation is handled by the computed property canExecuteComparison
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
  // Reset all selections
  selectedConnection.value = '';
  sourceSchema.value = '';
  targetSchema.value = '';
  sourceTable.value = '';
  targetTable.value = '';
  
  // Clear results
  clearResults();
  
  // Clear dependent data
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
  console.log('TableDiffApp received message:', message);
  
  switch (message.command) {
    case 'updateConnections':
      console.log('Received connections:', message.connections);
      connections.value = message.connections || [];
      console.log('Updated connections state:', connections.value);
      break;
      
    case 'updateSchemas':
      // Update schemas for both source and target dropdowns
      console.log('Received schemas:', message.schemas);
      schemas.value = message.schemas || [];
      isLoadingSchemas.value = false;
      console.log('Updated schemas state:', schemas.value);
      break;
      
    case 'updateTables':
      console.log('Received tables:', message.tables, 'type:', message.type);
      if (message.type === 'source') {
        sourceTables.value = message.tables || [];
        isLoadingSourceTables.value = false;
      } else if (message.type === 'target') {
        targetTables.value = message.tables || [];
        isLoadingTargetTables.value = false;
      }
      console.log('Updated tables state - source:', sourceTables.value, 'target:', targetTables.value);
      break;
      
    case 'showResults':
      isLoading.value = false;
      if (message.error) {
        error.value = message.error;
        results.value = '';
      } else {
        error.value = '';
        results.value = message.results || '';
      }
      comparisonInfo.value = {
        source: message.source || '',
        target: message.target || ''
      };
      break;
      
    case 'clearResults':
      clearResults();
      break;
  }
};

// Watchers
watch(selectedConnection, (newValue, oldValue) => {
  console.log('Connection changed from', oldValue, 'to:', newValue);
  
  if (newValue !== oldValue) {
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
      console.log('Requesting schemas for connection:', newValue);
      isLoadingSchemas.value = true;
      // Load schemas for the selected connection
      const message = { 
        command: 'getSchemas', 
        connectionName: newValue,
        type: 'both'
      };
      console.log('Sending message to backend:', message);
      vscode.postMessage(message);
    } else {
      isLoadingSchemas.value = false;
    }
    
    validateForm();
  }
});

// Lifecycle
onMounted(() => {
  console.log('TableDiffApp mounted, requesting connections...');
  // Request connections on load
  vscode.postMessage({ command: 'getConnections' });
  
  // Set up message listener
  window.addEventListener('message', handleMessage);
});
</script>

