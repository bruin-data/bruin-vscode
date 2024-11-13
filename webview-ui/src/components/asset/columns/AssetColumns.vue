<template>
  <div class="flex flex-col py-4 sm:py-1 h-full">
    <div class="flex justify-end mb-4">
      <vscode-button @click="addColumn" class="py-1 rounded focus:outline-none">
        Add column
      </vscode-button>
    </div>
    <!-- Header Row -->
    <div
      class="flex px-2 py-1 font-semibold text-editor-fg text-md opacity-65 border-b-2 border-editor-fg"
    >
      <div class="flex-1 min-w-0 text-left">Name</div>
      <div class="flex-1 min-w-0 text-left">Type</div>
      <div class="flex-[2] min-w-0 text-left">Description</div>
      <div class="flex-1 min-w-0 text-left">Checks</div>
      <div class="flex-[1/2] min-w-0 text-left">Actions</div>
    </div>

    <!-- Column Rows -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div
        v-if="localColumns.length"
        v-for="(column, index) in localColumns"
        :key="index"
        class="flex px-1 py-1 border-b border-commandCenter-border items-center relative text-xs"
      >
        <!-- Column Details -->
        <div class="flex-1 min-w-0 text-left font-medium font-mono mr-1">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.name"
            class="w-full bg-editorWidget-bg text-editor-fg"
          />
          <div v-else class="w-full px-1 truncate" :title="column.name">{{ column.name }}</div>
        </div>
        <div class="flex-1 min-w-0 text-left mr-1">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.type"
            class="w-full bg-editorWidget-bg text-editor-fg font-mono"
          />
          <div
            v-else
            class="w-full opacity-70 truncate font-mono px-1"
            :title="column.type.toUpperCase()"
          >
            {{ column.type.toUpperCase() }}
          </div>
        </div>
        <div class="flex-[2] min-w-0 text-left">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.description"
            class="w-full bg-editorWidget-bg text-editor-fg"
          />
          <div
            v-else
            class="flex-[2] min-w-0 text-left px-1 text-input-foreground opacity-70 font-light"
            :class="!column.description ? 'opacity-60 italic' : ''"
            :title="column.description || 'undefined'"
          >
            {{ column.description || "No description provided." }}
          </div>
        </div>

        <!-- Checks Column -->
        <div class="flex-1 min-w-0 text-left flex flex-wrap gap-2 whitespace-nowrap font-mono">
          <!-- <template v-if="editingIndex === index">
             <div class="flex flex-wrap gap-2 max-w-full overflow-hidden">
              <vscode-badge
                v-for="check in editingColumn.checks"
                :key="check.id"
                :class="{
                  'relative cursor-pointer':
                    check.name === 'accepted_values' || check.name === 'pattern',
                }"
                :title="getCheckTooltip(check, editingColumn)"
              >
                <span class="flex items-center max-w-[100px]">
                  <span class="truncate font-mono">{{ check.name }}</span>
                  <XMarkIcon
                    @click="removeCheck(check.name)"
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
                class="absolute z-50 mt-1 bg-editorWidget-bg border border-commandCenter-border rounded shadow-lg max-h-52 overflow-y-auto"
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
          </template> -->
            <div class="flex flex-wrap gap-2 max-w-full">
              <vscode-badge
                v-for="(check, checkIndex) in column.checks"
                :key="check.id || checkIndex"
                :title="getCheckTooltip(check, column)"
                class="max-w-[100px]"
              >
                <span class="truncate inline-block w-full">{{ check.name }}</span>
              </vscode-badge>
            </div>
        </div>

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
      <div v-else>
        <p class="flex text-md italic justify-start items-center text-editor-fg opacity-70 p-2">
          No columns to display.
        </p>
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
import { ref, watch, computed, nextTick } from "vue";
import { TrashIcon, PencilIcon, XMarkIcon, CheckIcon, PlusIcon } from "@heroicons/vue/20/solid";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";
import { vscode } from "@/utilities/vscode";
import { v4 as uuidv4 } from "uuid"; // Import UUID library to generate unique IDs

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
  const newColumn = {
    name: "New Column",
    type: "string",
    description: "Description for the new column",
    checks: [],
  };

  // Add new column to local columns
  localColumns.value.push(newColumn);
  editingIndex.value = localColumns.value.length - 1;
  editingColumn.value = JSON.parse(JSON.stringify(newColumn));

  const payload = JSON.parse(JSON.stringify({ columns: editingColumn }));

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
  });
  emitUpdateColumns();
};

