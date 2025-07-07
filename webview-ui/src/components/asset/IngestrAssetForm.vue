<template>
  <div class="space-y-4 p-4 bg-editor-bg rounded-md border border-commandCenter-border">
    <h3 class="text-sm font-medium text-editor-fg">Ingestr Asset Configuration</h3>
    
    <!-- Asset Name -->
    <div class="field-group">
      <label class="field-label">Asset Name</label>
      <input
        v-model="localConfig.name"
        class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        placeholder="Enter asset name"
      />
    </div>

    <!-- Connection -->
    <div class="field-group">
      <label class="field-label">Connection</label>
      <input
        v-model="localConfig.connection"
        class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        placeholder="Connection name (optional)"
      />
      <p class="field-help">Optional. Uses default connection for destination platform if not specified.</p>
    </div>

    <!-- Parameters Section -->
    <div class="field-group">
      <label class="field-label">Parameters</label>
      
      <!-- Source -->
      <div class="field-subgroup">
        <label class="field-sublabel">Source</label>
        <input
          v-model="localConfig.parameters.source"
          class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
          placeholder="Source identifier (optional)"
        />
        <p class="field-help">Optional. Used when inferring source from connection is not enough (e.g., GCP connection + GSheets source).</p>
      </div>

      <!-- Source Connection -->
      <div class="field-subgroup">
        <label class="field-sublabel">Source Connection</label>
        <input
          v-model="localConfig.parameters.source_connection"
                    class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
          placeholder="Source connection name"
        />
      </div>

      <!-- Source Table -->
      <div class="field-subgroup">
        <label class="field-sublabel">Source Table</label>
        <input
          v-model="localConfig.parameters.source_table"
                    class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
          placeholder="Source table name"
        />
      </div>

      <!-- Destination -->
      <div class="field-subgroup">
        <label class="field-sublabel">Destination</label>
        <select
          v-model="localConfig.parameters.destination"
                    class="w-full bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        >
          <option value="">Select destination...</option>
          <option value="bigquery">BigQuery</option>
          <option value="snowflake">Snowflake</option>
          <option value="redshift">Redshift</option>
          <option value="synapse">Synapse</option>
        </select>
      </div>
    </div>

    <!-- Optional Parameters Section -->
    <div class="field-group">
      <label class="field-label">Optional Parameters</label>
      
      <!-- Incremental Strategy -->
      <div class="field-subgroup">
        <label class="field-sublabel">Incremental Strategy</label>
        <select
          v-model="localConfig.parameters.incremental_strategy"
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
          v-model="localConfig.parameters.incremental_key"
                    class="w-full border-0 bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
          placeholder="Incremental key column"
        />
      </div>

      <!-- SQL Backend -->
      <div class="field-subgroup">
        <label class="field-sublabel">SQL Backend</label>
        <select
          v-model="localConfig.parameters.sql_backend"
                    class="w-full bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        >
          <option value="">Select backend...</option>
          <option value="pyarrow">PyArrow</option>
          <option value="sqlalchemy">SQLAlchemy</option>
        </select>
      </div>

      <!-- Loader File Format -->
      <div class="field-subgroup">
        <label class="field-sublabel">Loader File Format</label>
        <select
          v-model="localConfig.parameters.loader_file_format"
                    class="w-full bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-8 px-2"
        >
          <option value="">Select format...</option>
          <option value="jsonl">JSONL</option>
          <option value="csv">CSV</option>
          <option value="parquet">Parquet</option>
        </select>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end pt-4 border-t border-commandCenter-border">
      <vscode-button @click="saveConfig">
        Save Configuration
      </vscode-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';

interface IngestrConfig {
  name: string;
  type: string;
  connection: string;
  parameters: {
    source: string;
    source_connection: string;
    source_table: string;
    destination: string;
    incremental_strategy: string;
    incremental_key: string;
    sql_backend: string;
    loader_file_format: string;
  };
}

const props = defineProps<{
  config?: Partial<IngestrConfig>;
}>();

const emit = defineEmits<{
  save: [config: IngestrConfig];
}>();

const localConfig = ref<IngestrConfig>({
  name: '',
  type: 'ingestr',
  connection: '',
  parameters: {
    source: '',
    source_connection: '',
    source_table: '',
    destination: '',
    incremental_strategy: '',
    incremental_key: '',
    sql_backend: '',
    loader_file_format: '',
  },
  ...props.config,
});

const saveConfig = () => {
  emit('save', { ...localConfig.value });
};

watch(
  () => props.config,
  (newConfig) => {
    if (newConfig) {
      localConfig.value = {
        ...localConfig.value,
        ...newConfig,
        parameters: {
          ...localConfig.value.parameters,
          ...newConfig.parameters,
        },
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