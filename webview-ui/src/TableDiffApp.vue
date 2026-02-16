<template>
  <div class="flex flex-col w-full h-full pt-1">
    <div class="flex-1 overflow-auto">
      <div class="flex flex-row items-center gap-4 p-3 bg-editorWidget-bg border border-panel-border rounded-lg">
        <div class="flex flex-row items-center gap-2 flex-1">
          <vscode-dropdown
            v-model="sourceConnection"
            @change="onSourceConnectionChange"
            class="flex-1"
            :disabled="isLoading"
          >
            <vscode-option value="">Connection 1...</vscode-option>
            <vscode-option v-for="conn in connections" :key="conn.name" :value="conn.name">
              {{ conn.name }}{{ conn.environment && conn.environment !== "default" ? ` (${conn.environment})` : "" }}
            </vscode-option>
          </vscode-dropdown>

          <div class="relative flex-1">
            <vscode-text-field
              placeholder="Table 1 (schema.table)"
              v-model="sourceTableInput"
              @input="onSourceTableInput"
              @keydown="onSourceKeyDown"
              @blur="hideSourceSuggestions"
              class="w-full"
              :disabled="isLoading"
            > <span></span> </vscode-text-field>
            
            <div
              v-if="showSourceSuggestions"
              class="absolute top-full left-0 right-0 z-10 bg-editorWidget-bg border border-commandCenter-border rounded-b max-h-40 overflow-auto"
            >
              <div
                v-for="(suggestion, index) in sourceTableSuggestions"
                :key="suggestion"
                @click="selectSourceSuggestion(suggestion)"
                @mousedown.prevent=""
                :class="[
                  'p-1 cursor-pointer text-3xs font-mono text-editor-fg',
                  selectedSourceIndex === index ? 'bg-list-activeSelectionBackground' : 'hover:bg-list-activeSelectionBackground'
                ]"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>
        </div>

        <div class="w-8"></div>

        <div class="flex flex-row items-center gap-2 flex-1">
          <vscode-dropdown
            v-model="targetConnection"
            @change="onTargetConnectionChange"
            class="flex-1"
            :disabled="isLoading"
          >
            <vscode-option value="">Connection 2...</vscode-option>
            <vscode-option v-for="conn in connections" :key="conn.name" :value="conn.name">
              {{ conn.name }}{{ conn.environment && conn.environment !== "default" ? ` (${conn.environment})` : "" }}
            </vscode-option>
          </vscode-dropdown>

          <div class="relative flex-1">
            <vscode-text-field
              v-model="targetTableInput"
              @input="onTargetTableInput"
              @keydown="onTargetKeyDown"
              @blur="hideTargetSuggestions"
              placeholder="Table 2 (schema.table)"
              class="w-full"
              :disabled="isLoading"
            > <span></span> </vscode-text-field>
            
            <div
              v-if="showTargetSuggestions"
              class="absolute top-full left-0 right-0 z-10 bg-editorWidget-bg border border-commandCenter-border rounded-b max-h-40 overflow-auto"
            >
              <div
                v-for="(suggestion, index) in targetTableSuggestions"
                :key="suggestion"
                @click="selectTargetSuggestion(suggestion)"
                @mousedown.prevent=""
                :class="[
                  'p-1 cursor-pointer text-3xs font-mono text-editor-fg',
                  selectedTargetIndex === index ? 'bg-list-activeSelectionBackground' : 'hover:bg-list-activeSelectionBackground'
                ]"
              >
                {{ suggestion }}
              </div>
            </div>
          </div>
        </div>

                 <div class="flex items-center gap-3 ml-auto">
           <div class="flex items-center gap-2">
             <vscode-checkbox
               v-model="fullDataComparison"
               @change="onFullDataChange"
               :disabled="isLoading"
             ></vscode-checkbox>
             <label class="text-xs text-editor-fg cursor-pointer" @click="toggleFullData">
               Full data
             </label>
             <!-- Cost estimate display for BigQuery -->
             <span v-if="costEstimateLoading" class="text-2xs text-editor-fg opacity-60 ml-1">
               <span class="inline-block w-3 h-3 border border-t-transparent border-editor-fg rounded-full animate-spin"></span>
             </span>
             <span
               v-else-if="costEstimate && fullDataComparison && isBigQueryConnection"
               class="text-2xs text-editor-fg opacity-75 ml-1 cursor-help"
               :title="getCostEstimateTooltip()"
             >
               ~{{ formatCostEstimate() }}
             </span>
           </div>
           
          <vscode-button
            v-if="!isLoading"
            :disabled="!canExecuteComparison"
            @click="executeComparison"
            appearance="primary"
          >
            <span class="codicon codicon-play mr-1"></span>
            Compare
          </vscode-button>
          <vscode-button
            v-else
            title="Cancel"
            appearance="secondary"
            @click="cancelComparison"
          >
            <span class="codicon codicon-stop-circle text-red-500 mr-1"></span>
            Cancel
          </vscode-button>
         </div>
      </div>

      <div v-if="hasResults || error" class="flex-1 overflow-auto">
        <div v-if="error" class="p-4 border-b border-panel-border">
          <div class="flex items-center mb-2">
            <span class="codicon codicon-error text-red-500 mr-2"></span>
            <h3 class="text-sm font-medium text-editor-fg">Error</h3>
          </div>
          <div class="text-sm text-red-400 bg-editorWidget-bg p-3 rounded border border-commandCenter-border">
            {{ error }}
          </div>
        </div>

        <div v-if="hasResults" class="mt-2">
          <div class="flex items-center justify-between mb-3 px-4">
            <div class="flex items-center gap-2">
              <span class="codicon codicon-diff text-blue-500"></span>
              <h3 class="text-sm font-medium text-editor-fg">Comparison Results</h3>
              <vscode-badge class="text-3xs opacity-30 bg-transparent text-editor-fg">
                {{ comparisonInfo.source }} → {{ comparisonInfo.target }}
              </vscode-badge>
            </div>
            <div class="flex items-center gap-2">
              <vscode-button :title="copied ? 'Copied!' : 'Copy Results'" appearance="icon" @click="copyResults">
                <span :class="copied ? 'codicon codicon-check text-green-500' : 'codicon codicon-copy text-editor-fg'"></span>
              </vscode-button>
              <vscode-button title="Clear Results" appearance="icon" @click="clearResults">
                <span class="codicon codicon-clear-all text-editor-fg"></span>
              </vscode-button>
            </div>
          </div>

          <TableDiffResults :raw-output="results" />
        </div>
      </div>

      <div v-if="!hasResults && !error && !isLoading" class="flex items-center justify-center h-screen text-center">
        <div class="text-editor-fg opacity-60">
          <span class="codicon codicon-diff text-4xl block mb-2 opacity-40"></span>
          <p class="text-sm">Configure connections and table names to compare</p>
        </div>
      </div>

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
import { ref, computed, onMounted } from "vue";
import { vscode } from "@/utilities/vscode";
import { formatBytes, calculateBigQueryCost } from "@/utilities/helper";
import TableDiffResults from "@/components/table-diff/TableDiffResults.vue";

