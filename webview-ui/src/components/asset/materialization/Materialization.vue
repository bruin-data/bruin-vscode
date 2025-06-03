<template>
  <div class="h-full w-full p-4 flex justify-center">
    <div class="flex flex-col gap-4 h-full w-full max-w-4xl">
      
      <!-- Owner and Tags Section -->
      <div class="bg-editorWidget-bg">
        <!-- Owner -->
        <div class="flex items-center mb-2 space-x-2">
          <label class="block text-sm font-medium text-editor-fg min-w-[60px]">Owner</label>
          <div id="owner-container" class="flex items-center gap-2">
            <span 
              v-if="!isEditingOwner" 
              id="owner-text"
              class="text-md text-editor-fg px-2 py-1 font-mono flex items-center min-h-[32px]"
              :class="owner ? '' : 'text-editor-fg opacity-60 italic'"
            >
              {{ owner || 'Unknown' }}
            </span>
            <input
              id="owner-input"
              v-if="isEditingOwner"
              v-model="editingOwner"
              @blur="saveOwnerEdit"
              @keyup.enter="saveOwnerEdit"
              @keyup.escape="cancelOwnerEdit"
              ref="ownerInput"
              placeholder="data-team@company.com"
              class="text-sm p-1 bg-input-background border border-commandCenter-border rounded focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[200px]"
            />
            <vscode-button 
              id="edit-owner-button"
              appearance="icon" 
              @click="startEditingOwner"
              v-if="!isEditingOwner"
              class="text-xs"
              title="Edit owner"
            >
              <span class="codicon codicon-edit"></span>
            </vscode-button>
          </div>
        </div>
        <div class="border-t border-commandCenter-border"></div>

        <!-- Tags needs to be in the same line-->
        <div class="flex items-center mt-4 space-x-4">
          <label class="text-sm font-medium text-editor-fg min-w-[60px]">Tags</label>
          <div id="tags-container" class="flex flex-wrap items-center space-x-2">
            <vscode-tag 
              v-for="(tag, index) in tags" 
              :key="index"
              class="text-xs inline-flex items-center justify-center gap-1 cursor-pointer py-1"
              @click="removeTag(index)"
            >
              <div class="text-xs flex items-center gap-2">
               <span id="tag-text">{{ tag }}</span> 
               <span class="codicon codicon-close text-3xs flex items-center"></span>
              </div>
            </vscode-tag>

            <input
              id="tag-input"
              v-if="isAddingTag"
              v-model="newTag"
              @blur="confirmAddTag"
              @keyup.enter="confirmAddTag"
              @keyup.escape="cancelAddTag"
              ref="tagInput"
              placeholder="Tag name..."
              class="text-xs px-2 py-1.5 bg-input-background border border-commandCenter-border rounded focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[80px]"
            />
            <vscode-button 
              id="add-tag-button"
              appearance="icon" 
              @click="startAddingTag" 
              v-if="!isAddingTag"
              class="text-xs flex items-center justify-center h-full"
              title="Add tag"
            >
              <span class="codicon codicon-add"></span>
            </vscode-button>
          </div>
        </div>
      </div>

      <!-- Separator -->
      <div class="border-t border-commandCenter-border"></div>

      <!-- Partitioning and Clustering -->
      <div class="flex gap-x-4 gap-y-2 w-full justify-between ">
        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2">Partitioning</label>
          <input
            v-model="localMaterialization.partition_by"
            class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
            placeholder="column_name"
          />
        </div>

        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2">Clustering</label>
          <input
            v-model="clusterByString"
            class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
            placeholder="comma-separated columns"
          />
        </div>
      </div>

      <!-- Separator -->
      <div class="border-t border-commandCenter-border"></div>

      <!-- Interval modifiers -->
      <div class="flex gap-x-4 gap-y-2 w-full justify-between">
        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2">Execution Window Start</label>
          <input
            v-model="startIntervalString"
            class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
            placeholder="-2h, -1d, -30m"
            :class="{ 'border-red-500': startValidationError }"
            @input="validateStartInterval"
          />
          <p v-if="startValidationError" class="text-xs text-red-400 mt-1">{{ startValidationError }}</p>
          <p v-else class="text-xs text-editor-fg opacity-70 mt-1">Shift start time (e.g., -2h, -1d, -30m)</p>
        </div>

        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2">Execution Window End</label>
          <input
            v-model="endIntervalString"
            class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
            placeholder="0h, 1h, now"
            :class="{ 'border-red-500': endValidationError }"
            @input="validateEndInterval"
          />
          <p v-if="endValidationError" class="text-xs text-red-400 mt-1">{{ endValidationError }}</p>
          <p v-else class="text-xs text-editor-fg opacity-70 mt-1">Shift end time (e.g., 0h, 1h, now)</p>
        </div>
      </div>

      <div
        class="flex flex-col sm:flex-row sm:items-start gap-8 border-t border-commandCenter-border pt-4"
      >
        <div class="flex-1 min-w-[260px]">
          <div class="flex flex-col space-y-3">
            <label class="block text-sm font-medium text-editor-fg mb-2"> Materialization </label>
            <div class="flex space-x-6">
              <vscode-radio-group
                :value="localMaterialization.type"
                @change="(e) => setType(e.target.value)"
              >
                <vscode-radio name="materialization-type" value="null">None</vscode-radio>
                <vscode-radio name="materialization-type" value="table">Table</vscode-radio>
                <vscode-radio name="materialization-type" value="view">View</vscode-radio>
              </vscode-radio-group>
            </div>
          </div>
        </div>

        <div v-if="localMaterialization.type === 'table'" class="flex flex-col gap-6 w-full">
          <div class="flex flex-col space-y-3">
            <label class="block text-sm font-medium text-editor-fg"> Strategy </label>
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
          <div v-if="localMaterialization.strategy === 'delete+insert'" class="flex flex-col">
            <label class="block text-sm opacity-65 text-editor-fg mb-2">Incremental Key</label>
            <input v-model="localMaterialization.incremental_key" placeholder="column_name" />
          </div>

          <div v-if="localMaterialization.strategy === 'merge'" class="space-y-4">
            <p class="info-text">
              Configure primary keys in column definitions using <code>primary_key: true</code>
            </p>
          </div>

          <div
            v-if="localMaterialization.strategy === 'time_interval'"
            class="flex flex-col space-y-4"
          >
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="block text-sm opacity-65 text-editor-fg mb-2">Incremental Key</label>
                <input v-model="localMaterialization.incremental_key" placeholder="column_name" />
              </div>
              <div>
                <label class="block text-sm opacity-65 text-editor-fg mb-2">Time Granularity</label>
                <select v-model="localMaterialization.time_granularity">
                  <option value="date">Date</option>
                  <option value="timestamp">Timestamp</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-commandCenter-border pt-4 mt-auto">
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
import { ref, computed, watch, nextTick } from "vue";
import { vscode } from "@/utilities/vscode";

