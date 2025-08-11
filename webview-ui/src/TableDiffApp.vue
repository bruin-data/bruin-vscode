<template>
  <div class="table-diff-container">
    <div class="header">
      <h2>Table Diff</h2>
      <p>Compare tables across environments or connections</p>
    </div>
    
    <div class="diff-controls">
      <div class="table-selection">
        <div class="source-table">
          <h3>Source Table</h3>
          <vscode-dropdown 
            id="source-connection" 
            v-model="sourceConnection"
            @change="handleSourceConnectionChange"
          >
            <vscode-option value="">Select connection...</vscode-option>
            <vscode-option 
              v-for="connection in connections" 
              :key="connection.name"
              :value="connection.name"
            >
              {{ connection.name }}
            </vscode-option>
          </vscode-dropdown>
          
          <vscode-dropdown 
            id="source-schema" 
            v-model="sourceSchema"
            @change="handleSourceSchemaChange"
          >
            <vscode-option value="">Select schema...</vscode-option>
            <vscode-option 
              v-for="schema in sourceSchemas" 
              :key="schema"
              :value="schema"
            >
              {{ schema }}
            </vscode-option>
          </vscode-dropdown>
          
          <vscode-dropdown 
            id="source-table" 
            v-model="sourceTable"
            @change="handleSourceTableChange"
          >
            <vscode-option value="">Select table...</vscode-option>
            <vscode-option 
              v-for="table in sourceTables" 
              :key="table"
              :value="table"
            >
              {{ table }}
            </vscode-option>
          </vscode-dropdown>
        </div>
        
        <div class="target-table">
          <h3>Target Table</h3>
          <vscode-dropdown 
            id="target-connection" 
            v-model="targetConnection"
            @change="handleTargetConnectionChange"
          >
            <vscode-option value="">Select connection...</vscode-option>
            <vscode-option 
              v-for="connection in connections" 
              :key="connection.name"
              :value="connection.name"
            >
              {{ connection.name }}
            </vscode-option>
          </vscode-dropdown>
          
          <vscode-dropdown 
            id="target-schema" 
            v-model="targetSchema"
            @change="handleTargetSchemaChange"
          >
            <vscode-option value="">Select schema...</vscode-option>
            <vscode-option 
              v-for="schema in targetSchemas" 
              :key="schema"
              :value="schema"
            >
              {{ schema }}
            </vscode-option>
          </vscode-dropdown>
          
          <vscode-dropdown 
            id="target-table" 
            v-model="targetTable"
            @change="handleTargetTableChange"
          >
            <vscode-option value="">Select table...</vscode-option>
            <vscode-option 
              v-for="table in targetTables" 
              :key="table"
              :value="table"
            >
              {{ table }}
            </vscode-option>
          </vscode-dropdown>
        </div>
      </div>
      
      <div class="diff-options">
        <vscode-button 
          id="compare-btn" 
          @click="handleCompare"
        >
          Compare Tables
        </vscode-button>
        <vscode-button 
          id="clear-btn" 
          appearance="secondary"
          @click="handleClear"
        >
          Clear
        </vscode-button>
      </div>
    </div>
    
    <div v-if="showResults" class="diff-results">
      <div v-if="isLoading" class="loading-container">
        <vscode-progress-ring></vscode-progress-ring>
        <p>Comparing tables...</p>
      </div>
      
      <div v-else class="results-container">
        <div v-if="error" class="error-message">
          <h3>Error</h3>
          <p>{{ error }}</p>
        </div>
        
        <div v-else-if="results" class="diff-summary">
          <h3>Comparison Results</h3>
          <p>Diff results would be displayed here</p>
          <pre>{{ JSON.stringify(results, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

// VS Code API
declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

let vscode: any;

// Check if vscode API is already available
if ((window as any).vscode) {
  vscode = (window as any).vscode;
} else {
  try {
    vscode = acquireVsCodeApi();
    // Store it on window for other scripts
    (window as any).vscode = vscode;
  } catch (error) {
    console.error('Failed to acquire VS Code API:', error);
    vscode = null;
  }
}

// Reactive state
const sourceConnection = ref('')
const sourceSchema = ref('')
const sourceTable = ref('')
const targetConnection = ref('')
const targetSchema = ref('')
const targetTable = ref('')

const connections = ref<Array<{name: string}>>([])
const sourceSchemas = ref<string[]>([])
const sourceTables = ref<string[]>([])
const targetSchemas = ref<string[]>([])
const targetTables = ref<string[]>([])

const isLoading = ref(false)
const showResults = ref(false)
const results = ref(null)
const error = ref('')

// Computed
const canCompare = computed(() => {
  return sourceConnection.value && sourceSchema.value && sourceTable.value && 
         targetConnection.value && targetSchema.value && targetTable.value
})

// Methods
const updateCompareButtonState = () => {
  // This is handled by the computed property now
}

const handleSourceConnectionChange = (event: any) => {
  const newValue = event.target?.value || event.target?.currentValue
  if (newValue) {
    sourceConnection.value = newValue
  }
}

const handleTargetConnectionChange = (event: any) => {
  const newValue = event.target?.value || event.target?.currentValue
  if (newValue) {
    targetConnection.value = newValue
  }
}

const handleSourceSchemaChange = (event: any) => {
  const newValue = event.target?.value || event.target?.currentValue
  if (newValue) {
    sourceSchema.value = newValue
  }
}

const handleTargetSchemaChange = (event: any) => {
  const newValue = event.target?.value || event.target?.currentValue
  if (newValue) {
    targetSchema.value = newValue
  }
}

const handleSourceTableChange = (event: any) => {
  console.log('Vue: handleSourceTableChange triggered:', event)
  const newValue = event.target?.value || event.target?.currentValue
  if (newValue) {
    console.log('Vue: Manually setting sourceTable to:', newValue)
    sourceTable.value = newValue
  }
}

const handleTargetTableChange = (event: any) => {
  console.log('Vue: handleTargetTableChange triggered:', event)
  const newValue = event.target?.value || event.target?.currentValue
  if (newValue) {
    console.log('Vue: Manually setting targetTable to:', newValue)
    targetTable.value = newValue
  }
}

const handleCompare = () => {
  console.log('Vue: handleCompare clicked')
  console.log('Vue: canCompare:', canCompare.value)
  console.log('Vue: vscode available:', !!vscode)
  console.log('Vue: source values:', {
    connection: sourceConnection.value,
    schema: sourceSchema.value, 
    table: sourceTable.value
  })
  console.log('Vue: target values:', {
    connection: targetConnection.value,
    schema: targetSchema.value,
    table: targetTable.value
  })
  
  if (!canCompare.value || !vscode) {
    console.log('Vue: Cannot compare - missing requirements')
    return
  }

  console.log('Vue: Sending compare message')
  setLoading(true)
  error.value = ''
  
  vscode.postMessage({
    command: 'bruin.compareTables',
    payload: {
      source: {
        connection: sourceConnection.value,
        schema: sourceSchema.value,
        table: sourceTable.value
      },
      target: {
        connection: targetConnection.value,
        schema: targetSchema.value,
        table: targetTable.value
      }
    }
  })
}

const handleClear = () => {
  clearResults()
  if (vscode) {
    vscode.postMessage({
      command: 'bruin.clearDiff'
    })
  }
}

const setLoading = (loading: boolean) => {
  isLoading.value = loading
  showResults.value = loading || results.value !== null || error.value !== ''
}

const clearResults = () => {
  showResults.value = false
  results.value = null
  error.value = ''
  isLoading.value = false
}

const handleDiffResult = (payload: any) => {
  if (payload.status === 'loading') {
    setLoading(true)
    return
  }
  
  setLoading(false)
  
  if (payload.status === 'success') {
    results.value = payload.result
    error.value = ''
  } else {
    results.value = null
    error.value = payload.message || 'Failed to compare tables'
  }
}

const handleError = (errorData: any) => {
  setLoading(false)
  error.value = errorData.message || 'Failed to compare tables'
  results.value = null
}

const handleInit = () => {
  console.log('Table Diff panel initialized')
  // Request available connections
  requestConnections()
}

const requestConnections = () => {
  if (vscode) {
    vscode.postMessage({
      command: 'bruin.getConnections'
    })
  }
}

const requestSchemas = (connectionName: string, environment?: string) => {
  if (vscode && connectionName) {
    vscode.postMessage({
      command: 'bruin.getSchemas',
      payload: { connectionName, environment }
    })
  }
}

const requestTables = (connectionName: string, schemaName: string, environment?: string) => {
  if (vscode && connectionName && schemaName) {
    vscode.postMessage({
      command: 'bruin.getTables',
      payload: { connectionName, schemaName, environment }
    })
  }
}

const handleConnectionsData = (payload: any) => {
  if (payload.status === 'success') {
    connections.value = payload.connections
  } else {
    console.error('Failed to load connections:', payload.message)
  }
}

const handleSchemasData = (payload: any) => {
  if (payload.status === 'success') {
    const isSource = payload.connectionName === sourceConnection.value
    const isTarget = payload.connectionName === targetConnection.value
    
    if (isSource) {
      sourceSchemas.value = payload.schemas
    }
    if (isTarget) {
      targetSchemas.value = payload.schemas
    }
  } else {
    console.error('Failed to load schemas:', payload.message)
  }
}

const handleTablesData = (payload: any) => {
  if (payload.status === 'success') {
    const isSource = payload.connectionName === sourceConnection.value && payload.schemaName === sourceSchema.value
    const isTarget = payload.connectionName === targetConnection.value && payload.schemaName === targetSchema.value
    
    if (isSource) {
      sourceTables.value = payload.tables
    }
    if (isTarget) {
      targetTables.value = payload.tables
    }
  } else {
    console.error('Failed to load tables:', payload.message)
  }
}

// Message listener
const setupMessageListener = () => {
  window.addEventListener('message', (event) => {
    const message = event.data
    
    switch (message.command) {
      case 'init':
        handleInit()
        break
      case 'table-diff-result':
        handleDiffResult(message.payload)
        break
      case 'table-diff-clear':
        clearResults()
        break
      case 'table-diff-error':
        handleError(message.payload)
        break
      case 'connections-data':
        handleConnectionsData(message.payload)
        break
      case 'schemas-data':
        handleSchemasData(message.payload)
        break
      case 'tables-data':
        handleTablesData(message.payload)
        break
      case 'table-diff-result':
        handleDiffResult(message.payload)
        break
    }
  })
}

// Watchers for dropdown changes
watch(sourceConnection, (newConnection) => {
  if (newConnection) {
    sourceSchema.value = ''
    sourceTable.value = ''
    sourceSchemas.value = []
    sourceTables.value = []
    
    const connection = connections.value.find(c => c.name === newConnection)
    requestSchemas(newConnection, connection?.environment)
  }
})

watch(sourceSchema, (newSchema) => {
  if (newSchema && sourceConnection.value) {
    sourceTable.value = ''
    sourceTables.value = []
    
    const connection = connections.value.find(c => c.name === sourceConnection.value)
    requestTables(sourceConnection.value, newSchema, connection?.environment)
  }
})

watch(targetConnection, (newConnection) => {
  if (newConnection) {
    targetSchema.value = ''
    targetTable.value = ''
    targetSchemas.value = []
    targetTables.value = []
    
    const connection = connections.value.find(c => c.name === newConnection)
    requestSchemas(newConnection, connection?.environment)
  }
})

watch(targetSchema, (newSchema) => {
  if (newSchema && targetConnection.value) {
    targetTable.value = ''
    targetTables.value = []
    
    const connection = connections.value.find(c => c.name === targetConnection.value)
    requestTables(targetConnection.value, newSchema, connection?.environment)
  }
})

// Lifecycle
onMounted(() => {
  setupMessageListener()
})
</script>

<style scoped>
.table-diff-container {
  padding: 16px;
}

.header {
  margin-bottom: 20px;
}

.header h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.header p {
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
}

.diff-controls {
  margin-bottom: 24px;
}

.table-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 16px;
}

.source-table, .target-table {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 16px;
}

.source-table h3, .target-table h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.source-table vscode-dropdown, .target-table vscode-dropdown {
  width: 100%;
  margin-bottom: 8px;
}

.diff-options {
  display: flex;
  gap: 12px;
  align-items: center;
}

.diff-results {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
}

.loading-container p {
  margin: 16px 0 0 0;
  color: var(--vscode-descriptionForeground);
}

.diff-summary {
  padding: 16px;
}

.diff-summary h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.error-message {
  padding: 16px;
  background: var(--vscode-inputValidation-errorBackground);
  border: 1px solid var(--vscode-inputValidation-errorBorder);
  border-radius: 4px;
}

.error-message h3 {
  margin: 0 0 8px 0;
  color: var(--vscode-inputValidation-errorForeground);
}

.error-message p {
  margin: 0;
  color: var(--vscode-inputValidation-errorForeground);
}
</style>