// Types
interface Connection {
  name: string;
  type: string;
  environment: string;
}

interface ComparisonInfo {
  source: string;
  target: string;
}

// State
const connections = ref<Connection[]>([]);
const sourceConnection = ref("");
const targetConnection = ref("");
const sourceTableInput = ref("");
const targetTableInput = ref("");
const isLoading = ref(false);
const results = ref("");
const error = ref("");
const comparisonInfo = ref<ComparisonInfo>({ source: "", target: "" });
const fullDataComparison = ref(false);

// Cost estimation state
const costEstimate = ref<string | null>(null);
const costEstimateLoading = ref(false);
const costEstimateError = ref<string | null>(null);

// Autocomplete state
const sourceTables = ref<string[]>([]);
const targetTables = ref<string[]>([]);
const sourceTableSuggestions = ref<string[]>([]);
const targetTableSuggestions = ref<string[]>([]);
const showSourceSuggestions = ref(false);
const showTargetSuggestions = ref(false);
const selectedSourceIndex = ref(-1);
const selectedTargetIndex = ref(-1);

// Computed
const hasResults = computed(() => results.value.length > 0);
const canExecuteComparison = computed(() => {
  const hasSourceTable = sourceTableInput.value.trim().length > 0;
  const hasTargetTable = targetTableInput.value.trim().length > 0;
  return sourceConnection.value && targetConnection.value && hasSourceTable && hasTargetTable;
});

