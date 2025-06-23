<template>
  <div class="h-full w-full flex justify-center">
    <div class="flex flex-col gap-4 h-full w-full max-w-4xl">
      <div class="bg-editorWidget-bg py-1 border-b border-commandCenter-border">
        <div class="flex items-center space-x-2">
          <label class="block text-xs font-medium text-editor-fg min-w-[60px]">Owner</label>
          <div id="owner-container" class="flex items-center gap-2">
            <span
              v-if="!isEditingOwner"
              id="owner-text"
              class="text-xs text-editor-fg px-2 py-1 font-mono flex items-center min-h-[32px]"
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
              class="text-2xs bg-input-background focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[200px] h-6"
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

        <div class="flex items-center my-0.5 space-x-4">
          <label class="text-xs font-medium text-editor-fg min-w-[60px]">Tags</label>
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
              class="text-2xs bg-input-background focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg min-w-[80px] h-6"
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
        <div class="border-t border-commandCenter-border"></div>
        <div class="flex flex-col gap-4">
          <label class="block text-sm font-medium text-editor-fg">Dependencies</label>

          <!-- Existing Dependencies Display -->
          <div
            class="flex flex-wrap gap-2 min-h-[40px] p-3 bg-editorWidget-bg border border-commandCenter-border rounded-sm"
          >
            <div
              v-for="(dep, index) in dependencies"
              :key="index"
              class="group relative inline-flex items-center gap-2 px-2 py-1 bg-input-background border border-commandCenter-border rounded text-2xs font-mono hover:bg-list-hoverBackground transition-colors"
            >
              <!-- Dependency Type Icon -->
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="dep.isExternal ? 'bg-yellow-500' : 'bg-blue-500'"
                :title="`${dep.isExternal ? 'External' : 'Pipeline'}`"
              ></span>

              <!-- Dependency Name -->
              <span class="text-editor-fg">{{ dep.name }}</span>  

              <!-- Remove Button -->
              <button
                @click="removeDependency(index)"
                class="opacity-0 group-hover:opacity-100 transition-opacity w-3 h-3 flex items-center justify-center hover:bg-errorForeground hover:text-white rounded text-2xs"
                title="Remove dependency"
              >
                <span class="codicon codicon-close text-2xs"></span>
              </button>
            </div>

            <!-- Empty State -->
            <div
              v-if="dependencies.length === 0"
              class="text-2xs text-editor-fg opacity-60 italic py-1"
            >
              No dependencies configured
            </div>
          </div>

          <!-- Add Dependencies Controls -->
          <div class="flex gap-2">
            <!-- Pipeline Dependencies Dropdown -->
            <div class="relative flex-1" ref="pipelineDepsContainer">
              <button
                @click="isPipelineDepsOpen = !isPipelineDepsOpen"
                class="w-full flex items-center justify-between px-2 py-1 bg-input-background border border-commandCenter-border text-2xs text-editor-fg hover:bg-list-hoverBackground transition-colors h-6"
                :class="{ 'ring-1 ring-editorLink-activeFg': isPipelineDepsOpen }"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Add from pipeline</span>
                </div>
                <span
                  class="codicon codicon-chevron-down text-2xs transition-transform"
                  :class="{ 'rotate-180': isPipelineDepsOpen }"
                ></span>
              </button>

              <!-- Pipeline Dependencies Dropdown -->
              <div
                v-if="isPipelineDepsOpen"
                class="absolute z-20 w-full bg-dropdown-bg border border-commandCenter-border shadow-lg mt-1 max-h-60 overflow-y-auto"
              >
                <div
                  class="sticky top-0 bg-dropdown-bg border-b border-commandCenter-border px-2 py-1"
                >
                  <input
                    v-model="pipelineSearchQuery"
                    placeholder="Search pipeline assets..."
                    class="w-full bg-input-background text-2xs border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                    @click.stop
                  />
                </div>

                <div class="max-h-48 overflow-y-auto">
                  <div
                    v-for="asset in filteredPipelineAssets"
                    :key="asset.name"
                    class="flex items-center justify-between px-2 py-1 hover:bg-list-hoverBackground cursor-pointer group"
                    @click="addPipelineDependency(asset)"
                  >
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span class="text-2xs font-mono">{{ asset.name }}</span>
                    </div>
                    <span
                      v-if="isDependencyAdded(asset.name)"
                      class="text-2xs text-green-500 opacity-70"
                    >
                      Added
                    </span>
                  </div>

                  <div
                    v-if="filteredPipelineAssets.length === 0"
                    class="px-2 py-1 text-2xs text-editor-fg opacity-60 text-center"
                  >
                    No matching assets found
                  </div>
                </div>
              </div>
            </div>

            <!-- External Dependency Input -->
            <div class="relative flex-1" ref="externalDepsContainer">
              <div class="flex">
                <input
                  v-model="externalDepInput"
                  placeholder="Add external dependency..."
                  class="flex-1 px-2 py-1 bg-input-background border border-commandCenter-border text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                  @keyup.enter="addExternalDependency"
                  @focus="isExternalInputFocused = true"
                  @blur="isExternalInputFocused = false"
                />
                <button
                  @click="addExternalDependency"
                  :disabled="!externalDepInput.trim()"
                  class="px-2 py-1 bg-editorLink-activeFg text-white text-2xs hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all h-6"
                  title="Add external dependency"
                >
                  <span class="codicon codicon-add text-2xs"></span>
                </button>
              </div>

              <!-- External Dependency Suggestions -->
              <div
                v-if="isExternalInputFocused && externalDepSuggestions.length > 0"
                class="absolute z-20 w-full bg-dropdown-bg border border-commandCenter-border shadow-lg mt-1 max-h-40 overflow-y-auto"
              >
                <div
                  v-for="suggestion in externalDepSuggestions"
                  :key="suggestion"
                  class="px-2 py-1 hover:bg-list-hoverBackground cursor-pointer text-2xs"
                  @mousedown.prevent="selectExternalSuggestion(suggestion)"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span class="font-mono">{{ suggestion }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dependency Legend -->
          <div class="flex items-center gap-4 text-2xs text-editor-fg opacity-70">
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Pipeline asset</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>External</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-x-4 gap-y-2 w-full justify-between">
        <label class="block text-sm font-medium text-editor-fg mb-1">Interval Modifiers</label>
        <div class="flex gap-x-4 gap-y-2 w-full justify-between">
          <div class="flex-1">
            <label class="block text-xs font-medium text-editor-fg mb-1">Start</label>
            <div class="flex gap-2">
              <input
                :value="startIntervalValue"
                @input="
                  startIntervalValue = $event.target.value;
                  handleIntervalChange('start');
                "
                @change="handleIntervalChange('start')"
                class="w-1/2 border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                placeholder="e.g., -2"
              />
              <select
                :value="startIntervalUnit"
                @change="
                  startIntervalUnit = $event.target.value;
                  handleIntervalChange('start');
                "
                class="w-1/2 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              >
                <option value="" class="text-xs opacity-60" disabled>select unit...</option>
                <option v-for="unit in intervalUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
          </div>

          <div class="flex-1">
            <label class="block text-xs font-medium text-editor-fg mb-1">End</label>
            <div class="flex gap-2">
              <input
                :value="endIntervalValue"
                @input="
                  endIntervalValue = $event.target.value;
                  handleIntervalChange('end');
                "
                @change="handleIntervalChange('end')"
                class="w-1/2 border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                placeholder="e.g., 1"
              />
              <select
                :value="endIntervalUnit"
                @change="
                  endIntervalUnit = $event.target.value;
                  handleIntervalChange('end');
                "
                class="w-1/2 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              >
                <option value="" class="text-xs opacity-60" disabled>select unit...</option>
                <option v-for="unit in intervalUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-commandCenter-border"></div>

      <div class="flex gap-x-4 gap-y-2 w-full justify-between" @click="handleClickOutside">
        <div class="flex-1">
          <label class="block text-xs font-medium text-editor-fg mb-1">Partitioning</label>
          <div class="relative w-full max-w-[250px]" ref="partitionContainer">
            <input
              v-model="partitionInput"
              placeholder="Column or expression..."
              class="w-full border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg pr-6 h-6"
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
              class="absolute z-10 w-full bg-dropdown-bg border border-commandCenter-border shadow-lg mt-1 max-h-60 overflow-y-auto"
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
          <label class="block text-xs font-medium text-editor-fg mb-1">Clustering</label>
          <div class="relative w-full max-w-[250px]" ref="clusterContainer">
            <input
              ref="clusterInput"
              v-model="clusterInputValue"
              readonly
              placeholder="Columns..."
              class="w-full border-0 bg-input-background text-2xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg pr-6 h-6 cursor-pointer"
              @click="isClusterDropdownOpen = !isClusterDropdownOpen"
              @keydown.delete="removeLastClusterColumn"
            />
            <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <span class="codicon codicon-chevron-down text-xs"></span>
            </span>

            <div
              v-if="isClusterDropdownOpen"
              class="absolute z-10 w-full bg-dropdown-bg border border-commandCenter-border shadow-lg mt-1 max-h-60 overflow-y-auto"
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
        class="flex flex-col sm:flex-row sm:items-start gap-4 border-t border-commandCenter-border pt-4"
      >
        <div class="flex-1 min-w-[260px]">
          <div class="flex flex-col">
            <label class="block text-sm font-medium text-editor-fg mb-1"> Materialization </label>
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
          <div class="flex flex-col">
            <label class="block text-xs font-medium text-editor-fg mb-1"> Strategy </label>
            <div class="relative">
              <select
                v-model="localMaterialization.strategy"
                class="w-full max-w-[250px] bg-input-background text-input-foreground text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              >
                <option class="text-xs" value="create+replace">Create + Replace</option>
                <option class="text-xs" value="delete+insert">Delete + Insert</option>
                <option class="text-xs" value="append">Append</option>
                <option class="text-xs" value="merge">Merge</option>
                <option class="text-xs" value="time_interval">Time Interval</option>
                <option class="text-xs" value="ddl">DDL</option>
              </select>
            </div>
            <p class="text-xs text-editor-fg opacity-70 mt-1 w-full">
              {{ getStrategyDescription(localMaterialization.strategy) }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="showStrategyOptions"
        class="flex-1 bg-editorWidget-bg border border-commandCenter-border h-full p-2"
      >
        <div v-if="localMaterialization.strategy === 'delete+insert'" class="flex flex-col">
          <label class="block text-xs opacity-65 text-editor-fg mb-1">Incremental Key</label>
          <input
            class="w-full max-w-[250px] border-0 bg-input-background text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
            v-model="localMaterialization.incremental_key"
            placeholder="column_name"
          />
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
          <div class="grid grid-cols-2 items-center gap-4">
            <div class="flex flex-col">
              <label class="block text-xs opacity-65 text-editor-fg mb-1">Incremental Key</label>
              <input
                class="w-full max-w-[250px] border-0 bg-input-background text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
                v-model="localMaterialization.incremental_key"
                placeholder="column_name"
              />
            </div>
            <div class="flex flex-col">
              <label class="block text-xs opacity-65 text-editor-fg mb-1">Time Granularity</label>
              <select
                v-model="localMaterialization.time_granularity"
                class="w-full max-w-[250px] bg-input-background text-xs focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6"
              >
                <option value="date">Date</option>
                <option value="timestamp">Timestamp</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-commandCenter-border pt-2 mt-auto">
        <!-- Save button removed - changes are saved immediately -->
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
  dependencies: {
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
      },
      end: {
        months: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
    }),
  },
  pipelineAssets: {
    type: Array,
    default: () => [],
  },
});

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

