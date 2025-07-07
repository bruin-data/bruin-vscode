<template>
  <div class="p-4 bg-editor-bg rounded border border-commandCenter-border space-y-4">
    <h3 class="text-sm font-medium text-editor-fg mb-3">Ingestr Configuration</h3>
    
    <!-- Source Configuration -->
    <div class="space-y-2">
      <h4 class="text-xs font-medium text-editor-fg opacity-70 uppercase tracking-wide mb-2">Source</h4>
      
      <!-- Source Connection -->
      <div class="flex items-center gap-3 py-1">
        <span class="text-xs text-editor-fg min-w-[80px] font-medium">Connection:</span>
        <div 
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.source_connection }"
          @click="startEditing('source_connection')"
        >
          <input 
            v-if="editingField.source_connection"
            v-model="editingValues.source_connection"
            @blur="saveField('source_connection')"
            @keyup.enter="saveField('source_connection')"
            @keyup.escape="cancelEdit('source_connection')"
            :ref="el => { if (el) inputRefs.source_connection = el as HTMLInputElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
            placeholder="Source connection name"
          />
          <span v-else class="block">
            {{ localParameters.source_connection || 'Click to set connection' }}
          </span>
        </div>
      </div>

      <!-- Source Table -->
      <div class="flex items-center gap-3 py-1">
        <span class="text-xs text-editor-fg min-w-[80px] font-medium">Table:</span>
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
          <span v-else class="block">
            {{ localParameters.source_table || 'Click to set table' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Destination Configuration -->
    <div class="space-y-2">
      <h4 class="text-xs font-medium text-editor-fg opacity-70 uppercase tracking-wide mb-2">Destination</h4>
      
      <div class="flex items-center gap-3 py-1">
        <span class="text-xs text-editor-fg min-w-[80px] font-medium">Platform:</span>
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
            <option value="bigquery">BigQuery</option>
            <option value="snowflake">Snowflake</option>
            <option value="redshift">Redshift</option>
            <option value="synapse">Synapse</option>
            <option value="duckdb">DuckDB</option>
          </select>
          <span v-else class="block">
            <span class="inline-flex px-2 py-1 bg-badge-bg text-editor-fg rounded text-xs font-medium" v-if="localParameters.destination">
              {{ destinationDisplayName(localParameters.destination) }}
            </span>
            <span v-else class="italic opacity-60">Click to set destination</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Optional Source Parameter -->
    <div class="space-y-2" v-if="localParameters.source">
      <h4 class="text-xs font-medium text-editor-fg opacity-70 uppercase tracking-wide mb-2">Optional Parameters</h4>
      
      <div class="flex items-center gap-3 py-1">
        <span class="text-xs text-editor-fg min-w-[80px] font-medium">Source:</span>
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
          <span v-else class="block">
            {{ localParameters.source || 'Click to set source' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Incremental Configuration -->
    <div class="space-y-2" v-if="localParameters.incremental_strategy || localParameters.incremental_key">
      <h4 class="text-xs font-medium text-editor-fg opacity-70 uppercase tracking-wide mb-2">Incremental Configuration</h4>
      
      <div class="flex items-center gap-3 py-1" v-if="localParameters.incremental_strategy">
        <span class="text-xs text-editor-fg min-w-[80px] font-medium">Strategy:</span>
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
            <option value="">None</option>
            <option value="replace">Replace</option>
            <option value="append">Append</option>
            <option value="merge">Merge</option>
            <option value="delete+insert">Delete + Insert</option>
          </select>
          <span v-else class="block">
            {{ localParameters.incremental_strategy }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3 py-1" v-if="localParameters.incremental_key">
        <span class="text-xs text-editor-fg min-w-[80px] font-medium">Key:</span>
        <div 
          class="flex-1 text-xs text-editor-fg"
          :class="{ 'cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors': !editingField.incremental_key }"
          @click="startEditing('incremental_key')"
        >
          <input 
            v-if="editingField.incremental_key"
            v-model="editingValues.incremental_key"
            @blur="saveField('incremental_key')"
            @keyup.enter="saveField('incremental_key')"
            @keyup.escape="cancelEdit('incremental_key')"
            :ref="el => { if (el) inputRefs.incremental_key = el as HTMLInputElement }"
            class="bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full"
            placeholder="Incremental key column"
          />
          <span v-else class="block">
            {{ localParameters.incremental_key }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, defineProps, defineEmits } from 'vue';
import type { IngestrParameters } from '@/types';

const props = defineProps<{
  parameters?: Partial<IngestrParameters>;
}>();

const emit = defineEmits<{
  save: [parameters: IngestrParameters];
}>();

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
  const names = {
    bigquery: 'BigQuery',
    snowflake: 'Snowflake', 
    redshift: 'Redshift',
    synapse: 'Synapse',
    duckdb: 'DuckDB'
  };
  return names[dest] || dest;
};

const startEditing = (field: string) => {
  editingField.value[field] = true;
  editingValues.value[field] = localParameters.value[field] || '';
  nextTick(() => {
    const input = inputRefs.value[field];
    if (input) input.focus();
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
  emit('save', { ...localParameters.value });
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