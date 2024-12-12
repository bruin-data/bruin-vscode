<template>
  <div class="flex flex-col py-4 sm:py-1 h-full w-full min-w-56 relative">
    <div class="flex justify-end mb-4 px-4">
      <vscode-button @click="addColumn" class="py-1 rounded focus:outline-none">
        Add column
      </vscode-button>
    </div>

    <!-- Header Row -->
    <div
      class="grid grid-cols-12 gap-2 px-2 py-1 font-semibold text-xs opacity-65 border-b-2 border-editor-fg items-center"
    >
      <div class="col-span-2">Name</div>
      <div class="col-span-2">Type</div>
      <div class="col-span-4">Description</div>
      <div class="col-span-3">Checks</div>
      <div class="col-span-1 text-center">Actions</div>
    </div>

    <!-- Column Rows -->
    <div class="flex-1 min-h-40 overflow-x-auto text-xs">
      <div
        v-if="localColumns.length"
        v-for="(column, index) in localColumns"
        :key="index"
        class="grid grid-cols-12 gap-2 px-2 py-1 border-b items-center text-xs border-commandCenter-border"
      >
        <!-- Name -->
        <div class="col-span-2 font-medium font-mono text-xs">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.name"
            class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
          />
          <div v-else class="truncate" :title="column.name">{{ column.name }}</div>
        </div>

        <!-- Type -->
        <div class="col-span-2 text-xs">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.type"
            class="w-full p-1 rounded bg-editorWidget-bg text-editor-fg font-mono text-xs"
          />
          <div v-else class="truncate font-mono" :title="column.type.toUpperCase()">
            {{ column.type.toUpperCase() }}
          </div>
        </div>

        <!-- Description -->
        <div class="col-span-4 text-xs">
          <input
            v-if="editingIndex === index"
            v-model="editingColumn.description"
            class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
          />
          <div
            v-else
            class="truncate font-light text-xs"
            :class="!column.description ? 'italic opacity-50' : ''"
            :title="column.description || 'undefined'"
          >
            {{ column.description || "No description provided." }}
          </div>
        </div>

        <!-- Checks -->
        <div class="col-span-3">
          <div class="flex flex-wrap gap-1">
            <template v-if="editingIndex === index">
              <div class="flex flex-wrap gap-1 max-w-full">
                <vscode-badge
                  v-for="check in getActiveChecks(editingColumn)"
                  :key="check.id"
                  :title="getCheckTooltip(check, editingColumn)"
                  class="inline-flex items-center"
                >
                  <span class="flex items-center truncate">
                    {{ check.name }}
                    <vscode-button
                      appearance="icon"
                      @click="removeCheck(check.name)"
                      aria-label="Remove check"
                      class="flex items-center"
                    >
                      <XMarkIcon class="h-3 w-3 pr-0" />
                    </vscode-button>
                  </span>
                </vscode-badge>
              </div>
              <div v-if="availableChecks(editingColumn).length > 0" class="relative">
                <vscode-dropdown
                  v-if="showAddCheckDropdown === index"
                  :data-dropdown-index="index"
                  class="w-20 z-50"
                  @close="showAddCheckDropdown = null"
                >
                  <vscode-dropdown-item
                    v-for="check in availableChecks(editingColumn)"
                    :key="check"
                    class="px-2 py-1 cursor-pointer hover:bg-editorWidget-bg"
                    @click="addCheck(check)"
                  >
                    {{ check }}
                  </vscode-dropdown-item>
                </vscode-dropdown>
                <vscode-button
                  v-if="showAddCheckDropdown !== index"
                  appearance="icon"
                  @click="toggleAddCheckDropdown(index)"
                  aria-label="Add check"
                  class="flex items-center"
                >
                  <PlusIcon class="h-3 w-3" />
                </vscode-button>
              </div>
            </template>
            <template v-else>
              <div class="flex flex-wrap gap-1">
                <vscode-badge
                  v-for="(check, checkIndex) in column.checks"
                  :key="check.id || checkIndex"
                  :title="getCheckTooltip(check, column)"
                  class="inline-flex items-center"
                >
                  <span class="truncate">{{ check.name }}</span>
                </vscode-badge>
              </div>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="col-span-1 flex justify-center items-center space-x-1">
          <vscode-button
            v-if="editingIndex === index"
            appearance="icon"
            @click="saveChanges(index)"
            aria-label="Save"
            class="flex items-center"
          >
            <CheckIcon class="h-3 w-3" />
          </vscode-button>
          <vscode-button
            v-else
            appearance="icon"
            @click="startEditing(index)"
            aria-label="Edit"
            class="flex items-center"
          >
            <PencilIcon class="h-3 w-3" />
          </vscode-button>
          <vscode-button
            appearance="icon"
            @click="showDeleteAlert = index"
            aria-label="Delete"
            class="flex items-center"
          >
            <TrashIcon class="h-3 w-3" />
          </vscode-button>
          <DeleteAlert
            v-if="showDeleteAlert === index"
            :elementName="column.name"
            elementType="column"
            @confirm="deleteColumn(index)"
            @cancel="showDeleteAlert = false"
            class="absolute z-50"
          />
        </div>
      </div>
      <div v-else class="px-4">
        <p class="flex text-md italic justify-start items-center opacity-70 p-2">
          No columns to display.
        </p>
      </div>
    </div>

    <ErrorAlert :errorMessage="error" class="mb-4" @error-close="closeError">
    </ErrorAlert>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from "vue";
