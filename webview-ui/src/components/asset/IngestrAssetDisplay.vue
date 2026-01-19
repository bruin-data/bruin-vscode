<template>
  <div id="ingestr-asset-display" class="space-y-4">
    <!-- Ingestr Configuration -->
    <div id="ingestr-section" class="border border-commandCenter-border rounded">
      <div id="ingestr-header" class="p-1 bg-editorWidget-bg border-inherit cursor-pointer hover:bg-input-background transition-colors duration-150 rounded-t" @click="toggleSection('ingestr')">
        <div class="flex items-center justify-between w-full">
          <span id="ingestr-title" class="text-xs font-medium text-editor-fg pl-1">Ingestr</span>
          <span
            id="ingestr-chevron"
            class="codicon transition-transform duration-200"
            :class="expandedSections.ingestr ? 'codicon-chevron-down' : 'codicon-chevron-right'"
          ></span>
        </div>
      </div>

      <div v-if="expandedSections.ingestr" id="ingestr-content" class="p-2 space-y-1 bg-editor-bg border-t border-commandCenter-border rounded-b">
      
      <!-- Source Connection -->
      <div id="source-connection-row" class="flex items-center gap-2">
        <span 
          id="source-connection-label"
          class="text-2xs min-w-[140px] cursor-help" 
          :class="!localParameters.source_connection ? 'text-errorForeground' : 'text-editor-fg opacity-70'"
          title="The database connection to extract data from. Must be configured in your .bruin.yml file."
        >Source Connection: <span class="text-errorForeground">*</span></span>
        <div 
          id="source-connection-field"
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.source_connection }"
          @click="startEditing('source_connection')"
        >
          <select 
            v-if="editingField.source_connection"
            id="source-connection-select"
            v-model="editingValues.source_connection"
            @blur="saveField('source_connection')"
            @change="saveField('source_connection')"
            :ref="el => { if (el) inputRefs.source_connection = el as HTMLSelectElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
          >
            <option value="">Select connection...</option>
            <option v-for="connection in availableSourceConnections" :key="connection.name" :value="connection.name">
              {{ connection.name }} ({{ connection.type }})
            </option>
          </select>
          <span v-else id="source-connection-value" class="block" :class="{ 'italic opacity-70': !localParameters.source_connection, 'text-errorForeground': !localParameters.source_connection }">
            {{ localParameters.source_connection || 'Required: Click to set connection' }}
          </span>
        </div>
      </div>

      <!-- Source Table -->
      <div id="source-table-row" class="flex items-center gap-2">
        <span 
          id="source-table-label"
          class="text-2xs min-w-[140px] cursor-help text-editor-fg opacity-70" 
          title="The name of the table/view to extract data from in your source database."
        >Source Table: <span class="text-errorForeground">*</span></span>
        <div 
          id="source-table-field"
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.source_table }"
          @click="!editingField.source_table && startEditing('source_table')"
        >
          <div v-if="editingField.source_table" class="flex items-center gap-1 w-full" @click.stop @keydown.escape="cancelEdit('source_table')">
            <select 
              v-if="availableSourceTables.length > 0 && !isCustomSourceTable"
              id="source-table-select"
              v-model="editingValues.source_table"
              @change="handleSourceTableChange"
              @blur="handleSourceTableBlur"
              :ref="el => { if (el) inputRefs.source_table = el as HTMLSelectElement }"
              class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded flex-1"
            >
              <option value="">Select table...</option>
              <option v-for="table in availableSourceTables" :key="table" :value="table">
                {{ table }}
              </option>
              <option value="__CUSTOM__">Enter custom table...</option>
            </select>
            <input 
              v-else
              id="source-table-input"
              v-model="editingValues.source_table"
              @blur="saveField('source_table')"
              @keyup.enter="saveField('source_table')"
              @keyup.escape="cancelEdit('source_table')"
              :ref="el => { if (el) inputRefs.source_table = el as HTMLInputElement }"
              class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
              :placeholder="isLoadingSourceTables ? 'Loading tables...' : 'Enter table name'"
            />
            <span v-if="isLoadingSourceTables" class="codicon codicon-loading codicon-modifier-spin text-xs"></span>
          </div>
          <span v-else id="source-table-value" class="block" :class="{ 'italic opacity-70': !localParameters.source_table }">
            {{ localParameters.source_table || 'Click to select table' }}
          </span>
        </div>
      </div>

      <!-- Destination Platform -->
      <div id="destination-row" class="flex items-center gap-2">
        <span 
          id="destination-label"
          class="text-2xs min-w-[140px] cursor-help" 
          :class="!localParameters.destination ? 'text-errorForeground' : 'text-editor-fg opacity-70'"
          title="The target platform where data will be loaded (e.g., Snowflake, BigQuery, Postgres)."
        >Destination Platform: <span class="text-errorForeground">*</span></span>
        <div 
          id="destination-field"
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.destination }"
          @click="startEditing('destination')"
        >
          <select 
            v-if="editingField.destination"
            id="destination-select"
            v-model="editingValues.destination"
            @blur="saveField('destination')"
            @change="saveField('destination')"
            :ref="el => { if (el) inputRefs.destination = el as HTMLSelectElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
          >
            <option value="">Select destination...</option>
            <option v-for="dest in AVAILABLE_DESTINATIONS" :key="dest.value" :value="dest.value">
              {{ dest.label }}
            </option>
          </select>
          <span v-else id="destination-value" class="block" :class="{ 'italic opacity-70': !localParameters.destination, 'text-errorForeground': !localParameters.destination }">
            {{ localParameters.destination ? destinationDisplayName(localParameters.destination) : 'Required: Click to set destination' }}
          </span>
        </div>
      </div>


      <!-- Incremental Strategy -->
      <div id="incremental-strategy-row" class="flex items-center gap-2">
        <span 
          id="incremental-strategy-label"
          class="text-2xs text-editor-fg opacity-70 min-w-[140px] cursor-help" 
          title="How to handle incremental data updates: replace (full refresh), append (add new rows), merge (upsert), or delete+insert."
        >Incremental Strategy:</span>
        <div 
          id="incremental-strategy-field"
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.incremental_strategy }"
          @click="startEditing('incremental_strategy')"
        >
          <select 
            v-if="editingField.incremental_strategy"
            id="incremental-strategy-select"
            v-model="editingValues.incremental_strategy"
            @blur="saveField('incremental_strategy')"
            @change="saveField('incremental_strategy')"
            :ref="el => { if (el) inputRefs.incremental_strategy = el as HTMLSelectElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
          >
            <option v-for="strategy in INCREMENTAL_STRATEGIES" :key="strategy.value" :value="strategy.value">
              {{ strategy.label }}
            </option>
          </select>
          <span v-else id="incremental-strategy-value" class="block" :class="{ 'italic opacity-70': !localParameters.incremental_strategy }">
            {{ localParameters.incremental_strategy || 'Click to set strategy' }}
          </span>
        </div>
      </div>

      <!-- Incremental Key -->
      <div id="incremental-key-row" class="flex items-center gap-2">
        <span 
          id="incremental-key-label"
          class="text-2xs text-editor-fg opacity-70 min-w-[140px] cursor-help" 
          title="The column used to identify new/updated records (e.g., timestamp, id). Required for incremental strategies."
        >Incremental Key:</span>
        <div 
          id="incremental-key-field"
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.incremental_key }"
          @click="startEditing('incremental_key')"
        >
          <div v-if="editingField.incremental_key" class="flex items-center gap-1 w-full">
            <select 
              v-if="!isCustomIncrementalKey"
              id="incremental-key-select"
              v-model="editingValues.incremental_key"
              @change="handleIncrementalKeyChange"
              @blur="handleIncrementalKeyBlur"
              :ref="el => { if (el) inputRefs.incremental_key = el as HTMLSelectElement }"
              class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded flex-1"
            >
              <option value="">Select column...</option>
              <option v-for="column in availableColumns" :key="column" :value="column">
                {{ column }}
              </option>
              <option value="__CUSTOM__">Add custom value...</option>
            </select>
            <input 
              v-else
              id="incremental-key-input"
              v-model="editingValues.incremental_key"
              @blur="saveField('incremental_key')"
              @keyup.enter="saveField('incremental_key')"
              @keyup.escape="cancelEdit('incremental_key')"
              :ref="el => { if (el) inputRefs.incremental_key = el as HTMLInputElement }"
              class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
              placeholder="Enter custom column name"
            />
          </div>
          <span v-else id="incremental-key-value" class="block" :class="{ 'italic opacity-70': !localParameters.incremental_key }">
            {{ localParameters.incremental_key || 'Click to set key' }}
          </span>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import type { IngestrParameters } from '@/types';