// Dependencies related reactive variables
const dependencies = ref([...props.dependencies] || []);

const isPipelineDepsOpen = ref(false);
const pipelineSearchQuery = ref("");
const externalDepInput = ref("");
const isExternalInputFocused = ref(false);
const pipelineDepsContainer = ref(null);
const externalDepsContainer = ref(null);

// Mock pipeline assets for demonstration - in real app this would come from props or API
const pipelineAssets = ref(props.pipelineAssets || []);

// Common external dependency suggestions
const commonExternalDeps = [
  "api.users",
  "api.orders", 
  "api.products",
  "database.users",
  "database.orders",
  "external_service.analytics",
];

// Debounced save function to prevent too frequent saves
let saveTimeout = null;
const debouncedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveMaterialization();
  }, 300); // 300ms delay
};

const intervalModifiers = ref(JSON.parse(JSON.stringify(props.intervalModifiers)));

const intervalUnits = ["months", "days", "hours", "minutes", "seconds"];

const startIntervalValue = ref(0);
const startIntervalUnit = ref("");
const endIntervalValue = ref(0);
const endIntervalUnit = ref("");

const populateIntervalFormFields = () => {
  const currentStartInterval = intervalModifiers.value.start;
  let foundStartUnit = "";
  let foundStartValue = 0;

  if (typeof currentStartInterval === "number") {
    foundStartUnit = "cron_periods";
    foundStartValue = currentStartInterval;
  } else if (currentStartInterval && typeof currentStartInterval === "object") {
    for (const unit of intervalUnits) {
      if (
        unit !== "cron_periods" &&
        currentStartInterval[unit] !== undefined &&
        currentStartInterval[unit] !== 0
      ) {
        foundStartUnit = unit;
        foundStartValue = currentStartInterval[unit];
        break;
      }
    }
    if (!foundStartUnit && "cron_periods" in currentStartInterval) {
      foundStartUnit = "cron_periods";
      foundStartValue = currentStartInterval["cron_periods"];
    }
  }
  if (!foundStartUnit) {
    foundStartUnit = "days";
  }
  startIntervalValue.value = foundStartValue;
  startIntervalUnit.value = foundStartUnit;

  const currentEndInterval = intervalModifiers.value.end;
  let foundEndUnit = "";
  let foundEndValue = 0;

  if (typeof currentEndInterval === "number") {
    foundEndUnit = "cron_periods";
    foundEndValue = currentEndInterval;
  } else if (currentEndInterval && typeof currentEndInterval === "object") {
    for (const unit of intervalUnits) {
      if (
        unit !== "cron_periods" &&
        currentEndInterval[unit] !== undefined &&
        currentEndInterval[unit] !== 0
      ) {
        foundEndUnit = unit;
        foundEndValue = currentEndInterval[unit];
        break;
      }
    }
    if (!foundEndUnit && "cron_periods" in currentEndInterval) {
      foundEndUnit = "cron_periods";
      foundEndValue = currentEndInterval["cron_periods"];
    }
  }
  if (!foundEndUnit) {
    foundEndUnit = "days";
  }
  endIntervalValue.value = foundEndValue;
  endIntervalUnit.value = foundEndUnit;
};