// Check if both connections are BigQuery (cost estimation only works for BigQuery)
const isBigQueryConnection = computed(() => {
  const sourceConn = connections.value.find(c => c.name === sourceConnection.value);
  const targetConn = connections.value.find(c => c.name === targetConnection.value);

  if (!sourceConn || !targetConn) return false;

  const isBQ = (type: string) => {
    if (!type) return false;
    const lowerType = type.toLowerCase();
    return lowerType === 'bigquery' || lowerType === 'google_cloud_platform';
  };
  return isBQ(sourceConn.type) && isBQ(targetConn.type);
});

// Whether cost estimation can be requested
const canEstimateCost = computed(() => {
  return fullDataComparison.value &&
         isBigQueryConnection.value &&
         canExecuteComparison.value;
});


// Methods
const onSourceConnectionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  sourceConnection.value = target.value;

  console.log('Source connection changed to:', sourceConnection.value);

  // Clear existing tables and fetch new ones immediately
  sourceTables.value = [];
  sourceTableSuggestions.value = [];
  showSourceSuggestions.value = false;

  // Clear cost estimate when connection changes
  clearCostEstimate();

  // Fetch schemas and tables immediately when connection changes
  if (sourceConnection.value) {
    console.log('Fetching schemas and tables for source connection');
    fetchSchemasAndTables(sourceConnection.value, 'source');
  }
};

const onTargetConnectionChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  targetConnection.value = target.value;

  // Clear existing tables and fetch new ones immediately
  targetTables.value = [];
  targetTableSuggestions.value = [];
  showTargetSuggestions.value = false;

  // Clear cost estimate when connection changes
  clearCostEstimate();

  // Fetch schemas and tables immediately when connection changes
  if (targetConnection.value) {
    console.log('Fetching schemas and tables for target connection');
    fetchSchemasAndTables(targetConnection.value, 'target');
  }
};


const onSourceTableInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  sourceTableInput.value = target.value;
  
  
  // Check if user is typing a schema name followed by a dot
  const schemaMatch = target.value.match(/^([^.]+)\.(.*)$/);
  
  if (schemaMatch) {
    const [, schemaName] = schemaMatch;
    
    // Check if we have actual tables for this schema cached
    const schemaTables = sourceTables.value.filter(table => 
      table.startsWith(schemaName + '.') && table !== schemaName + '.'
    );
    
    if (schemaTables.length === 0 && sourceConnection.value) {
      fetchTablesForSchema(sourceConnection.value, schemaName, 'source');
    }
    
    // Filter table suggestions for this schema
    sourceTableSuggestions.value = sourceTables.value
      .filter(table => table.toLowerCase().startsWith((schemaName + '.').toLowerCase()) && 
                      table.toLowerCase().includes(target.value.toLowerCase()))
      .slice(0, 10);
    showSourceSuggestions.value = sourceTableSuggestions.value.length > 0;
    selectedSourceIndex.value = -1;
  } else if (target.value.length > 0) {
    // Filter schema suggestions
    sourceTableSuggestions.value = sourceTables.value.filter(table =>
      table.toLowerCase().includes(target.value.toLowerCase())
    ).slice(0, 10);
    showSourceSuggestions.value = sourceTableSuggestions.value.length > 0;
  } else {
    showSourceSuggestions.value = false;
    selectedSourceIndex.value = -1;
  }
  
  console.log('Source suggestions:', sourceTableSuggestions.value);
};

