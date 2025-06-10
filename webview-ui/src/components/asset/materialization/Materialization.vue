<template>
  <div class="h-full w-full p-4 flex justify-center">
    <div class="flex flex-col gap-4 h-full w-full max-w-4xl">
      <div class="bg-editorWidget-bg">
        <div class="flex items-center mb-2 space-x-2">
          <label class="block text-sm font-medium text-editor-fg min-w-[60px]">Owner</label>
          <div id="owner-container" class="flex items-center gap-2">
            <span
              v-if="!isEditingOwner"
              id="owner-text"
              class="text-md text-editor-fg px-2 py-1 font-mono flex items-center min-h-[32px]"
              :class="owner ? '' : 'text-editor-fg opacity-60 italic'"
            >
              {{ owner || "Unknown" }}
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

      <!-- Interval modifiers -->
      <div class="flex gap-x-4 gap-y-2 w-full justify-between">
        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2"
            >Execution Window Start</label
          >
          <input
            v-model="startIntervalString"
            class="w-full max-w-[300px] p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
            placeholder="-2h, -1d, -30m"
            :class="{ 'border-red-500': startValidationError }"
            @input="validateStartInterval"
          />
          <p v-if="startValidationError" class="text-xs text-red-400 mt-1">
            {{ startValidationError }}
          </p>
          <p v-else class="text-xs text-editor-fg opacity-70 mt-1">
            Shift start time (e.g., -2h, -1d, -30m)
          </p>
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
          <p v-if="endValidationError" class="text-xs text-red-400 mt-1">
            {{ endValidationError }}
          </p>
          <p v-else class="text-xs text-editor-fg opacity-70 mt-1">
            Shift end time (e.g., 0h, 1h, now)
          </p>
        </div>
      </div>
      <div class="border-t border-commandCenter-border"></div>

      <div class="flex gap-x-4 gap-y-2 w-full justify-between" @click="handleClickOutside">
        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2">Partitioning</label>
          <div class="relative w-full max-w-[300px]" ref="partitionContainer">
            <input
              v-model="partitionInput"
              placeholder="Select a column or enter an expression..."
              class="w-full p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg pr-10"
              @focus="isPartitionDropdownOpen = true"
              @blur="handlePartitionInputBlur"
              @input="handlePartitionInput"
              @keydown.enter="handlePartitionEnter"
            />
            <span
              class="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
              @click="isPartitionDropdownOpen = !isPartitionDropdownOpen"
            >
              <span class="codicon codicon-chevron-down text-xs"></span>
            </span>

            <div
              v-if="isPartitionDropdownOpen"
              class="absolute z-10 w-full bg-dropdown-bg border border-commandCenter-border rounded shadow-lg mt-1 max-h-60 overflow-y-auto"
            >
              <div
                class="px-3 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer"
                @mousedown.prevent="
                  selectPartitionColumn('');
                  isPartitionDropdownOpen = false;
                "
              >
                <span class="text-xs opacity-70">Clear selection</span>
              </div>
              <div
                v-for="column in filteredPartitionColumns"
                :key="column.name"
                class="px-3 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer"
                @mousedown.prevent="selectPartitionColumn(column.name)"
              >
                {{ column.name }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1">
          <label class="block text-sm font-medium text-editor-fg mb-2">Clustering</label>
          <div class="relative w-full max-w-[300px]" ref="clusterContainer">
            <input
              ref="clusterInput"
              v-model="clusterInputValue"
              readonly
              placeholder="Select columns..."
              class="w-full p-2 bg-input-background border border-commandCenter-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg pr-10 cursor-pointer"
              @click="isClusterDropdownOpen = !isClusterDropdownOpen"
              @keydown.delete="removeLastClusterColumn"
            />
            <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <span class="codicon codicon-chevron-down text-xs"></span>
            </span>

            <div
              v-if="isClusterDropdownOpen"
              class="absolute z-10 w-full bg-dropdown-bg border border-commandCenter-border rounded shadow-lg mt-1 max-h-60 overflow-y-auto"
            >
              <div
                v-for="column in columns"
                :key="column.name"
                class="px-3 py-2 hover:bg-list-hoverBackground hover:text-list-activeSelectionForeground cursor-pointer flex items-center"
                @click="toggleClusterColumn(column.name)"
              >
                <span
                  class="codicon text-xs mr-2"
                  :class="isColumnSelected(column.name) ? 'codicon-check' : 'codicon-blank'"
                ></span>
                <span>{{ column.name }}</span>
              </div>
            </div>
          </div>
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
                <option value="ddl">DDL</option>
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
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
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
  columns: {
    type: Array,
    default: () => [],
  },
  owner: {
    type: String,
    default: "",
  },
  tags: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:materialization"]);

// Owner and Tags reactive data
const owner = ref(props.owner || "");
const tags = ref([...props.tags] || []);
const newTag = ref("");
const isAddingTag = ref(false);
const isEditingOwner = ref(false);
const editingOwner = ref("");
const ownerInput = ref(null);
const tagInput = ref(null);
const isPartitionDropdownOpen = ref(false);
const isClusterDropdownOpen = ref(false);
const clusterInput = ref(null);
const partitionContainer = ref(null);
const clusterContainer = ref(null);

// Reactive data for Partitioning free-text input
const partitionInput = ref("");

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
watch(
  () => props.owner,
  (newOwner) => {
    owner.value = newOwner || "";
  },
  { immediate: true }
);

watch(
  () => props.tags,
  (newTags) => {
    tags.value = [...newTags] || [];
  },
  { immediate: true, deep: true }
);

const defaultMaterialization = {
  type: "null",
  strategy: undefined,
  partition_by: "",
  cluster_by: [],
  incremental_key: "",
  time_granularity: undefined,
};

const localMaterialization = ref({ ...defaultMaterialization });

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
    // Initialize partitionInput with the current partition_by value
    partitionInput.value = localMaterialization.value.partition_by || "";
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

// Update these for the Partitioning field
const selectPartitionColumn = (columnName) => {
  partitionInput.value = columnName; // Update input field
  localMaterialization.value.partition_by = columnName; // Update underlying data
  isPartitionDropdownOpen.value = false;
};

// Filter columns based on input for partitioning
const filteredPartitionColumns = computed(() => {
  const query = partitionInput.value.toLowerCase();
  if (!query || isPartitionDropdownOpen.value) {
    return props.columns;
  }
  return props.columns.filter((column) => column.name.toLowerCase().includes(query));
});

const handlePartitionInput = () => {
  // Update the underlying data as the user types
  localMaterialization.value.partition_by = partitionInput.value;
  // Keep dropdown open if user is typing a potential column or expression
  isPartitionDropdownOpen.value = true;
};

const handlePartitionInputBlur = () => {
  // Close the dropdown after a short delay to allow for click on dropdown items
  setTimeout(() => {
    isPartitionDropdownOpen.value = false;
  }, 100);
};

const handlePartitionEnter = () => {
  isPartitionDropdownOpen.value = false;
  // The localMaterialization.value.partition_by is already updated via handlePartitionInput
};

const clusterInputValue = computed(() => {
  return localMaterialization.value.cluster_by.join(", ") || "";
});

// Toggle cluster column selection
const toggleClusterColumn = (columnName) => {
  if (!localMaterialization.value.cluster_by) {
    localMaterialization.value.cluster_by = [];
  }

  const index = localMaterialization.value.cluster_by.indexOf(columnName);
  if (index > -1) {
    localMaterialization.value.cluster_by.splice(index, 1);
  } else {
    localMaterialization.value.cluster_by.push(columnName);
  }
};

// Remove last cluster column when pressing backspace
const removeLastClusterColumn = () => {
  if (localMaterialization.value.cluster_by.length > 0) {
    localMaterialization.value.cluster_by.pop();
  }
};

// Check if column is selected
const isColumnSelected = (columnName) => {
  return localMaterialization.value.cluster_by?.includes(columnName);
};

const handleClickOutside = (event) => {
  if (partitionContainer.value && !partitionContainer.value.contains(event.target)) {
    isPartitionDropdownOpen.value = false;
  }
  if (clusterContainer.value && !clusterContainer.value.contains(event.target)) {
    isClusterDropdownOpen.value = false;
  }
};
// Add click event listener to close dropdown
onMounted(() => {
  window.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", handleClickOutside);
});

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

  const payload = {
    materialization: cleanData,
  };

  emit("update:materialization", cleanData);
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
    "ddl":
      "Use DDL to create a new table using the information provided in the embedded Bruin section",
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
vscode-button::part(control) {
  border: none;
  outline: none;
}
</style>