import { vscode } from '@/utilities/vscode';

const props = defineProps<{
  parameters: Partial<IngestrParameters>;
  columns: any[];
}>();

const emit = defineEmits<{
  save: [parameters: IngestrParameters];
}>();

const availableConnections = ref<Array<{ name: string; type: string }>>([]);

// Collapsible sections state
const expandedSections = ref({
  ingestr: true,
});

const toggleSection = (section: string) => {
  expandedSections.value[section] = !expandedSections.value[section];
};

const localParameters = ref<IngestrParameters>({
  source: props.parameters?.source || '',
  source_connection: props.parameters?.source_connection || '',
  source_table: props.parameters?.source_table || '',
  destination: props.parameters?.destination || '',
  incremental_strategy: props.parameters?.incremental_strategy || '',
  incremental_key: props.parameters?.incremental_key || '',
});

const editingField = ref<Record<string, boolean>>({});
const editingValues = ref<Record<string, string>>({});
const inputRefs = ref<Record<string, HTMLInputElement | HTMLSelectElement>>({});
const isCustomIncrementalKey = ref(false);
const isCustomSourceTable = ref(false);

const destinationDisplayName = (dest: string) => {
  const destination = AVAILABLE_DESTINATIONS.find(d => d.value === dest);
  return destination?.label || dest;
};