// Keyboard navigation for source table
const onSourceKeyDown = (event: KeyboardEvent) => {
  if (!showSourceSuggestions.value || sourceTableSuggestions.value.length === 0) return;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedSourceIndex.value = Math.min(selectedSourceIndex.value + 1, sourceTableSuggestions.value.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedSourceIndex.value = Math.max(selectedSourceIndex.value - 1, 0);
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedSourceIndex.value >= 0) {
        selectSourceSuggestion(sourceTableSuggestions.value[selectedSourceIndex.value]);
      }
      break;
    case 'Escape':
      showSourceSuggestions.value = false;
      selectedSourceIndex.value = -1;
      break;
  }
};

const onTargetTableInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  targetTableInput.value = target.value;
  
  // Check if user is typing a schema name followed by a dot
  const schemaMatch = target.value.match(/^([^.]+)\.(.*)$/);
  
  if (schemaMatch) {
    const [, schemaName] = schemaMatch;
    
    // Check if we have actual tables for this schema cached
    const schemaTables = targetTables.value.filter(table => 
      table.startsWith(schemaName + '.') && table !== schemaName + '.'
    );
    
    if (schemaTables.length === 0 && targetConnection.value) {
      fetchTablesForSchema(targetConnection.value, schemaName, 'target');
    }
    
    // Filter table suggestions for this schema
    targetTableSuggestions.value = targetTables.value
      .filter(table => table.toLowerCase().startsWith((schemaName + '.').toLowerCase()) && 
                      table.toLowerCase().includes(target.value.toLowerCase()))
      .slice(0, 10);
    showTargetSuggestions.value = targetTableSuggestions.value.length > 0;
  } else if (target.value.length > 0) {
    // Filter schema suggestions
    targetTableSuggestions.value = targetTables.value.filter(table =>
      table.toLowerCase().includes(target.value.toLowerCase())
    ).slice(0, 10);
    showTargetSuggestions.value = targetTableSuggestions.value.length > 0;
    selectedTargetIndex.value = -1;
  } else {
    showTargetSuggestions.value = false;
    selectedTargetIndex.value = -1;
  }
};

// Keyboard navigation for target table
const onTargetKeyDown = (event: KeyboardEvent) => {
  if (!showTargetSuggestions.value || targetTableSuggestions.value.length === 0) return;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedTargetIndex.value = Math.min(selectedTargetIndex.value + 1, targetTableSuggestions.value.length - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedTargetIndex.value = Math.max(selectedTargetIndex.value - 1, 0);
      break;
    case 'Enter':
      event.preventDefault();
      if (selectedTargetIndex.value >= 0) {
        selectTargetSuggestion(targetTableSuggestions.value[selectedTargetIndex.value]);
      }
      break;
    case 'Escape':
      showTargetSuggestions.value = false;
      selectedTargetIndex.value = -1;
      break;
  }
};

// Fetch schemas and tables for autocomplete
const fetchSchemasAndTables = async (connectionName: string, type: 'source' | 'target') => {
  try {
    const response = await new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'updateSchemasAndTables' && message.connectionName === connectionName) {
          window.removeEventListener('message', messageHandler);
          resolve(message);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      vscode.postMessage({
        command: 'getSchemasAndTables',
        connectionName,
        type
      });
      
      // Timeout after 3 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        console.log('Timeout fetching schemas and tables for', connectionName);
        resolve({ tables: [] });
      }, 3000);
    });
    
    const tables = (response as any).tables || [];
    if (type === 'source') {
      sourceTables.value = tables;
    } else {
      targetTables.value = tables;
    }
  } catch (error) {
    console.error('Error fetching schemas and tables:', error);
  }
};

// Fetch tables for a specific schema
const fetchTablesForSchema = async (connectionName: string, schemaName: string, type: 'source' | 'target') => {
  try {
    const response = await new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'updateTables' && message.type === type) {
          window.removeEventListener('message', messageHandler);
          resolve(message);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      vscode.postMessage({
        command: 'getTables',
        connectionName,
        schemaName,
        type
      });
      
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        resolve({ tables: [] });
      }, 3000);
    });
    
    const tables = (response as any).tables || [];
    const schemaTables = tables.map((table: any) => `${schemaName}.${table.name}`);
    
    // Add these tables to the existing cache
    if (type === 'source') {
      sourceTables.value = sourceTables.value.filter(t => !t.startsWith(schemaName + '.'));
      sourceTables.value.push(...schemaTables);
    } else {
      targetTables.value = targetTables.value.filter(t => !t.startsWith(schemaName + '.'));
      targetTables.value.push(...schemaTables);
    }
  } catch (error) {
    console.error('Error fetching tables for schema:', error);
  }
};

