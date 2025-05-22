<template>
    <div class="h-full w-full p-4 flex justify-center">
      <div class="flex flex-col gap-4 h-full w-full max-w-4xl">
        <div class="flex items-center gap-2">
          <vscode-checkbox :checked="materializationEnabled" @change="toggleMaterialization" />
          <label class="text-sm font-medium text-editor-fg"> Materialization </label>
        </div>
        <div
          v-if="materializationEnabled"
          class="flex flex-col sm:flex-row sm:items-start gap-8 border-t border-commandCenter-border pt-4"
        >
          <div class="flex-1 min-w-[260px]">
            <div class="flex flex-col space-y-3">
              <label class="block text-sm font-medium text-editor-fg mb-2">
                Materialization Type
              </label>
              <div class="flex space-x-6">
                <vscode-radio-group
                  :value="localMaterialization.type"
                  @change="(e) => setType(e.target.value)"
                >
                  <vscode-radio name="materialization-type" value="table">Table</vscode-radio>
                  <vscode-radio name="materialization-type" value="view">View</vscode-radio>
                </vscode-radio-group>
              </div>
            </div>
          </div>
  
          <div v-if="localMaterialization.type === 'table'" class="flex flex-col gap-6 w-full">
            <div class="flex gap-x-4 gap-y-2 w-full justify-between">
              <div class="flex-1">
                <label class="block text-sm font-medium text-editor-fg mb-2">Partitioning</label>
                <input
                  v-model="localMaterialization.partition_by"
                  class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
                  placeholder="comma-separated columns"
                />
              </div>
  
              <div class="flex-1">
                <label class="block text-sm font-medium text-editor-fg mb-2">Clustering</label>
                <input
                  v-model="localMaterialization.cluster_by"
                  class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
                  placeholder="comma-separated columns"
                />
              </div>
            </div>
  
            <div class="flex flex-col space-y-3">
              <label class="block text-sm font-medium text-editor-fg mb-2"> Strategy </label>
              <div class="relative">
                <select
                  v-model="localMaterialization.strategy"
                  class="w-full max-w-[300px] p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
                >
                  <option value="create+replace">Create + Replace</option>
                  <option value="delete+insert">Delete + Insert</option>
                  <option value="append">Append</option>
                  <option value="merge">Merge</option>
                  <option value="time_interval">Time Interval</option>
                </select>
              </div>
              <p class="text-xs text-editor-fg opacity-70 mt-1 w-full">
                {{ getStrategyDescription(localMaterialization.strategy) }}
              </p>
            </div>
          </div>
        </div>
  
        <div v-if="showStrategyOptions" class="flex-1">
          <div class="p-4 bg-editorWidget-bg rounded border border-commandCenter-border h-full">
            <div v-if="localMaterialization.strategy === 'merge'" class="space-y-4">
              <label class="block text-sm font-medium text-editor-fg">Merge Configuration</label>
              <div class="space-y-3">
                <div>
                  <label class="block text-xs text-editor-fg opacity-70 mb-2">
                    Merge Key Columns (comma-separated)
                  </label>
                  <input
                    v-model="localMaterialization.merge_keys"
                    class="w-full max-w-[300px] p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
                    placeholder="id, user_id"
                  />
                </div>
              </div>
            </div>
  
            <div v-if="localMaterialization.strategy === 'time_interval'" class="space-y-4">
              <label class="block text-sm font-medium text-editor-fg">
                Time Interval Configuration
              </label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-editor-fg opacity-70 mb-2">Time Column</label>
                  <input
                    v-model="localMaterialization.time_column"
                    class="w-full max-w-[300px] p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
                    placeholder="created_at"
                  />
                </div>
                <div>
                  <label class="block text-xs text-editor-fg opacity-70 mb-2">Interval</label>
                  <select
                    v-model="localMaterialization.interval"
                    class="w-full max-w-[300px] p-2 bg-input-background text-input-foreground border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div v-if="materializationEnabled" class="border-t border-commandCenter-border pt-4 mt-auto">
          <div class="flex justify-end">
            <vscode-button
              @click="saveMaterialization"
              class="py-1 px-4 focus:outline-none save-button"
            >
              Save Changes
            </vscode-button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watch } from "vue";
  
  const props = defineProps({
    materialization: {
      type: Object,
      default: () => ({
        type: "table",
        strategy: "create+replace",
        partition_by: "",
        cluster_by: "", 
        merge_keys: "",
        time_column: "",
        interval: "daily",
      }),
    },
    isConfigFile: {
      type: Boolean,
      default: false,
    },
  });
  
  const emit = defineEmits(["update:materialization"]);
  const materializationEnabled = ref(!!props.materialization);
  const toggleMaterialization = () => {
    materializationEnabled.value = !materializationEnabled.value;
  };
  
  const initializeMaterialization = () => {
    const base = JSON.parse(JSON.stringify(props.materialization));
    if (base.type === "table" && !base.strategy) {
      base.strategy = "create+replace";
    }
    if (base.cluster_by === null) {
      base.cluster_by = "";
    }
    return base;
  };
  
  const localMaterialization = ref(initializeMaterialization());
  
  const showStrategyOptions = computed(() => {
    return (
      localMaterialization.value.type === "table" &&
      (localMaterialization.value.strategy === "merge" ||
        localMaterialization.value.strategy === "time_interval")
    );
  });
  
  // Consolidated function to handle setting type and updating strategy
  const setType = (type) => {
    localMaterialization.value.type = type;
    if (type === "table") {
      if (!localMaterialization.value.strategy) {
        localMaterialization.value.strategy = "create+replace";
      }
    }
  };
  
  const saveMaterialization = () => {
    const cleanData = { ...localMaterialization.value };
    emit("update:materialization", cleanData);
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: { materialization: cleanData },
    });
  };
  
  const getStrategyDescription = (strategy) => {
    const descriptions = {
      "create+replace": "Drop and recreate the table completely",
      "delete+insert": "Delete existing data and insert new data",
      "append": "Add new rows to existing table",
      "merge": "Update existing rows and insert new ones based on merge keys",
      "time_interval": "Process data in time-based intervals",
    };
    return descriptions[strategy] || "";
  };
  
  watch(
    () => props.materialization,
    (newVal) => {
      if (newVal) {
        const initialized = JSON.parse(JSON.stringify(newVal));
        if (initialized.type === "table" && !initialized.strategy) {
          initialized.strategy = "create+replace";
        }
        if (initialized.cluster_by === null) {
          initialized.cluster_by = "";
        }
        localMaterialization.value = initialized;
      }
    },
    { deep: true, immediate: true }
  );
  </script>
  
  <style scoped>
  vscode-radio::part(control) {
    @apply border-none outline-none w-4 h-4;
  }
  
  vscode-radio::part(control):checked {
    @apply bg-input-background;
  }
  
  input,
  select {
    @apply text-sm bg-input-background text-input-foreground border border-commandCenter-border outline-none;
  }
  
  input:focus,
  select:focus {
    @apply ring-1 ring-editorLink-activeFg border-editorLink-activeFg;
  }
  
  input:disabled,
  select:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
  </style>