const props = defineProps({
  materialization: {
    type: Object,
    default: null,
  },
  isConfigFile: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: String,
    default: "",
  },
  tags: {
    type: Array,
    default: () => [],
  },
  intervalModifiers: {
    type: Object,
    default: () => ({
      start: {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        cron_periods: 0,
      },
      end: {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        cron_periods: 0,
      },
    }),
  },
});

const emit = defineEmits(["update:materialization", "update:owner", "update:tags", "update:intervalModifiers"]);

// Owner and Tags reactive data
const owner = ref(props.owner || "");
const tags = ref([...props.tags] || []);
const newTag = ref("");
const isAddingTag = ref(false);
const isEditingOwner = ref(false);
const editingOwner = ref("");
const ownerInput = ref(null);
const tagInput = ref(null);

// Interval modifiers reactive data
const intervalModifiers = ref({
  start: { ...props.intervalModifiers.start },
  end: { ...props.intervalModifiers.end }
});

const startValidationError = ref("");
const endValidationError = ref("");

// Helper functions for interval conversion
const intervalToString = (intervalObj) => {
  if (!intervalObj) return "";
  
  const parts = [];
  const { months, days, hours, minutes, seconds, cron_periods } = intervalObj;
  
  if (months > 0) parts.push(`${months}mo`);
  if (months < 0) parts.push(`${months}mo`);
  if (days > 0) parts.push(`${days}d`);
  if (days < 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (hours < 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (minutes < 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (seconds < 0) parts.push(`${seconds}s`);
  if (cron_periods > 0) parts.push(`${cron_periods}p`);
  if (cron_periods < 0) parts.push(`${cron_periods}p`);
  
  return parts.join(" ");
};

const stringToInterval = (str) => {
  const interval = {
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    cron_periods: 0,
  };
  
  if (!str || str.trim() === "" || str.toLowerCase() === "now") {
    return interval;
  }
  
  // Parse patterns like -2h, +1d, 30m, etc.
  const patterns = [
    { regex: /([+-]?\d+)M/g, key: 'months' },
    { regex: /([+-]?\d+)d/g, key: 'days' },
    { regex: /([+-]?\d+)h/g, key: 'hours' },
    { regex: /([+-]?\d+)m/g, key: 'minutes' }, 
    { regex: /([+-]?\d+)s/g, key: 'seconds' },
    { regex: /([+-]?\d+)p/g, key: 'cron_periods' },
  ];
  
  patterns.forEach(({ regex, key }) => {
    const matches = str.matchAll(regex);
    for (const match of matches) {
      interval[key] += parseInt(match[1], 10);
    }
  });
  
  return interval;
};

const validateIntervalString = (str) => {
  if (!str || str.trim() === "" || str.toLowerCase() === "now") {
    return null; // Valid empty or "now"
  }
  
  // Check for valid pattern
  const validPattern = /^([+-]?\d+[modhsp],?\s*)+$/;
  if (!validPattern.test(str.replace(/\s/g, ''))) {
    return "Invalid format. Use patterns like: -2h, +1d, 30m, etc.";
  }
  
  return null;
};

// Computed properties for string representation
const startIntervalString = computed({
  get() {
    return intervalToString(intervalModifiers.value.start);
  },
  set(value) {
    const error = validateIntervalString(value);
    startValidationError.value = error || "";
    if (!error) {
      intervalModifiers.value.start = stringToInterval(value);
    }
  }
});

const endIntervalString = computed({
  get() {
    return intervalToString(intervalModifiers.value.end);
  },
  set(value) {
    const error = validateIntervalString(value);
    endValidationError.value = error || "";
    if (!error) {
      intervalModifiers.value.end = stringToInterval(value);
    }
  }
});

// Validation functions
const validateStartInterval = () => {
  const error = validateIntervalString(startIntervalString.value);
  startValidationError.value = error || "";
};

const validateEndInterval = () => {
  const error = validateIntervalString(endIntervalString.value);
  endValidationError.value = error || "";
};

// Owner editing functions
const startEditingOwner = () => {
  isEditingOwner.value = true;
  editingOwner.value = owner.value;
  nextTick(() => {
    ownerInput.value?.focus();
  });
};

const saveOwnerEdit = () => {
  owner.value = editingOwner.value.trim();
  isEditingOwner.value = false;
  emit("update:owner", owner.value);
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      owner: owner.value,
    },
  });
};