import { TrashIcon, PencilIcon, XMarkIcon, CheckIcon, PlusIcon } from "@heroicons/vue/20/solid";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";
import { vscode } from "@/utilities/vscode";
import { v4 as uuidv4 } from "uuid"; // Import UUID library to generate unique IDs
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";

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
  try {
    //throw new Error("Simulated error: Unable to add column.");

    const newColumn = {
      name: "New Column",
      type: "string",
      description: "Description for the new column",
      checks: [],
    };

    // Log the action of adding a new column
    console.log("Adding new column:", newColumn);

    // Add new column to local columns
    localColumns.value.push(newColumn);
    editingIndex.value = localColumns.value.length - 1;
    editingColumn.value = JSON.parse(JSON.stringify(newColumn));

    console.log("Current columns after addition:", localColumns.value);
  } catch (error) {
    console.error("Error adding new column:", error);
    // Show an error message to the user
    showError(`"Failed to add new column. Please try again. \n" ${error}`);
  }
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

  // Log the payload that will be sent
  console.log("Payload to be sent on save columns:", payload);
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
        value: check.value,
        blocking: check.blocking || true,
      });
    } else if (check.name === "pattern" && typeof check.value === "string") {
      formattedChecks.push({
        id: check.id,
        name: check.name,
        value: check.value,
        blocking: check.blocking || true,
      });
    } else {
      formattedChecks.push({
        id: check.id,
        name: check.name,
        value: check.value,
        blocking: check.blocking || true,
      });
    }
  });
  console.log(
    "Formatted checks:",
    formattedChecks,
    " - Check if each column check has the correct structure and properties required for processing."
  );
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
    "non_negative",
    /*     "accepted_values",
    "pattern", */
  ];
  return allChecks.filter((check) => !activeCheckNames.includes(check));
});

const addCheck = (checkName) => {
  const newCheck = {
    id: uuidv4(),
    name: checkName,
    value: checkName === "accepted_values" ? [] : checkName === "pattern" ? "" : null,
    blocking: true,
  };
  editingColumn.value.checks.push(newCheck);
  showAddCheckDropdown.value = null;

  console.log("Current checks in editing column after addition:", editingColumn.value.checks);
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
const error = ref(null);

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
const showError = (message) => {
  error.value = message;
};

const closeError = () =>{
  error.value = null;
}

const getCheckTooltip = (check, column) => {
  if (check.name === "accepted_values") {
    const values = check.value;
    return `Accepted values: ${Array.isArray(values) ? values.join("\n ") : "Not specified"}`;
  } else if (check.name === "pattern") {
    return `Pattern: ${check.value || "Not specified"}`;
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

  const payload = JSON.parse(JSON.stringify({ columns: localColumns.value }));
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
  });
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
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 0.25rem;
  display: inline-flex;
  align-items: center;
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

vscode-dropdown-item::part(control) {
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