const handleIntervalChange = (intervalType) => {
  const currentUnit = intervalType === "start" ? startIntervalUnit.value : endIntervalUnit.value;
  const currentVal =
    Number(intervalType === "start" ? startIntervalValue.value : endIntervalValue.value) || 0;

  let newIntervalState;
  if (currentUnit === "cron_periods") {
    newIntervalState = currentVal;
  } else {
    newIntervalState = {};
    for (const unit of intervalUnits.filter((u) => u !== "cron_periods")) {
      newIntervalState[unit] = 0;
    }
    if (currentUnit) {
      newIntervalState[currentUnit] = currentVal;
    }
  }
  intervalModifiers.value[intervalType] = newIntervalState;

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      interval_modifiers: JSON.parse(JSON.stringify(intervalModifiers.value)),
    },
    source: `Materialization_handleIntervalChange_${intervalType}`,
  });
};

watch(
  () => props.intervalModifiers,
  (newVal) => {
    const clonedNewVal = JSON.parse(JSON.stringify(newVal || {}));

    intervalModifiers.value = {
      start:
        typeof clonedNewVal.start === "number"
          ? clonedNewVal.start
          : { ...(clonedNewVal.start || {}) },
      end:
        typeof clonedNewVal.end === "number" ? clonedNewVal.end : { ...(clonedNewVal.end || {}) },
    };

    populateIntervalFormFields();
  },
  { immediate: true, deep: true }
);