const cancelOwnerEdit = () => {
  editingOwner.value = owner.value;
  isEditingOwner.value = false;
};

// Tags functionality
const startAddingTag = () => {
  isAddingTag.value = true;
  nextTick(() => {
    tagInput.value?.focus();
  });
};

const confirmAddTag = () => {
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim());
    sendTagUpdate(); 
  }
  newTag.value = "";
  isAddingTag.value = false;
};

const cancelAddTag = () => {
  newTag.value = "";
  isAddingTag.value = false;
};

const removeTag = (index) => {
  tags.value.splice(index, 1);
  sendTagUpdate();
};

const sendTagUpdate = () => {
  emit("update:tags", tags.value);
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      tags: [...tags.value],
    },
  });
};

// Watch for prop changes
watch(() => props.owner, (newOwner) => {
  owner.value = newOwner || "";
}, { immediate: true });

watch(() => props.tags, (newTags) => {
  tags.value = [...newTags] || [];
}, { immediate: true, deep: true });

watch(() => props.intervalModifiers, (newIntervalModifiers) => {
  intervalModifiers.value = {
    start: { ...newIntervalModifiers.start },
    end: { ...newIntervalModifiers.end }
  };
}, { immediate: true, deep: true });

const defaultMaterialization = {
  type: "null",
  strategy: undefined,
  partition_by: "",
  cluster_by: [],
  incremental_key: "",
  time_granularity: undefined,
};

