<template>
  <div class="flex flex-col py-4 sm:py-1 bg-editorWidget-bg h-full">
    <div class="flex justify-end mb-4">
      <vscode-button @click="addColumn" class="py-1 rounded focus:outline-none">
        Add column
      </vscode-button>
    </div>
    <!-- Header Row -->
    <div
      class="flex p-2 sm:p-2 font-semibold text-editor-fg text-md opacity-65 border-b-2 border-editor-fg"
    >
      <div class="flex-1 min-w-0 px-2 text-left">Name</div>
      <div class="flex-1 min-w-0 px-2 text-left">Type</div>
      <div class="flex-[2] min-w-0 px-2 text-left">Description</div>
      <div class="flex-1 min-w-0 px-2 text-left">Checks</div>
      <div class="flex-[1/2] min-w-0 px-2 text-left">Actions</div>
    </div>

    <!-- Column Rows -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div
        v-if="localColumns.length"
        v-for="(column, index) in localColumns"
        :key="index"
        class="flex p-1 border-b border-commandCenter-border items-center relative"
      >
        <!-- Column Details -->
        <div class="flex-1 min-w-0 px-2 text-left font-medium">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.name"
            class="w-full bg-editorWidget-bg text-editor-fg"
          />
          <div v-else class="truncate" :title="column.name">{{ column.name }}</div>
        </div>
        <div class="flex-1 min-w-0 px-2 text-left">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.type"
            class="w-full bg-editorWidget-bg text-editor-fg"
          />
          <div v-else class="text-[0.7rem] opacity-70 truncate" :title="column.type.toUpperCase()">
            {{ column.type.toUpperCase() }}
          </div>
        </div>
        <div class="flex-[2] min-w-0 px-2 text-left">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.description"
            class="w-full bg-editorWidget-bg text-editor-fg"
          />
          <div
            v-else
            class="truncate text-xs text-input-foreground opacity-70 font-light"
            :class="!column.description ? 'opacity-60 italic' : ''"
            :title="column.description || 'undefined'"
          >
            {{ column.description || "No description provided." }}
          </div>
        </div>

        <!-- Checks Column -->
        <div class="flex-1 pr-6 min-w-0 text-left flex flex-wrap gap-2 whitespace-nowrap font-mono overflow-visible">
        <template v-if="editingIndex === index">
          <div class="flex flex-wrap gap-2 max-w-full overflow-hidden">
            <vscode-badge
              v-for="check in getActiveChecks(editingColumn)"
              :key="check"
              :class="{
                'relative cursor-pointer': check === 'accepted_values' || check === 'pattern',
              }"
              :title="getCheckTooltip(check, editingColumn)"
            >
              <span class="flex items-center truncate max-w-[100px]">
                {{ check }}
                <XMarkIcon
                  @click="removeCheck(check)"
                  class="h-3 w-3 text-editor-fg ml-[0.1rem] cursor-pointer flex-shrink-0"
                />
              </span>
            </vscode-badge>
          </div>
          <div class="relative">
            <vscode-button
              appearance="icon"
              @click="toggleAddCheckDropdown(index)"
              aria-label="Add Check"
            >
              <PlusIcon class="h-4 w-4" />
            </vscode-button>
            <div
              v-if="showAddCheckDropdown === index"
              class="absolute z-50 mt-1 bg-editorWidget-bg border border-commandCenter-border rounded bottom-full mb-1"
            >
              <div
                v-for="check in availableChecks(editingColumn)"
                :key="check"
                @click="addCheck(check)"
                class="px-4 py-2 hover:bg-commandCenter-border cursor-pointer whitespace-nowrap"
              >
                {{ check }}
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-wrap gap-2 max-w-full overflow-hidden">
            <vscode-badge
              v-for="check in getActiveChecks(column)"
              :key="check"
              :title="getCheckTooltip(check, column)"
              class="max-w-[100px]"
            >
              <span class="truncate inline-block w-full">{{ check }}</span>
            </vscode-badge>
          </div>
        </template>
      </div>

        <!-- Actions Column -->
        <div class="flex-[1/2] justify-end space-x-2">
          <vscode-button
            v-if="editingIndex === index"
            appearance="icon"
            @click="saveChanges(index)"
            aria-label="Save"
          >
            <CheckIcon class="h-4 w-4" />
          </vscode-button>
          <vscode-button v-else appearance="icon" @click="startEditing(index)" aria-label="Edit">
            <PencilIcon class="h-4 w-4" />
          </vscode-button>
          <vscode-button appearance="icon" @click="showDeleteAlert = true" aria-label="Delete">
            <TrashIcon class="h-4 w-4" />
          </vscode-button>
          <DeleteAlert
            v-if="showDeleteAlert"
            :elementName="column.name"
            elementType="column"
            @confirm="deleteColumn(index)"
            @cancel="showDeleteAlert = false"
          />
        </div>
      </div>
    </div>

    <!-- Notification -->
    <div
      v-if="notification"
      class="fixed bottom-4 right-4 bg-editorWidget-bg border border-commandCenter-border p-4 rounded shadow-lg"
    >
      {{ notification }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick} from "vue";