// Available destinations for Ingestr
const AVAILABLE_DESTINATIONS = [
  { value: 'athena', label: 'AWS Athena' },
  { value: 'clickhouse', label: 'Clickhouse' },
  { value: 'databricks', label: 'Databricks' },
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'bigquery', label: 'Google BigQuery' },
  { value: 'mssql', label: 'Microsoft SQL Server' },
  { value: 'postgres', label: 'Postgres' },
  { value: 'redshift', label: 'Redshift' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'synapse', label: 'Synapse' },
  { value: 'gcs', label: 'Google Cloud Storage' },
] as const;

// Available incremental strategies
const INCREMENTAL_STRATEGIES = [
  { value: '', label: 'None' },
  { value: 'replace', label: 'Replace' },
  { value: 'append', label: 'Append' },
  { value: 'merge', label: 'Merge' },
  { value: 'delete+insert', label: 'Delete + Insert' }
] as const;

// Data platform types (destinations) - these should NOT appear in source connections
const DATA_PLATFORM_TYPES = [
  'athena',
  'bigquery',
  'snowflake',
  'postgres',
  'redshift',
  'mssql',
  'databricks',
  'synapse',
  'duckdb',
  'clickhouse',
  'gcs',
  'mongo_atlas',
  'mysql',
  'elasticsearch'
] as const;

// Source tables state
const availableSourceTables = ref<string[]>([]);
const isLoadingSourceTables = ref(false);

// Filtered source connections (exclude data platforms)
const availableSourceConnections = computed(() => {
  return availableConnections.value.filter(conn => 
    !DATA_PLATFORM_TYPES.includes(conn.type.toLowerCase() as any)
  );
});

const availableColumns = computed(() => {
  if (!props.columns || !Array.isArray(props.columns)) {
    return [];
  }
  
  const columns = props.columns.map(column => {
    if (typeof column === 'string') {
      return column;
    } else if (column && typeof column === 'object' && column.name) {
      return column.name;
    } else if (column && typeof column === 'object' && column.value) {
      return column.value;
    }
    return null;
  }).filter(Boolean);
  
  const currentValue = localParameters.value.incremental_key || '';
  if (currentValue && !columns.includes(currentValue)) {
    return [currentValue, ...columns];
  }
  
  return columns;
});

const startEditing = (field: string) => {
  editingField.value[field] = true;
  editingValues.value[field] = localParameters.value[field] || '';
  
  if (field === 'incremental_key') {
    const currentValue = localParameters.value.incremental_key || '';
    isCustomIncrementalKey.value = false;
  }
  
  if (field === 'source_table') {
    isCustomSourceTable.value = false;
    console.log('🔍 [IngestrAssetDisplay] Starting source_table edit:', {
      availableTables: availableSourceTables.value.length,
      isLoading: isLoadingSourceTables.value,
      isCustom: isCustomSourceTable.value,
      sourceConnection: localParameters.value.source_connection
    });
    // If we have a source connection but no tables loaded yet, fetch them
    if (localParameters.value.source_connection && availableSourceTables.value.length === 0 && !isLoadingSourceTables.value) {
      fetchSourceTables(localParameters.value.source_connection);
    }
  }
  
  nextTick(() => {
    const input = inputRefs.value[field];
    if (input) {
      input.focus();
    }
  });
};

const handleIncrementalKeyChange = () => {
  if (editingValues.value.incremental_key === '__CUSTOM__') {
    // Switch to custom input mode
    isCustomIncrementalKey.value = true;
    editingValues.value.incremental_key = '';
    nextTick(() => {
      const input = inputRefs.value.incremental_key;
      if (input && 'focus' in input) {
        input.focus();
      }
    });
  } else if (editingValues.value.incremental_key && editingValues.value.incremental_key !== '__CUSTOM__') {
    saveField('incremental_key');
    isCustomIncrementalKey.value = false;
  }
};

