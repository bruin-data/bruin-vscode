<template>
  <div class="flex flex-col w-full h-full">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-t border-panel-border bg-sideBarSectionHeader-bg p-4">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-semibold text-editor-fg">Table Diff</h2>
      </div>
      <div class="flex items-center gap-2">
        <vscode-button 
          v-if="!isLoading"
          title="Compare Tables" 
          appearance="primary" 
          @click="executeComparison"
          :disabled="!canExecuteComparison"
        >
          <span class="codicon codicon-play mr-2"></span>
          Compare Tables
        </vscode-button>
        <vscode-button
          v-if="isLoading"
          title="Comparing..."
          appearance="secondary"
          disabled
        >
          <span class="spinner mr-2"></span>
          Comparing...
        </vscode-button>
        <vscode-button 
          v-if="hasResults"
          title="New Comparison" 
          appearance="secondary" 
          @click="newComparison"
        >
          <span class="codicon codicon-add mr-2"></span>
          New
        </vscode-button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 p-4 space-y-6">
      <!-- Connection Selection -->
      <div class="form-section">
        <h3 class="text-md font-medium text-editor-fg mb-4">Connection</h3>
        <div class="form-group">
          <label class="text-sm text-editor-fg mb-2">Select Connection</label>
          <vscode-dropdown 
            v-model="selectedConnection" 
            @change="onConnectionChange"
            class="w-full"
          >
            <vscode-option value="">Select connection...</vscode-option>
            <vscode-option 
              v-for="conn in connections" 
              :key="conn.name" 
              :value="conn.name"
            >
              {{ conn.name }}
            </vscode-option>
          </vscode-dropdown>
        </div>
      </div>

      <!-- Schema and Table Selection -->
      <div class="form-section">
        <h3 class="text-md font-medium text-editor-fg mb-4">Compare Tables</h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Source -->
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-editor-fg border-b border-editor-border pb-2">Source</h4>
            
            <div class="form-group">
              <label class="text-sm text-editor-fg mb-2">Schema</label>
              <vscode-dropdown 
                v-model="sourceSchema" 
                @change="onSourceSchemaChange"
                :disabled="!selectedConnection"
                class="w-full"
              >
                <vscode-option value="">Select schema...</vscode-option>
                <vscode-option 
                  v-for="schema in schemas" 
                  :key="schema.name" 
                  :value="schema.name"
                >
                  {{ schema.name }}
                </vscode-option>
              </vscode-dropdown>
            </div>

            <div class="form-group">
              <label class="text-sm text-editor-fg mb-2">Table</label>
              <vscode-dropdown 
                v-model="sourceTable" 
                @change="validateForm"
                :disabled="!sourceSchema"
                class="w-full"
              >
                <vscode-option value="">Select table...</vscode-option>
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

          <!-- Target -->
          <div class="space-y-4">
            <h4 class="text-sm font-medium text-editor-fg border-b border-editor-border pb-2">Target</h4>
            
            <div class="form-group">
              <label class="text-sm text-editor-fg mb-2">Schema</label>
              <vscode-dropdown 
                v-model="targetSchema" 
                @change="onTargetSchemaChange"
                :disabled="!selectedConnection"
                class="w-full"
              >
                <vscode-option value="">Select schema...</vscode-option>
                <vscode-option 
                  v-for="schema in schemas" 
                  :key="schema.name" 
                  :value="schema.name"
                >
                  {{ schema.name }}
                </vscode-option>
              </vscode-dropdown>
            </div>

            <div class="form-group">
              <label class="text-sm text-editor-fg mb-2">Table</label>
              <vscode-dropdown 
                v-model="targetTable" 
                @change="validateForm"
                :disabled="!targetSchema"
                class="w-full"
              >
                <vscode-option value="">Select table...</vscode-option>
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
      <div v-if="hasResults" class="results-container">
        <div class="comparison-info">
          <h3 class="text-md font-medium text-editor-fg mb-2">✅ Table Comparison Complete</h3>
          <div class="text-sm text-editor-fg opacity-70 mb-4">
            <div>Source: {{ comparisonInfo.source }}</div>
            <div>Target: {{ comparisonInfo.target }}</div>
          </div>
        </div>
        
        <div class="results-content">
          <pre class="text-xs font-mono text-editor-fg whitespace-pre-wrap">{{ results }}</pre>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!hasResults && !isLoading" class="empty-state text-center py-12">
        <div class="text-editor-fg opacity-50 mb-4">
          <span class="codicon codicon-database text-6xl"></span>
        </div>
        <h3 class="text-lg font-medium text-editor-fg mb-2">No Comparison Results</h3>
        <p class="text-sm text-editor-fg opacity-70">
          Select source and target tables, then click "Compare Tables" to analyze differences.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
const results = ref('');
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
const onConnectionChange = () => {
  // Clear dependent selections
  sourceSchema.value = '';
  targetSchema.value = '';
  sourceTable.value = '';
  targetTable.value = '';
  
  if (selectedConnection.value) {
    // Load schemas for both source and target
    vscode.postMessage({ 
      command: 'getSchemas', 
      connectionName: selectedConnection.value,
      type: 'source'
    });
    vscode.postMessage({ 
      command: 'getSchemas', 
      connectionName: selectedConnection.value,
      type: 'target'
    });
  }
  
  validateForm();
};

