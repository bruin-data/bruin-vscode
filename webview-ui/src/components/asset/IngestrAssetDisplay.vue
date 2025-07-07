<template>
  <div class="ingestr-display space-y-4">
    <h3 class="text-sm font-medium text-editor-fg mb-3">Ingestr Configuration</h3>
    
    <!-- Source Configuration -->
    <div class="parameter-section">
      <h4 class="section-title">Source</h4>
      
      <!-- Source Connection -->
      <div class="parameter-row">
        <span class="parameter-label">Connection:</span>
        <div 
          class="parameter-value" 
          :class="{ 'editable': !editingField.source_connection }"
          @click="startEditing('source_connection')"
        >
          <input 
            v-if="editingField.source_connection"
            v-model="editingValues.source_connection"
            @blur="saveField('source_connection')"
            @keyup.enter="saveField('source_connection')"
            @keyup.escape="cancelEdit('source_connection')"
            ref="source_connectionInput"
            class="inline-edit-input"
            placeholder="Source connection name"
          />
          <span v-else class="display-value">
            {{ localParameters.source_connection || 'Click to set connection' }}
          </span>
        </div>
      </div>

      <!-- Source Table -->
      <div class="parameter-row">
        <span class="parameter-label">Table:</span>
        <div 
          class="parameter-value" 
          :class="{ 'editable': !editingField.source_table }"
          @click="startEditing('source_table')"
        >
          <input 
            v-if="editingField.source_table"
            v-model="editingValues.source_table"
            @blur="saveField('source_table')"
            @keyup.enter="saveField('source_table')"
            @keyup.escape="cancelEdit('source_table')"
            ref="source_tableInput"
            class="inline-edit-input"
            placeholder="Source table name"
          />
          <span v-else class="display-value">
            {{ localParameters.source_table || 'Click to set table' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Destination Configuration -->
    <div class="parameter-section">
      <h4 class="section-title">Destination</h4>
      
      <div class="parameter-row">
        <span class="parameter-label">Platform:</span>
        <div 
          class="parameter-value" 
          :class="{ 'editable': !editingField.destination }"
          @click="startEditing('destination')"
        >
          <select 
            v-if="editingField.destination"
            v-model="editingValues.destination"
            @blur="saveField('destination')"
            @change="saveField('destination')"
            ref="destinationInput"
            class="inline-edit-select"
          >
            <option value="">Select destination...</option>
            <option value="bigquery">BigQuery</option>
            <option value="snowflake">Snowflake</option>
            <option value="redshift">Redshift</option>
            <option value="synapse">Synapse</option>
            <option value="duckdb">DuckDB</option>
          </select>
          <span v-else class="display-value">
            <span class="destination-badge" v-if="localParameters.destination">
              {{ destinationDisplayName(localParameters.destination) }}
            </span>
            <span v-else class="placeholder">Click to set destination</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Optional Source Parameter -->
    <div class="parameter-section" v-if="localParameters.source">
      <h4 class="section-title">Optional Parameters</h4>
      
      <div class="parameter-row">
        <span class="parameter-label">Source:</span>
        <div 
          class="parameter-value" 
          :class="{ 'editable': !editingField.source }"
          @click="startEditing('source')"
        >
          <input 
            v-if="editingField.source"
            v-model="editingValues.source"
            @blur="saveField('source')"
            @keyup.enter="saveField('source')"
            @keyup.escape="cancelEdit('source')"
            ref="sourceInput"
            class="inline-edit-input"
            placeholder="Source identifier"
          />
          <span v-else class="display-value">
            {{ localParameters.source || 'Click to set source' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Incremental Configuration -->
    <div class="parameter-section" v-if="localParameters.incremental_strategy || localParameters.incremental_key">
      <h4 class="section-title">Incremental Configuration</h4>
      
      <div class="parameter-row" v-if="localParameters.incremental_strategy">
        <span class="parameter-label">Strategy:</span>
        <div 
          class="parameter-value" 
          :class="{ 'editable': !editingField.incremental_strategy }"
          @click="startEditing('incremental_strategy')"
        >
          <select 
            v-if="editingField.incremental_strategy"
            v-model="editingValues.incremental_strategy"
            @blur="saveField('incremental_strategy')"
            @change="saveField('incremental_strategy')"
            ref="incremental_strategyInput"
            class="inline-edit-select"
          >
            <option value="">None</option>
            <option value="replace">Replace</option>
            <option value="append">Append</option>
            <option value="merge">Merge</option>
            <option value="delete+insert">Delete + Insert</option>
          </select>
          <span v-else class="display-value">
            {{ localParameters.incremental_strategy }}
          </span>
        </div>
      </div>

      <div class="parameter-row" v-if="localParameters.incremental_key">
        <span class="parameter-label">Key:</span>
        <div 
          class="parameter-value" 
          :class="{ 'editable': !editingField.incremental_key }"
          @click="startEditing('incremental_key')"
        >
          <input 
            v-if="editingField.incremental_key"
            v-model="editingValues.incremental_key"
            @blur="saveField('incremental_key')"
            @keyup.enter="saveField('incremental_key')"
            @keyup.escape="cancelEdit('incremental_key')"
            ref="incremental_keyInput"
            class="inline-edit-input"
            placeholder="Incremental key column"
          />
          <span v-else class="display-value">
            {{ localParameters.incremental_key }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, defineProps, defineEmits } from 'vue';

interface IngestrParameters {
  source?: string;
  source_connection: string;
  source_table: string;
  destination: string;
  incremental_strategy?: string;
  incremental_key?: string;
}

const props = defineProps<{
  parameters?: Partial<IngestrParameters>;
}>();

const emit = defineEmits<{
  save: [parameters: IngestrParameters];
}>();

const localParameters = ref<IngestrParameters>({
  source: '',
  source_connection: '',
  source_table: '',
  destination: '',
  incremental_strategy: '',
  incremental_key: '',
  ...props.parameters,
});

const editingField = ref<Record<string, boolean>>({});
const editingValues = ref<Record<string, string>>({});

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
    const input = (this.$refs as any)[`${field}Input`];
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

<style scoped>
.ingestr-display {
  @apply p-4 bg-editor-bg rounded border border-commandCenter-border;
}

.parameter-section {
  @apply space-y-2;
}

.section-title {
  @apply text-xs font-medium text-editor-fg opacity-70 uppercase tracking-wide mb-2;
}

.parameter-row {
  @apply flex items-center gap-3 py-1;
}

.parameter-label {
  @apply text-xs text-editor-fg min-w-[80px] font-medium;
}

.parameter-value {
  @apply flex-1 text-xs text-editor-fg;
}

.parameter-value.editable {
  @apply cursor-pointer hover:bg-input-background px-2 py-1 rounded transition-colors;
}

.display-value {
  @apply block;
}

.placeholder {
  @apply italic opacity-60;
}

.destination-badge {
  @apply inline-flex px-2 py-1 bg-badge-bg text-editor-fg rounded text-xs font-medium;
}

.inline-edit-input, .inline-edit-select {
  @apply bg-input-background text-input-foreground text-xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg px-2 py-1 rounded w-full;
}

</style>