const handleIncrementalKeyBlur = () => {
  if (editingValues.value.incremental_key && editingValues.value.incremental_key !== '__CUSTOM__') {
    saveField('incremental_key');
    isCustomIncrementalKey.value = false;
  }
};

const saveField = (field: string) => {
  localParameters.value[field] = editingValues.value[field];
  editingField.value[field] = false;
  
  // Reset custom mode flag when saving incremental_key
  if (field === 'incremental_key') {
    isCustomIncrementalKey.value = false;
  }
  
  // Reset custom mode flag when saving source_table
  if (field === 'source_table') {
    isCustomSourceTable.value = false;
  }
  
  // When source_connection changes, fetch available tables
  if (field === 'source_connection' && editingValues.value[field]) {
    // Clear current source table since connection changed
    localParameters.value.source_table = '';
    
    // Save with source_table explicitly cleared
    const updatedParameters = { ...props.parameters };
    Object.entries(localParameters.value).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        updatedParameters[key] = value;
      }
    });
    // Explicitly set source_table to empty
    updatedParameters.source_table = '';
    
    emit('save', updatedParameters as IngestrParameters);
    
    // Then fetch new tables
    fetchSourceTables(editingValues.value[field]);
    return; // Skip the regular saveParameters call
  }
  
  saveParameters();
};

const cancelEdit = (field: string) => {
  editingField.value[field] = false;
  editingValues.value[field] = localParameters.value[field] || '';
  
  if (field === 'incremental_key') {
    isCustomIncrementalKey.value = false;
  }
  
  if (field === 'source_table') {
    isCustomSourceTable.value = false;
  }
};

const saveParameters = () => {
  const updatedParameters = { ...props.parameters };
  
  Object.entries(localParameters.value).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      updatedParameters[key] = value;
    }
  });
  
  emit('save', updatedParameters as IngestrParameters);
};