// Handle suggestion selection
const selectSourceSuggestion = (suggestion: string) => {
  sourceTableInput.value = suggestion;
  showSourceSuggestions.value = false;
  
  // Update the text field value directly
  const textFields = document.querySelectorAll('vscode-text-field');
  const sourceTextField = textFields[0] as any; // First text field is source
  if (sourceTextField) {
    sourceTextField.value = suggestion;
    sourceTextField.setAttribute('current-value', suggestion);
    // Trigger input event to update Vue binding
    sourceTextField.dispatchEvent(new CustomEvent('input', { 
      detail: { value: suggestion },
      bubbles: true 
    }));
  }
};

const selectTargetSuggestion = (suggestion: string) => {
  targetTableInput.value = suggestion;
  showTargetSuggestions.value = false;
  
  // Update the text field value directly
  const textFields = document.querySelectorAll('vscode-text-field');
  const targetTextField = textFields[1] as any; // Second text field is target
  if (targetTextField) {
    targetTextField.value = suggestion;
    targetTextField.setAttribute('current-value', suggestion);
    // Trigger input event to update Vue binding
    targetTextField.dispatchEvent(new CustomEvent('input', { 
      detail: { value: suggestion },
      bubbles: true 
    }));
  }
};

// Hide suggestions when clicking outside
const hideSourceSuggestions = () => {
  setTimeout(() => showSourceSuggestions.value = false, 150);
};

const hideTargetSuggestions = () => {
  setTimeout(() => showTargetSuggestions.value = false, 150);
};

const executeComparison = () => {
  if (!canExecuteComparison.value) return;

  isLoading.value = true;
  results.value = "";
  error.value = "";

  vscode.postMessage({
    command: "executeTableDiff",
    sourceConnection: sourceConnection.value,
    targetConnection: targetConnection.value,
    sourceTable: sourceTableInput.value.trim(),
    targetTable: targetTableInput.value.trim(),
    fullDataDiff: fullDataComparison.value,
  });
};

const cancelComparison = () => {
  vscode.postMessage({
    command: "cancelTableDiff",
  });
};

const clearResults = () => {
  results.value = "";
  error.value = "";
  comparisonInfo.value = { source: "", target: "" };
  fullDataComparison.value = false;
  clearCostEstimate();
};

const copied = ref(false);