const partitionInput = ref("");

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
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      owner: owner.value,
    },
    source: "saveOwnerEdit",
  });
};

const cancelOwnerEdit = () => {
  editingOwner.value = owner.value;
  isEditingOwner.value = false;
};

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
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      tags: [...tags.value],
    },
    source: "saveTags",
  });
};

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
    partitionInput.value = localMaterialization.value.partition_by || "";
  },
  { immediate: true, deep: true }
);

// Watch for strategy changes to save immediately
watch(
  () => localMaterialization.value.strategy,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

// Watch for incremental key changes to save immediately
watch(
  () => localMaterialization.value.incremental_key,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

// Watch for time granularity changes to save immediately
watch(
  () => localMaterialization.value.time_granularity,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

// Watch for partition_by changes to save immediately
watch(
  () => localMaterialization.value.partition_by,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  }
);

// Watch for cluster_by changes to save immediately
watch(
  () => localMaterialization.value.cluster_by,
  () => {
    if (localMaterialization.value.type !== "null") {
      debouncedSave();
    }
  },
  { deep: true }
);

// Watch for materialization type changes to save immediately
watch(
  () => localMaterialization.value.type,
  () => {
    debouncedSave();
  }
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

const selectPartitionColumn = (columnName) => {
  partitionInput.value = columnName;
  localMaterialization.value.partition_by = columnName;
  isPartitionDropdownOpen.value = false;

  // Save changes immediately
  debouncedSave();
};

const filteredPartitionColumns = computed(() => {
  const query = partitionInput.value.toLowerCase();
  if (!query || isPartitionDropdownOpen.value) {
    return props.columns;
  }
  return props.columns.filter((column) => column.name.toLowerCase().includes(query));
});

const handlePartitionInput = () => {
  localMaterialization.value.partition_by = partitionInput.value;
  isPartitionDropdownOpen.value = true;

  // Save changes immediately
  debouncedSave();
};

const handlePartitionInputBlur = () => {
  setTimeout(() => {
    isPartitionDropdownOpen.value = false;
  }, 100);
};

const handlePartitionEnter = () => {
  isPartitionDropdownOpen.value = false;
};

const clusterInputValue = computed(() => {
  return localMaterialization.value.cluster_by.join(", ") || "";
});

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

  // Save changes immediately
  debouncedSave();
};

const removeLastClusterColumn = () => {
  if (localMaterialization.value.cluster_by.length > 0) {
    localMaterialization.value.cluster_by.pop();

    // Save changes immediately
    debouncedSave();
  }
};

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

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
  populateIntervalFormFields();
});