import { TrashIcon, PencilIcon, XMarkIcon, CheckIcon, PlusIcon } from "@heroicons/vue/20/solid";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:columns"]);
const showDeleteAlert = ref(false);
const localColumns = ref([...props.columns]);
const editingIndex = ref(null);
const editingColumn = ref({});

const addColumn = () => {
  localColumns.value.push({
    name: "New Column",
    type: "string",
    description: "Description for the new column",
    checks: {
      acceptedValuesEnabled: false,
      patternEnabled: false,
    },
  });
  emitUpdateColumns();
};

const getActiveChecks = computed(() => (column) => {
  const activeChecks = Object.entries(column.checks)
    .filter(
      ([key, value]) => value === true && !["acceptedValuesEnabled", "patternEnabled"].includes(key)
    )
    .map(([key]) => key);

  if (column.checks.acceptedValuesEnabled) {
    activeChecks.push("accepted_values");
  }
  if (column.checks.patternEnabled && column.checks.pattern) {
    activeChecks.push("pattern");
  }

  return activeChecks;
});

const showAddCheckDropdown = ref(null);
const notification = ref(null);

const allChecks = [
  "not_null",
  "unique",
  "accepted_values",
  "pattern",
  "positive",
  "negative",
  "not_negative",
];

const availableChecks = computed(() => (column) => {
  const activeChecks = getActiveChecks.value(column);
  return allChecks.filter((check) => !activeChecks.includes(check));
});

const toggleAddCheckDropdown = (index) => {
  if (showAddCheckDropdown.value === index) {
    showAddCheckDropdown.value = null;
  } else {
    showAddCheckDropdown.value = index;
    nextTick(() => {
      const dropdown = document.querySelector(`[data-dropdown-index="${index}"]`);
      if (dropdown) {
        dropdown.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }
};

const addCheck = (check) => {
  if (check === "accepted_values") {
    editingColumn.value.checks.acceptedValuesEnabled = true;
    editingColumn.value.checks.accepted_values = [];
    showNotification("Please specify the accepted values in the asset file.");
  } else if (check === "pattern") {
    editingColumn.value.checks.patternEnabled = true;
    editingColumn.value.checks.pattern = " ";
    showNotification("Please specify the regex pattern in the asset file.");
  } else {
    editingColumn.value.checks[check] = true;
  }
  showAddCheckDropdown.value = null;
};

const removeCheck = (check) => {
  if (check === "accepted_values") {
    editingColumn.value.checks.acceptedValuesEnabled = false;
    editingColumn.value.checks.accepted_values = [];
  } else if (check === "pattern") {
    editingColumn.value.checks.patternEnabled = false;
    editingColumn.value.checks.pattern = "";
  } else {
    editingColumn.value.checks[check] = false;
  }
};

const showNotification = (message) => {
  notification.value = message;
  setTimeout(() => {
    notification.value = null;
  }, 5000); // Hide notification after 5 seconds
};

const getCheckTooltip = (check, column) => {
  if (check === "accepted_values") {
    return `Accepted values: ${column.checks.accepted_values?.join(", ") || "Not specified"}`;
  } else if (check === "pattern") {
    return `Pattern: ${column.checks.pattern || "Not specified"}`;
  }
  return "";
};

const emitUpdateColumns = () => {
  emit("update:columns", localColumns.value);
};

const startEditing = (index) => {
  editingIndex.value = index;
  editingColumn.value = JSON.parse(JSON.stringify(localColumns.value[index]));
};

const saveChanges = (index) => {
  localColumns.value[index] = JSON.parse(JSON.stringify(editingColumn.value));
  editingIndex.value = null;
  emitUpdateColumns();
};

const deleteColumn = (index) => {
  localColumns.value.splice(index, 1);
  showDeleteAlert.value = false;
  emitUpdateColumns();
};

watch(
  () => props.columns,
  (newColumns) => {
    localColumns.value = JSON.parse(JSON.stringify(newColumns));
  },
  { deep: true }
);
</script>

<style scoped>
vscode-badge::part(control) {
  background-color: transparent;
  border: 1px solid var(--vscode-commandCenter-border);
  color: var(--vscode-editor-foreground);
  font-family: monospace;
  max-width: 100%; /* Equivalent to max-w-full */
  overflow: hidden;
  text-overflow: ellipsis; /* Equivalent to text-ellipsis */
  white-space: nowrap;
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

input,
select {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: none;
  outline: none;
  padding: 0.25rem; /* Equivalent to p-1 (1/4 of 1rem) */
  font-size: 0.875rem; /* Equivalent to text-sm */
}

input:focus,
select:focus {
  outline: none;
}
</style>