onMounted(() => {
  window.addEventListener("message", handleMessage);
  // Request connections list when component mounts
  vscode.postMessage({ command: "bruin.getConnectionsList" });
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  if (message.command === "connections-list-message") {
    handleConnectionsList(message.payload);
  } else if (message.command === "ingestr-sources-message") {
    handleIngestrSources(message.payload);
  }
};

const handleConnectionsList = (payload: any) => {
  console.log('📥 [IngestrAssetDisplay] Received connections:', payload);
  if (payload.status === "success" && payload.message) {
    const data = payload.message;
    const parsedConnections: Array<{ name: string; type: string }> = [];
    
    if (Array.isArray(data)) {
      // Old format - array of connections with type property
      data.forEach((conn: any) => {
        if (conn.name && conn.type) {
          parsedConnections.push({ name: conn.name, type: conn.type });
        }
      });
    } else if (data && data.environments) {
      // New format - nested structure: environments -> env_name -> connections -> type -> [connections]
      // Use selected_environment if available, otherwise use first environment
      const envName = data.selected_environment_name || data.default_environment_name || Object.keys(data.environments)[0];
      const envConnections = data.environments[envName]?.connections || {};
      
      // Iterate through connection types (e.g., "fireflies", "chess", "bigquery")
      Object.keys(envConnections).forEach((connectionType: string) => {
        const connectionsOfType = envConnections[connectionType];
        if (Array.isArray(connectionsOfType)) {
          connectionsOfType.forEach((conn: any) => {
            if (conn.name) {
              parsedConnections.push({ name: conn.name, type: connectionType });
            }
          });
        }
      });
    } else if (data && data.selected_environment?.connections) {
      // Alternative format with selected_environment directly
      const envConnections = data.selected_environment.connections;
      Object.keys(envConnections).forEach((connectionType: string) => {
        const connectionsOfType = envConnections[connectionType];
        if (Array.isArray(connectionsOfType)) {
          connectionsOfType.forEach((conn: any) => {
            if (conn.name) {
              parsedConnections.push({ name: conn.name, type: connectionType });
            }
          });
        }
      });
    }
    
    availableConnections.value = parsedConnections;
    console.log('📋 [IngestrAssetDisplay] Parsed connections:', availableConnections.value);
    console.log('🔍 [IngestrAssetDisplay] Filtered source connections:', availableSourceConnections.value);
  }
};

const handleIngestrSources = (payload: any) => {
  console.log('📥 [IngestrAssetDisplay] Received ingestr sources:', payload);
  isLoadingSourceTables.value = false;
  if (payload.status === "success" && payload.message) {
    if (Array.isArray(payload.message)) {
      availableSourceTables.value = payload.message;
      console.log('✅ [IngestrAssetDisplay] Stored source tables:', availableSourceTables.value.length, 'tables');
    } else {
      availableSourceTables.value = [];
      console.warn('⚠️ [IngestrAssetDisplay] Message is not an array:', typeof payload.message);
    }
  } else {
    console.error("❌ [IngestrAssetDisplay] Error fetching ingestr sources:", payload.message);
    availableSourceTables.value = [];
  }
};

// Get the connection type from the connection name
const getConnectionType = (connectionName: string): string | null => {
  const connection = availableConnections.value.find(conn => conn.name === connectionName);
  return connection ? connection.type : null;
};

// Fetch available source tables for the selected source connection
const fetchSourceTables = (connectionName: string) => {
  const sourceType = getConnectionType(connectionName);
  console.log(`📤 [IngestrAssetDisplay] Fetching source tables for connection: "${connectionName}", type: "${sourceType}"`);
  if (sourceType) {
    isLoadingSourceTables.value = true;
    availableSourceTables.value = [];
    isCustomSourceTable.value = false;
    console.log(`📤 [IngestrAssetDisplay] Sending bruin.getIngestrSourceTables with sourceType: "${sourceType}"`);
    vscode.postMessage({
      command: "bruin.getIngestrSourceTables",
      payload: { sourceType }
    });
  } else {
    console.warn(`⚠️ [IngestrAssetDisplay] Could not find connection type for: "${connectionName}"`);
  }
};

// Handle source table dropdown change
const handleSourceTableChange = () => {
  console.log('🔄 [IngestrAssetDisplay] Source table changed:', editingValues.value.source_table);
  if (editingValues.value.source_table === '__CUSTOM__') {
    console.log('✏️ [IngestrAssetDisplay] Switching to custom input');
    isCustomSourceTable.value = true;
    editingValues.value.source_table = '';
    nextTick(() => {
      const input = inputRefs.value.source_table;
      if (input && 'focus' in input) {
        input.focus();
        console.log('✅ [IngestrAssetDisplay] Custom input focused');
      }
    });
  } else if (editingValues.value.source_table && editingValues.value.source_table !== '__CUSTOM__') {
    // Save immediately when a table is selected
    console.log('💾 [IngestrAssetDisplay] Saving selected table:', editingValues.value.source_table);
    saveField('source_table');
    isCustomSourceTable.value = false;
  }
};

const handleSourceTableBlur = () => {
  // Don't do anything on blur if we're switching to custom input
  if (isCustomSourceTable.value) {
    return;
  }
  
  // If blur with no selection, cancel editing
  if (!editingValues.value.source_table || editingValues.value.source_table === '') {
    cancelEdit('source_table');
  }
};

// Track previous source connection to detect actual changes
const previousSourceConnection = ref<string>('');

watch(
  () => props.parameters,
  (newParameters) => {
    if (newParameters) {
      const newSourceConnection = newParameters.source_connection || '';
      const sourceConnectionChanged = previousSourceConnection.value !== newSourceConnection;
      
      console.log('👁️ [IngestrAssetDisplay] Watcher triggered:', {
        previousConn: previousSourceConnection.value,
        newConn: newSourceConnection,
        changed: sourceConnectionChanged,
        currentTables: availableSourceTables.value.length
      });
      
      // Reset all fields to empty, then apply new parameters
      localParameters.value = {
        source: newParameters.source || '',
        source_connection: newSourceConnection,
        source_table: newParameters.source_table || '',
        destination: newParameters.destination || '',
        incremental_strategy: newParameters.incremental_strategy || '',
        incremental_key: newParameters.incremental_key || '',
      };
      
      // Clear any editing states when switching assets
      editingField.value = {};
      editingValues.value = {};
      isCustomIncrementalKey.value = false;
      isCustomSourceTable.value = false;
      
      // Only clear source tables if source connection actually changed (switching assets)
      if (sourceConnectionChanged) {
        console.log('🧹 [IngestrAssetDisplay] Clearing tables due to source connection change');
        availableSourceTables.value = [];
        isLoadingSourceTables.value = false;
        previousSourceConnection.value = newSourceConnection;
      } else {
        console.log('✅ [IngestrAssetDisplay] Keeping tables (no connection change)');
      }
    }
  },
  { deep: true, immediate: true }
);
</script>