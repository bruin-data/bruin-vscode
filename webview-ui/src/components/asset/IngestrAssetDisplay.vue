<template>
  <div class="space-y-4">
    <!-- Source Configuration -->
    <div class="border border-commandCenter-border rounded">
      <div class="p-1 bg-editorWidget-bg border-inherit cursor-pointer hover:bg-input-background transition-colors duration-150 rounded-t" @click="toggleSection('source')">
        <div class="flex items-center justify-between w-full">
          <span class="text-xs font-medium text-editor-fg">Source</span>
          <span
            class="codicon transition-transform duration-200"
            :class="expandedSections.source ? 'codicon-chevron-down' : 'codicon-chevron-right'"
          ></span>
        </div>
      </div>

      <div v-if="expandedSections.source" class="p-2 space-y-1 bg-editor-bg border-t border-commandCenter-border rounded-b">
      
      <!-- Source Connection -->
      <div class="flex items-center gap-2">
        <span class="text-2xs text-editor-fg min-w-[80px] opacity-70">Connection:</span>
        <div 
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.source_connection }"
          @click="startEditing('source_connection')"
        >
          <select 
            v-if="editingField.source_connection"
            v-model="editingValues.source_connection"
            @blur="saveField('source_connection')"
            @change="saveField('source_connection')"
            :ref="el => { if (el) inputRefs.source_connection = el as HTMLSelectElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
          >
            <option value="">Select connection...</option>
            <option v-for="connection in availableConnections" :key="connection.name" :value="connection.name">
              {{ connection.name }} ({{ connection.type }})
            </option>
          </select>
          <span v-else class="block" :class="{ 'italic opacity-70': !localParameters.source_connection }">
            {{ localParameters.source_connection || 'Click to set connection' }}
          </span>
        </div>
      </div>

      <!-- Source Table -->
      <div class="flex items-center gap-2">
        <span class="text-2xs text-editor-fg min-w-[80px] opacity-70">Table:</span>
        <div 
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.source_table }"
          @click="startEditing('source_table')"
        >
          <input 
            v-if="editingField.source_table"
            v-model="editingValues.source_table"
            @blur="saveField('source_table')"
            @keyup.enter="saveField('source_table')"
            @keyup.escape="cancelEdit('source_table')"
            :ref="el => { if (el) inputRefs.source_table = el as HTMLInputElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
            placeholder="Source table name"
          />
          <span v-else class="block" :class="{ 'italic opacity-70': !localParameters.source_table }">
            {{ localParameters.source_table || 'Click to set table' }}
          </span>
        </div>
      </div>
      </div>
    </div>

    <!-- Destination Configuration -->
    <div class="border border-commandCenter-border rounded">
      <div class="p-1 bg-editorWidget-bg border-inherit cursor-pointer hover:bg-input-background transition-colors duration-150 rounded-t" @click="toggleSection('destination')">
        <div class="flex items-center justify-between w-full">
          <span class="text-xs font-medium text-editor-fg">Destination</span>
          <span
            class="codicon transition-transform duration-200"
            :class="expandedSections.destination ? 'codicon-chevron-down' : 'codicon-chevron-right'"
          ></span>
        </div>
      </div>

      <div v-if="expandedSections.destination" class="p-2 space-y-1 bg-editor-bg border-t border-commandCenter-border rounded-b">
      
      <div class="flex items-center gap-2">
        <span class="text-2xs text-editor-fg min-w-[80px] opacity-70">Platform:</span>
        <div 
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.destination }"
          @click="startEditing('destination')"
        >
          <select 
            v-if="editingField.destination"
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
          <span v-else class="block" :class="{ 'italic opacity-70': !localParameters.destination }">
            {{ localParameters.destination ? destinationDisplayName(localParameters.destination) : 'Click to set destination' }}
          </span>
        </div>
      </div>
      </div>
    </div>

    <!-- Optional Parameters -->
    <div class="border border-commandCenter-border rounded">
      <div class="p-1 bg-editorWidget-bg border-inherit cursor-pointer hover:bg-input-background transition-colors duration-150 rounded-t" @click="toggleSection('optional')">
        <div class="flex items-center justify-between w-full">
          <span class="text-xs font-medium text-editor-fg">Optional Parameters</span>
          <span
            class="codicon transition-transform duration-200"
            :class="expandedSections.optional ? 'codicon-chevron-down' : 'codicon-chevron-right'"
          ></span>
        </div>
      </div>

      <div v-if="expandedSections.optional" class="p-2 space-y-1 bg-editor-bg border-t border-commandCenter-border rounded-b">
        
        <!-- Source Identifier -->
        <div class="flex items-center gap-2">
          <span class="text-2xs text-editor-fg min-w-[80px] opacity-70">Source:</span>
          <div 
            class="flex-1 text-xs text-editor-fg"
            :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.source }"
            @click="startEditing('source')"
          >
            <input 
              v-if="editingField.source"
              v-model="editingValues.source"
              @blur="saveField('source')"
              @keyup.enter="saveField('source')"
              @keyup.escape="cancelEdit('source')"
              :ref="el => { if (el) inputRefs.source = el as HTMLInputElement }"
              class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
              placeholder="Source identifier"
            />
            <span v-else class="block" :class="{ 'italic opacity-70': !localParameters.source }">
              {{ localParameters.source || 'Click to set source' }}
            </span>
          </div>
        </div>

        <!-- Incremental Strategy -->
        <div class="flex items-center gap-2">
          <span class="text-2xs text-editor-fg min-w-[80px] opacity-70">Strategy:</span>
          <div 
            class="flex-1 text-xs text-editor-fg"
            :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.incremental_strategy }"
            @click="startEditing('incremental_strategy')"
          >
            <select 
              v-if="editingField.incremental_strategy"
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
            <span v-else class="block" :class="{ 'italic opacity-70': !localParameters.incremental_strategy }">
              {{ localParameters.incremental_strategy || 'Click to set strategy' }}
            </span>
          </div>
        </div>

        <!-- Incremental Key -->
        <div class="flex items-center gap-2">
          <span class="text-2xs text-editor-fg min-w-[80px] opacity-70">Key:</span>
          <div 
            class="flex-1 text-xs text-editor-fg"
            :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.incremental_key }"
            @click="startEditing('incremental_key')"
          >
            <select 
              v-if="editingField.incremental_key"
              v-model="editingValues.incremental_key"
              @blur="saveField('incremental_key')"
              @change="saveField('incremental_key')"
              :ref="el => { if (el) inputRefs.incremental_key = el as HTMLSelectElement }"
              class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
            >
              <option value="">Select column...</option>
              <option v-for="column in availableColumns" :key="column" :value="column">
                {{ column }}
              </option>
            </select>
            <span v-else class="block" :class="{ 'italic opacity-70': !localParameters.incremental_key }">
              {{ localParameters.incremental_key || 'Click to set key' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, defineProps, defineEmits } from 'vue';
import type { IngestrParameters } from '@/types';
import { vscode } from '@/utilities/vscode';

const props = defineProps<{
  parameters?: Partial<IngestrParameters>;
}>();

const emit = defineEmits<{
  save: [parameters: IngestrParameters];
}>();

const availableConnections = ref<Array<{ name: string; type: string }>>([]);

// Collapsible sections state
const expandedSections = ref({
  source: true,
  destination: true,
  optional: false,
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

// Template refs for inputs
const inputRefs = ref<Record<string, HTMLInputElement | HTMLSelectElement>>({});

const destinationDisplayName = (dest: string) => {
  const destination = AVAILABLE_DESTINATIONS.find(d => d.value === dest);
  return destination?.label || dest;
};


// Available destinations for Ingestr
const AVAILABLE_DESTINATIONS = [
  { value: 'aws_athena', label: 'AWS Athena' },
  { value: 'clickhouse', label: 'Clickhouse' },
  { value: 'databricks', label: 'Databricks' },
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'google_bigquery', label: 'Google BigQuery' },
  { value: 'microsoft_sql_server', label: 'Microsoft SQL Server' },
  { value: 'postgres', label: 'Postgres' },
  { value: 'redshift', label: 'Redshift' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'synapse', label: 'Synapse' },
  { value: 'aws_emr_serverless', label: 'AWS EMR Serverless' }
] as const;

// Available incremental strategies
const INCREMENTAL_STRATEGIES = [
  { value: '', label: 'None' },
  { value: 'replace', label: 'Replace' },
  { value: 'append', label: 'Append' },
  { value: 'merge', label: 'Merge' },
  { value: 'delete+insert', label: 'Delete + Insert' }
] as const;

// Mock available columns - in real implementation, this would come from API/props
const availableColumns = computed(() => {
  // This would typically be fetched from the source table schema
  return [
    'id',
    'created_at',
    'updated_at',
    'timestamp',
    'date',
    'user_id',
    'order_id',
    'customer_id'
  ];
});

const startEditing = (field: string) => {
  editingField.value[field] = true;
  editingValues.value[field] = localParameters.value[field] || '';
  nextTick(() => {
    const input = inputRefs.value[field];
    if (input) {
      input.focus();
    }
  });
};

const saveField = (field: string) => {
  localParameters.value[field] = editingValues.value[field];
  editingField.value[field] = false;
  saveParameters();
};

const cancelEdit = (field: string) => {
  editingField.value[field] = false;
  editingValues.value[field] = localParameters.value[field] || '';
};

const saveParameters = () => {
  // Filter out empty/undefined values before saving
  const filteredParameters: Partial<IngestrParameters> = {};
  
  Object.entries(localParameters.value).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      filteredParameters[key as keyof IngestrParameters] = value;
    }
  });
  
  emit('save', filteredParameters as IngestrParameters);
};

onMounted(() => {
  vscode.postMessage({ command: "bruin.getConnectionsList" });
  window.addEventListener("message", handleMessage);
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  if (message.command === "connections-list-message") {
    handleConnectionsList(message.payload);
  }
};

const handleConnectionsList = (payload: any) => {
  console.log("Received connections list in IngestrAssetDisplay:", payload);
  if (payload.message && Array.isArray(payload.message)) {
    availableConnections.value = payload.message.map((conn: any) => ({
      name: conn.name,
      type: conn.type || 'unknown'
    }));
  }
};

watch(
  () => props.parameters,
  (newParameters) => {
    if (newParameters) {
      localParameters.value = {
        ...localParameters.value,
        ...newParameters,
      };
    }
  },
  { deep: true, immediate: true }
);
</script>