const onSourceSchemaChange = () => {
  sourceTable.value = '';
  
  if (sourceSchema.value && selectedConnection.value) {
    vscode.postMessage({ 
      command: 'getTables', 
      connectionName: selectedConnection.value,
      schemaName: sourceSchema.value,
      type: 'source'
    });
  }
  
  validateForm();
};

const onTargetSchemaChange = () => {
  targetTable.value = '';
  
  if (targetSchema.value && selectedConnection.value) {
    vscode.postMessage({ 
      command: 'getTables', 
      connectionName: selectedConnection.value,
      schemaName: targetSchema.value,
      type: 'target'
    });
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

const newComparison = () => {
  // Reset all selections
  selectedConnection.value = '';
  sourceSchema.value = '';
  targetSchema.value = '';
  sourceTable.value = '';
  targetTable.value = '';
  
  // Clear results
  results.value = '';
  comparisonInfo.value = { source: '', target: '' };
  
  // Clear dependent data
  schemas.value = [];
  sourceTables.value = [];
  targetTables.value = [];
};

// Message handling
const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  
  switch (message.command) {
    case 'updateConnections':
      connections.value = message.connections || [];
      break;
      
    case 'updateSchemas':
      if (message.type === 'source' || message.type === 'target') {
        schemas.value = message.schemas || [];
      }
      break;
      
    case 'updateTables':
      if (message.type === 'source') {
        sourceTables.value = message.tables || [];
      } else if (message.type === 'target') {
        targetTables.value = message.tables || [];
      }
      break;
      
    case 'showResults':
      isLoading.value = false;
      results.value = message.results || '';
      comparisonInfo.value = {
        source: message.source || '',
        target: message.target || ''
      };
      break;
      
    case 'clearResults':
      results.value = '';
      comparisonInfo.value = { source: '', target: '' };
      break;
  }
};

// Lifecycle
onMounted(() => {
  // Request connections on load
  vscode.postMessage({ command: 'getConnections' });
  
  // Set up message listener
  window.addEventListener('message', handleMessage);
});
</script>

<style scoped>
.form-section {
  border: 1px solid var(--vscode-editor-border);
  border-radius: 0.375rem;
  padding: 1.5rem;
  background-color: var(--vscode-editor-background);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vscode-editor-foreground);
  margin-bottom: 0.5rem;
}

.results-container {
  border: 1px solid var(--vscode-editor-border);
  border-radius: 0.375rem;
  background-color: var(--vscode-editor-background);
}

.comparison-info {
  background-color: var(--vscode-inputValidation-infoBackground);
  border: 1px solid var(--vscode-inputValidation-infoBorder);
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.comparison-info h3 {
  font-size: 1rem;
  font-weight: 500;
  color: var(--vscode-inputValidation-infoForeground);
  margin-bottom: 0.5rem;
}

.results-content {
  background-color: var(--vscode-textCodeBlock-background);
  border-radius: 0.375rem;
  padding: 1rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.75rem;
  overflow: auto;
  max-height: 24rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 0;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid var(--vscode-progressBar-foreground);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<style>
/* VS Code Theme Colors */
:root {
  --editor-bg: var(--vscode-editor-background);
  --editor-fg: var(--vscode-editor-foreground);
  --panel-border: var(--vscode-panel-border);
  --editor-border: var(--vscode-editor-border);
  --sideBarSectionHeader-bg: var(--vscode-sideBarSectionHeader-background);
  --inputValidation-infoBackground: var(--vscode-inputValidation-infoBackground);
  --inputValidation-infoBorder: var(--vscode-inputValidation-infoBorder);
  --inputValidation-infoForeground: var(--vscode-inputValidation-infoForeground);
  --textCodeBlock-background: var(--vscode-textCodeBlock-background);
  --progressBar-background: var(--vscode-progressBar-background);
  --progressBar-foreground: var(--vscode-progressBar-foreground);
}

/* Utility classes */
.bg-editor-background { background-color: var(--editor-bg); }
.bg-sideBarSectionHeader-bg { background-color: var(--sideBarSectionHeader-bg); }
.bg-inputValidation-infoBackground { background-color: var(--inputValidation-infoBackground); }
.bg-textCodeBlock-background { background-color: var(--textCodeBlock-background); }

.text-editor-fg { color: var(--editor-fg); }
.text-inputValidation-infoForeground { color: var(--inputValidation-infoForeground); }

.border-editor-border { border-color: var(--editor-border); }
.border-panel-border { border-color: var(--panel-border); }
.border-inputValidation-infoBorder { border-color: var(--inputValidation-infoBorder); }

.border-b { border-bottom-width: 1px; }
.border-t { border-top-width: 1px; }

.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }

.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }
.pb-2 { padding-bottom: 0.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mr-2 { margin-right: 0.5rem; }

.space-y-4 > * + * { margin-top: 1rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.gap-6 { gap: 1.5rem; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }

.w-full { width: 100%; }
.h-full { height: 100%; }
.text-center { text-align: center; }

.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-md { font-size: 1rem; line-height: 1.5rem; }
.text-6xl { font-size: 3.75rem; line-height: 1; }

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; }

.opacity-50 { opacity: 0.5; }
.opacity-70 { opacity: 0.7; }

.whitespace-pre-wrap { white-space: pre-wrap; }
.overflow-auto { overflow: auto; }
.max-h-96 { max-height: 24rem; }

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Responsive */
@media (min-width: 1024px) {
  .lg\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