const saveChanges = (index) => {
  localColumns.value[index] = JSON.parse(JSON.stringify(editingColumn.value));
  editingIndex.value = null;
  // Create clean data for ALL columns
  const allColumnsData = localColumns.value.map((column) => ({
    name: column.name,
    type: column.type,
    description: column.description,
    checks: formatChecks(column.checks),
  }));

  const payload = JSON.parse(JSON.stringify({ columns: allColumnsData }));

  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
  });
  emitUpdateColumns();
};

const formatChecks = (checks) => {
  const formattedChecks = [];
  checks.forEach((check) => {
    if (check.name === "accepted_values" && Array.isArray(check.value)) {
      formattedChecks.push({
        id: check.id,
        name: check.name,
        value: { values: check.value },
        blocking: {"enabled": check.blocking || true},
      });
    } else if (check.name === "pattern" && typeof check.value === "string") {
      formattedChecks.push({
        id: check.id,
        name: check.name,
        value: { pattern: check.value },
        blocking: {"enabled": check.blocking || true},
      });
    } else {
      formattedChecks.push({
        id: check.id,
        name: check.name,
        value: check.value,
        blocking: {"enabled": check.blocking || true},
      });
    }
  });
  return formattedChecks;
};

const getActiveChecks = computed(() => (column) => {
  return Array.isArray(column.checks) ? column.checks : [];
});

const availableChecks = computed(() => (column) => {
  const activeCheckNames = getActiveChecks.value(column).map((check) => check.name);
  const allChecks = [
    "unique",
    "not_null",
    "positive",
    "negative",
    "not_negative",
    "accepted_values",
    "pattern",
  ];
  return allChecks.filter((check) => !activeCheckNames.includes(check));
});

const addCheck = (checkName) => {
  const newCheck = {
    id: uuidv4(),
    name: checkName,
    value: checkName === "accepted_values" ? [] : checkName === "pattern" ? "" : null,
    blocking:  {"enabled": false},
  };
  editingColumn.value.checks.push(newCheck);
  showAddCheckDropdown.value = null;
  saveChanges(editingIndex.value);
  emitUpdateColumns();
};

const removeCheck = (checkName) => {
  editingColumn.value.checks = editingColumn.value.checks.filter(
    (check) => check.name !== checkName
  );
  saveChanges(editingIndex.value);
  emitUpdateColumns();
};

const showAddCheckDropdown = ref(null);
const notification = ref(null);

const toggleAddCheckDropdown = (index) => {
  if (showAddCheckDropdown.value === index) {
    showAddCheckDropdown.value = null;
  } else {
    showAddCheckDropdown.value = index;
    nextTick(() => {
      const dropdown = document.querySelector(`[data-dropdown-index="${index}"]`);
      if (dropdown) {
        dropdown.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }
};

const showNotification = (message) => {
  notification.value = message;
  setTimeout(() => {
    notification.value = null;
  }, 5000); // Hide notification after 5 seconds
};

const getCheckTooltip = (check, column) => {
  if (check.name === "accepted_values") {
    const values = check.value.values;
    return `Accepted values: ${Array.isArray(values) ? values.join(", ") : "Not specified"}`;
  } else if (check.name === "pattern") {
    return `Pattern: ${check.value.pattern || "Not specified"}`;
  }
  return "";
};

const emitUpdateColumns = () => {
  const formattedColumns = localColumns.value.map((column) => ({
    ...column,
    checks: formatChecks(column.checks),
  }));
  emit("update:columns", formattedColumns);
};

const startEditing = (index) => {
  editingIndex.value = index;
  editingColumn.value = JSON.parse(JSON.stringify(localColumns.value[index]));
};

const deleteColumn = (index) => {
  localColumns.value.splice(index, 1);
  showDeleteAlert.value = false;
  emitUpdateColumns();
};

watch(
  () => props.columns,
  (newColumns) => {
    localColumns.value = newColumns.map((column) => ({
      ...column,
      checks: column.checks || [],
    }));
  },
  { deep: true }
);
</script>

<style scoped>
vscode-badge::part(control) {
  background-color: var(--vscode-badge-background);
  border: 1px solid var(--vscode-commandCenter-border);
  color: var(--vscode-badge-foreground);
  font-family: monospace;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.25rem;
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

input,
select {
  @apply text-xs bg-input-background text-input-foreground border-none outline-none p-1;
}

input:focus,
select:focus {
  outline: none;
}
</style>