const copyResults = () => {
  if (results.value) {
    navigator.clipboard.writeText(results.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
};

const requestCostEstimate = () => {
  if (!canEstimateCost.value) {
    costEstimate.value = null;
    costEstimateError.value = null;
    return;
  }

  costEstimateLoading.value = true;
  costEstimate.value = null;
  costEstimateError.value = null;

  vscode.postMessage({
    command: "estimateDiffCost",
    sourceConnection: sourceConnection.value,
    targetConnection: targetConnection.value,
    sourceTable: sourceTableInput.value.trim(),
    targetTable: targetTableInput.value.trim(),
  });
};

const clearCostEstimate = () => {
  costEstimate.value = null;
  costEstimateError.value = null;
  costEstimateLoading.value = false;
};

// Helper to extract bytes processed from various possible field names
const getBytesProcessed = (estimate: any): number | null => {
  const bytesProcessed = estimate.total_bytes_processed
    || estimate.totalBytesProcessed
    || estimate.TotalBytesProcessed
    || estimate.bytes_processed
    || estimate.bytesProcessed;
  return typeof bytesProcessed === 'number' ? bytesProcessed : null;
};

const formatCostEstimate = (): string => {
  if (!costEstimate.value) return '';

  try {
    const estimate = typeof costEstimate.value === 'string'
      ? JSON.parse(costEstimate.value)
      : costEstimate.value;

    // Try to extract cost from common response formats
    if (estimate.estimated_cost !== undefined) {
      return `$${Number(estimate.estimated_cost).toFixed(2)}`;
    }
    if (estimate.cost !== undefined) {
      return `$${Number(estimate.cost).toFixed(2)}`;
    }

    const bytesProcessed = getBytesProcessed(estimate);
    if (bytesProcessed !== null) {
      return calculateBigQueryCost(bytesProcessed) || '';
    }

    // If we can't parse, just show what we have
    return typeof estimate === 'string' ? estimate : JSON.stringify(estimate);
  } catch (e) {
    return String(costEstimate.value);
  }
};

const getCostEstimateTooltip = (): string => {
  if (!costEstimate.value) return '';

  try {
    const estimate = typeof costEstimate.value === 'string'
      ? JSON.parse(costEstimate.value)
      : costEstimate.value;

    const parts: string[] = ['Estimated cost for full data comparison'];

    const bytesProcessed = getBytesProcessed(estimate);
    if (bytesProcessed) {
      parts.push(`Data to scan: ${formatBytes(bytesProcessed)}`);
    }

    return parts.join('\n');
  } catch (e) {
    return 'Estimated cost for full data comparison';
  }
};

const onFullDataChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  fullDataComparison.value = target.checked;
  console.log('Full data comparison:', fullDataComparison.value);

  if (fullDataComparison.value) {
    requestCostEstimate();
  } else {
    clearCostEstimate();
  }
};

const toggleFullData = () => {
  fullDataComparison.value = !fullDataComparison.value;
  console.log('Full data comparison toggled to:', fullDataComparison.value);

  if (fullDataComparison.value) {
    requestCostEstimate();
  } else {
    clearCostEstimate();
  }
};

// Message handling
const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  
  console.log('Received message:', message);

  switch (message.command) {
    case "updateConnections":
      connections.value = message.connections || [];
      break;

    case "showResults":
      isLoading.value = false;
      console.log('TableDiffApp: Received showResults message:', {
        hasError: !!message.error,
        resultsLength: message.results?.length || 0,
        source: message.source,
        target: message.target
      });
      
      if (message.status === 'cancelled') {
        // Reset to initial state: clear results and error, keep inputs
        clearResults();
        break;
      }
      if (message.error) {
        error.value = message.error;
        results.value = "";
        console.error('TableDiffApp: Error received:', message.error);
      } else {
        error.value = "";
        const resultText = message.results || "";
        results.value = resultText;
        
        if (!resultText || resultText.trim().length === 0) {
          console.warn('TableDiffApp: Warning - received empty results');
          error.value = "No results returned from comparison. Please check the console for details.";
        } else {
          console.log('TableDiffApp: Results received successfully, length:', resultText.length);
        }
      }
      comparisonInfo.value = {
        source: message.source || "",
        target: message.target || "",
      };
      break;

    case "clearResults":
      clearResults();
      break;
      
    case "updateSchemasAndTables":
      console.log('Received updateSchemasAndTables:', message);
      const tables = message.tables || [];
      if (message.type === 'source') {
        sourceTables.value = tables;
        console.log('Updated source tables:', sourceTables.value);
      } else if (message.type === 'target') {
        targetTables.value = tables;
        console.log('Updated target tables:', targetTables.value);
      }
      break;

    case "costEstimate":
      costEstimateLoading.value = false;
      if (message.error) {
        costEstimateError.value = message.error;
        costEstimate.value = null;
      } else {
        costEstimateError.value = null;
        try {
          const parsed = typeof message.result === 'string' ? JSON.parse(message.result) : message.result;
          costEstimate.value = parsed;
        } catch (e) {
          costEstimate.value = message.result;
        }
      }
      break;
  }
};

onMounted(() => {
  vscode.postMessage({ command: "getConnections" });
  window.addEventListener("message", handleMessage);
});
</script>
<style scoped>
vscode-badge::part(control) {
  background-color: transparent !important;
  color: var(--vscode-editor-fg) !important;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>