<template>
  <div class="space-y-4 p-4 bg-editor-bg rounded-md border border-commandCenter-border">
    <h3 class="text-sm font-medium text-editor-fg">Ingestr Parameters</h3>
    
    <!-- Source Connection -->
    <div class="field-group">
      <label class="field-label">Source Connection</label>
      <input
        v-model="localParameters.source_connection"
        class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        placeholder="Source connection name"
      />
    </div>

    <!-- Source Table -->
    <div class="field-group">
      <label class="field-label">Source Table</label>
      <input
        v-model="localParameters.source_table"
        class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        placeholder="Source table name"
      />
    </div>

    <!-- Destination -->
    <div class="field-group">
      <label class="field-label">Destination</label>
      <select
        v-model="localParameters.destination"
        class="w-full bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
      >
        <option value="">Select destination...</option>
        <option value="bigquery">BigQuery</option>
        <option value="snowflake">Snowflake</option>
        <option value="redshift">Redshift</option>
        <option value="synapse">Synapse</option>
        <option value="duckdb">DuckDB</option>
      </select>
    </div>

    <!-- Source (Optional) -->
    <div class="field-group">
      <label class="field-label">Source</label>
      <input
        v-model="localParameters.source"
        class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        placeholder="Source identifier (optional)"
      />
      <p class="field-help">Optional. Used when inferring source from connection is not enough (e.g., GCP connection + GSheets source).</p>
    </div>

    <!-- Optional Parameters Section -->
    <div class="field-group">
      <label class="field-label">Optional Parameters</label>
      
      <!-- Incremental Strategy -->
      <div class="field-subgroup">
        <label class="field-sublabel">Incremental Strategy</label>
        <select
          v-model="localParameters.incremental_strategy"
          class="w-full bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        >
          <option value="">Select strategy...</option>
          <option value="replace">Replace</option>
          <option value="append">Append</option>
          <option value="merge">Merge</option>
          <option value="delete+insert">Delete + Insert</option>
        </select>
      </div>

      <!-- Incremental Key -->
      <div class="field-subgroup">
        <label class="field-sublabel">Incremental Key</label>
        <input
          v-model="localParameters.incremental_key"
          class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
          placeholder="Incremental key column"
        />
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end pt-4 border-t border-commandCenter-border">
      <vscode-button @click="saveConfig">
        Save Parameters
      </vscode-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';

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

const saveConfig = () => {
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
.field-group {
  @apply space-y-3;
}

.field-subgroup {
  @apply space-y-1;
}

.field-label {
  @apply block text-sm font-medium text-editor-fg;
}

.field-sublabel {
  @apply block text-xs font-medium text-editor-fg;
}

.field-help {
  @apply text-xs text-editor-fg opacity-70 mt-1;
}

input, select {
  @apply rounded;
}

input:focus, select:focus {
  @apply ring-1 ring-editorLink-activeFg;
}
</style>