const localMaterialization = ref({ ...defaultMaterialization });

const clusterByString = computed({
  get() {
    return localMaterialization.value.cluster_by?.join(", ") || "";
  },
  set(newValue) {
    localMaterialization.value.cluster_by = newValue
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c);
  },
});

const initializeLocalMaterialization = (materializationProp) => {
  if (materializationProp === null) {
    return { ...defaultMaterialization };
  }
  const base = JSON.parse(JSON.stringify(materializationProp));
  if (base.type === "table" && !base.strategy) {
    base.strategy = "create+replace";
  }
  base.cluster_by = Array.isArray(base.cluster_by)
    ? base.cluster_by
    : typeof base.cluster_by === "string"
      ? base.cluster_by
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c)
      : [];
  return base;
};

watch(
  () => props.materialization,
  (newVal) => {
    localMaterialization.value = initializeLocalMaterialization(newVal);
  },
  { immediate: true, deep: true }
);

const showStrategyOptions = computed(() => {
  return (
    localMaterialization.value.type === "table" &&
    ["delete+insert", "merge", "time_interval"].includes(localMaterialization.value.strategy)
  );
});

const setType = (type) => {
  if (type === "null") {
    localMaterialization.value = { ...defaultMaterialization };
  } else {
    if (localMaterialization.value.type === "null") {
      localMaterialization.value = {
        type: type,
        strategy: type === "table" ? "create+replace" : undefined,
        partition_by: "",
        cluster_by: [],
      };
    } else {
      localMaterialization.value.type = type;
      if (type === "table" && !localMaterialization.value.strategy) {
        localMaterialization.value.strategy = "create+replace";
      }
    }
  }
};

const saveMaterialization = () => {
  let cleanData = null;
  if (localMaterialization.value.type !== "null") {
    cleanData = JSON.parse(
      JSON.stringify({
        type: localMaterialization.value.type,
        strategy: localMaterialization.value.strategy,
        partition_by: localMaterialization.value.partition_by,
        cluster_by: Array.isArray(localMaterialization.value.cluster_by)
          ? [...localMaterialization.value.cluster_by]
          : [],
        incremental_key: localMaterialization.value.incremental_key,
        time_granularity: localMaterialization.value.time_granularity,
      })
    );
  } else {
    cleanData = {
      partition_by: localMaterialization.value.partition_by,
      cluster_by: Array.isArray(localMaterialization.value.cluster_by)
        ? [...localMaterialization.value.cluster_by]
        : [],
    };
  }

  // Include owner, tags, and interval modifiers in the payload
  const payload = {
    materialization: cleanData,
    owner: owner.value,
    tags: tags.value,
    intervalModifiers: intervalModifiers.value,
  };

  emit("update:materialization", cleanData);
  emit("update:intervalModifiers", intervalModifiers.value);
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
  });
};

function getStrategyDescription(strategy) {
  return {
    "create+replace": "Drop and recreate the table completely",
    "delete+insert": "Delete existing data using incremental key and insert new records",
    "append": "Add new rows without modifying existing data",
    "merge": "Update existing rows and insert new ones using primary keys",
    "time_interval": "Process time-based data using incremental key",
  }[strategy];
}
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

vscode-tag {
  @apply text-xs;
}
vscode-tag::part(control) {
  @apply normal-case !important;
}
.info-text {
  @apply text-sm text-editor-fg opacity-70;
}
</style>