onBeforeUnmount(() => {
  window.removeEventListener("click", handleClickOutside);

  // Clear any pending save timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
});

const saveMaterialization = () => {
  // This function is now called automatically via watchers with debouncing
  let payload = {
    interval_modifiers: JSON.parse(JSON.stringify(intervalModifiers.value)),
  };

  if (localMaterialization.value.type !== "null") {
    // Only include materialization if it's not "null"
    payload.materialization = JSON.parse(
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
  }
  // If type is "null", don't include materialization in payload at all

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
    source: "Materialization_autoSave",
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

// Dependencies computed properties
const filteredPipelineAssets = computed(() => {
  const query = pipelineSearchQuery.value.toLowerCase();
  if (!query) {
    return pipelineAssets.value;
  }
  return pipelineAssets.value.filter((asset) => 
    asset.name.toLowerCase().includes(query)
  );
});

const externalDepSuggestions = computed(() => {
  const input = externalDepInput.value.toLowerCase();
  if (!input) {
    return [];
  }
  return commonExternalDeps.filter((dep) => 
    dep.toLowerCase().includes(input) && 
    !dependencies.value.some(d => d.name === dep)
  );
});

// Dependencies functions
const addPipelineDependency = (asset) => {
  if (!dependencies.value.some(dep => dep.name === asset.name)) {
    dependencies.value.push({
      name: asset.name,
      isExternal: false,
      type: 'asset',
      columns: [],
      mode: 'full'
    });
    sendDependenciesUpdate();
  }
  isPipelineDepsOpen.value = false;
  pipelineSearchQuery.value = "";
};

const addExternalDependency = () => {
  const depName = externalDepInput.value.trim();
  if (depName && !dependencies.value.some(dep => dep.name === depName)) {
    dependencies.value.push({
      name: depName,
      isExternal: true,
      type: 'external',
      columns: [],
      mode: 'full'
    });
    sendDependenciesUpdate();
  }
  externalDepInput.value = "";
  isExternalInputFocused.value = false;
};

const removeDependency = (index) => {
  dependencies.value.splice(index, 1);
  sendDependenciesUpdate();
};

const isDependencyAdded = (assetName) => {
  return dependencies.value.some(dep => dep.name === assetName);
};

const selectExternalSuggestion = (suggestion) => {
  externalDepInput.value = suggestion;
  addExternalDependency();
};

const sendDependenciesUpdate = () => {
  // Transform dependencies back to upstreams format
  const upstreams = dependencies.value.map(dep => ({
    type: dep.isExternal ? 'external' : 'asset',
    value: dep.name,
    columns: dep.columns || [],
    mode: dep.mode || 'full'
  }));

  console.log('Sending upstreams update:', upstreams);

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      upstreams: upstreams,
    },
    source: "saveDependencies",
  });
};

// Watch for dependencies prop changes
watch(
  () => props.dependencies,
  (newDeps) => {
    console.log('Dependencies prop changed:', newDeps);
    dependencies.value = [...newDeps] || [];
  },
  { immediate: true, deep: true }
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

vscode-tag {
  @apply text-xs;
}
vscode-tag::part(control) {
  @apply normal-case !important;
}
.info-text {
  @apply text-xs text-editor-fg opacity-70;
}
vscode-button::part(control) {
  border: none;
  outline: none;
}
input,
select {
  @apply px-1 py-0.5 text-2xs border-0 !important;
}
</style>
