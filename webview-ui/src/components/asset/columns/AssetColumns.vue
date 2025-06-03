<template>
  <div class="flex flex-col py-4 sm:py-1 h-full w-full min-w-56 relative">
    <div class="flex justify-end mb-4 px-4">
      <vscode-button @click="handleAddColumn" class="py-1 focus:outline-none disabled:cursor-not-allowed" :disabled="isConfigFile"> Add column </vscode-button>
    </div>

    <!-- Header Row -->
    <div
      class="grid grid-cols-21 gap-2 px-2 py-1 font-semibold text-xs opacity-65 border-b-2 border-editor-fg items-center"
    >
      <div class="col-span-1" title="Primary key">
        <KeyIcon class="h-4 w-4 text-editor-fg opacity-60" />
      </div>
      <div class="col-span-4">Name</div>
      <div class="col-span-4">Type</div>
      <div class="col-span-6">Description</div>
      <div class="col-span-4">Checks</div>
      <div class="col-span-2 text-center">Actions</div>
    </div>

    <!-- Column Rows -->
    <div class="flex-1 min-h-72 overflow-x-auto text-xs">
      <div
        v-if="localColumns.length"
        v-for="(column, index) in localColumns"
        :key="index"
        class="grid grid-cols-21 gap-2 px-2 py-1 border-b items-center text-xs border-commandCenter-border"
      >
        <div class="col-span-1">
          <vscode-checkbox
            :checked="column.primary_key"
            @change="(e) => togglePrimaryKey(e, index)"
            title="Set as primary key"
          >
          </vscode-checkbox>
        </div>
        <!-- Name -->
        <div class="col-span-4 font-medium font-mono text-xs">
          <div v-if="editingIndex === index" class="flex flex-col gap-1">
            <input
              v-model="editingColumn.name"
              class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
              :class="{ 'font-bold': editingColumn.primary_key }"
            />
          </div>
          <div v-else class="flex items-center space-x-1">
            <span
              class="truncate"
              :title="column.name"
              :class="{ 'font-bold': column.primary_key }"
            >
              {{ column.name }}
            </span>
            <vscode-button
              v-if="column.entity_attribute"
              appearance="icon"
              @click="openGlossaryLink(column.entity_attribute)"
              class="ml-2 flex items-center"
              title="View in Glossary"
            >
              <LinkIcon class="h-3 w-3" />
            </vscode-button>
          </div>
        </div>

        <!-- Type -->
        <div class="col-span-4 text-xs">
          <div v-if="editingIndex === index" class="flex flex-col gap-1">
            <div class="flex items-center">
              <input
                v-model="editingColumn.type"
                class="w-full p-1 bg-editorWidget-bg text-editor-fg font-mono text-xs"
              />
            </div>
          </div>
          <div v-else class="flex items-center">
            <div class="truncate font-mono" :title="column.type.toUpperCase()">
              {{ column.type.toUpperCase() }}
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="col-span-6 text-xs">
          <textarea
            v-if="editingIndex === index"
            v-model="editingColumn.description"
            class="w-full p-1 bg-editorWidget-bg text-editor-fg text-xs"
            rows="2"
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
        <div class="col-span-4">
          <div class="flex flex-wrap gap-1">
            <template v-if="editingIndex === index">
              <div class="flex flex-wrap gap-1">
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
                  class="w-28 z-50"
                  @close="showAddCheckDropdown = null"
                >
                  <vscode-dropdown-item
                    v-for="check in availableChecks(editingColumn)"
                    :key="check"
                    class="p-1 cursor-pointer hover:bg-editorWidget-bg"
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
                <div v-if="showPatternInput && editingIndex === index" class="mt-1 px-1">
                  <input
                    v-model="newPatternValue"
                    @input="updatePatternValue"
                    @keyup.enter="confirmPatternInput"
                    placeholder="Enter regex"
                    class="w-full px-1 min-w-28 bg-editorWidget-bg text-editor-fg text-xs border border-commandCenter-border"
                  />
                </div>
              </div>
              <div v-if="showAcceptedValuesInput && editingIndex === index" class="mt-1 px-1">
                <div class="flex flex-col justify-start space-y-1">
                  <input
                    v-model="newAcceptedValuesInput"
                    @keyup.enter="addAcceptedValue"
                    placeholder="Enter value & Press Enter"
                    class="w-full min-w-32 px-1 bg-editorWidget-bg text-editor-fg text-xs border border-commandCenter-border"
                  />
                  <div class="flex flex-wrap gap-1">
                    <vscode-badge
                      v-for="(value, valueIndex) in editingColumn.checks.find(
                        (c) => c.name === 'accepted_values'
                      )?.value || []"
                      :key="valueIndex"
                      class="inline-flex items-center"
                    >
                      <span class="truncate mr-1">{{ value }}</span>
                      <vscode-button
                        appearance="icon"
                        @click="removeAcceptedValue(valueIndex)"
                        class="flex items-center"
                      >
                        <XMarkIcon class="h-3 w-3 pr-0" />
                      </vscode-button>
                    </vscode-badge>
                  </div>
                </div>
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
        <div class="col-span-2">
          <div class="flex justify-center items-center space-x-1">
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
      </div>
      <div v-else class="px-4">
        <p class="flex text-md italic justify-start items-center opacity-70 p-2">
          No columns to display.
        </p>
      </div>
    </div>

    <ErrorAlert :errorMessage="error" class="mb-4" @error-close="closeError"> </ErrorAlert>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from "vue";
import {
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  LinkIcon,
  KeyIcon,
} from "@heroicons/vue/20/solid";
import DeleteAlert from "@/components/ui/alerts/AlertWithActions.vue";
import { vscode } from "@/utilities/vscode";
import { v4 as uuidv4 } from "uuid"; // Import UUID library to generate unique IDs
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  isConfigFile: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["update:columns", "open-glossary"]);
const showDeleteAlert = ref(false);
const localColumns = ref([...props.columns]);
const editingIndex = ref(null);
const editingColumn = ref({});
const showPatternInput = ref(false);
const newPatternValue = ref("");
const showAcceptedValuesInput = ref(false);
const newAcceptedValuesInput = ref("");
const error = ref(null);
const showAddCheckDropdown = ref(null);
const isConfigFile = computed(() => props.isConfigFile);
const updatePatternValue = () => {
  const patternCheck = editingColumn.value.checks.find((check) => check.name === "pattern");
  if (patternCheck) {
    patternCheck.value = newPatternValue.value;
  }
};

const openGlossaryLink = (entityAttribute) => {
  emit("open-glossary", entityAttribute);
  console.log("Opening glossary for entity:", entityAttribute);
};

const confirmPatternInput = () => {
  const patternCheck = editingColumn.value.checks.find((check) => check.name === "pattern");

  if (!patternCheck) {
    // If no pattern check exists, create one
    const newPatternCheck = {
      id: uuidv4(),
      name: "pattern",
      value: newPatternValue.value,
      blocking: true,
    };
    editingColumn.value.checks.push(newPatternCheck);
  } else {
    // Update existing pattern check
    patternCheck.value = newPatternValue.value;
  }

  // Hide the input and reset the value
  showPatternInput.value = false;
  newPatternValue.value = "";
};
const handleAddColumn = () => {
  // If already editing a column, save those changes first
  if (editingIndex.value !== null) {
    // Apply the current edits to the localColumns
    const currentEditIndex = editingIndex.value;
    const updatedColumn = JSON.parse(JSON.stringify(editingColumn.value));
    
    // Update the column in localColumns
    localColumns.value[currentEditIndex] = {
      ...updatedColumn,
      entity_attribute: localColumns.value[currentEditIndex].entity_attribute || null,
    };
  }

  // Now add the new column
  addColumn();
};
const addColumn = () => {
  try {
    const newColumn = {
      name: "New Column",
      type: "string",
      description: "Description for the new column",
      checks: [],
      entity_attribute: null,
      primary_key: false,
    };

    // Add new column to local columns
    localColumns.value.push(newColumn);
    editingIndex.value = localColumns.value.length - 1;
    editingColumn.value = JSON.parse(JSON.stringify(newColumn));
  } catch (error) {
    console.error("Error adding new column:", error);
    // Show an error message to the user
    showError(`"Failed to add new column. Please try again. \n" ${error}`);
  }
};
const togglePrimaryKey = (event, index) => {
  const isChecked = event.target.checked;
  localColumns.value[index].primary_key = isChecked;
  emitUpdateColumns(); 
  const payload = { columns: JSON.parse(JSON.stringify(localColumns.value)) };
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
  });
};

const saveChanges = (index) => {
  try {
    const updatedColumn = JSON.parse(JSON.stringify(editingColumn.value));

    // Update the column in localColumns
    localColumns.value[index] = {
      ...updatedColumn,
      entity_attribute: localColumns.value[index].entity_attribute || null,
    };

    // Reset editing state
    editingIndex.value = null;
    showAcceptedValuesInput.value = false;
    showPatternInput.value = false;

    // Prepare and send data
    const formattedColumns = localColumns.value.map((column) => ({
      ...column,
      checks: formatChecks(column.checks),
      entity_attribute: column.entity_attribute || null,
      primary_key: column.primary_key,
    }));

    const payload = { columns: formattedColumns };
    const payloadStr = JSON.stringify(payload);
    const safePayload = JSON.parse(payloadStr);
    // Send to panel
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: safePayload,
    });

    emit("update:columns", formattedColumns);
  } catch (error) {
    console.error("Error saving column changes:", error);
    showError(`Failed to save column changes. Please try again. \n ${error}`);
  }
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
        blocking: check.blocking || true,
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
    "non_negative",
    "pattern",
    "accepted_values",
  ];
  return allChecks.filter((check) => !activeCheckNames.includes(check));
});

const addCheck = (checkName) => {
  if (checkName === "pattern") {
    showPatternInput.value = true;
    newPatternValue.value = ""; // Reset input when adding pattern check
    showAddCheckDropdown.value = null;
    return;
  }
  if (checkName === "accepted_values") {
    // Find existing accepted_values check or create a new one
    const existingAcceptedValuesCheck = editingColumn.value.checks.find(
      (check) => check.name === "accepted_values"
    );

    if (!existingAcceptedValuesCheck) {
      const newCheck = {
        id: uuidv4(),
        name: "accepted_values",
        value: [], // Initialize as an empty array
        blocking: true,
      };
      editingColumn.value.checks.push(newCheck);
    }
    showAcceptedValuesInput.value = true;
    showAddCheckDropdown.value = null;
    return;
  }
  const newCheck = {
    id: uuidv4(),
    name: checkName,
    value: checkName === "accepted_values" ? [] : "",
    blocking: true,
  };
  editingColumn.value.checks.push(newCheck);
  showAddCheckDropdown.value = null;
};

const removeCheck = (checkName) => {
  editingColumn.value.checks = editingColumn.value.checks.filter(
    (check) => check.name !== checkName
  );
  emitUpdateColumns();
};

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

const addAcceptedValue = () => {
  // Find the accepted_values check
  const acceptedValuesCheck = editingColumn.value.checks.find(
    (check) => check.name === "accepted_values"
  );

  if (acceptedValuesCheck) {
    // Split input by comma, trim whitespace, and remove duplicates
    const newValues = newAcceptedValuesInput.value
      .split(",")
      .map((val) => val.trim())
      .filter((val) => val && !acceptedValuesCheck.value.includes(val));

    // Add new values
    acceptedValuesCheck.value.push(...newValues);

    // Reset input
    newAcceptedValuesInput.value = "";
  }
};

const removeAcceptedValue = (index) => {
  const acceptedValuesCheck = editingColumn.value.checks.find(
    (check) => check.name === "accepted_values"
  );

  if (acceptedValuesCheck) {
    acceptedValuesCheck.value.splice(index, 1);
  }
};

const showError = (message) => {
  error.value = message;
};

const closeError = () => {
  error.value = null;
};

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
    entity_attribute: column.entity_attribute || null,
    primary_key: column.primary_key,
  }));
  emit("update:columns", formattedColumns);
};

const startEditing = (index) => {
  editingIndex.value = index;
  // Create a deep copy to avoid reference issues
  editingColumn.value = JSON.parse(JSON.stringify(localColumns.value[index]));
  // Ensure primary_key is properly set in the editing copy
  editingColumn.value.primary_key = !!localColumns.value[index].primary_key;
};

const deleteColumn = (index) => {
  localColumns.value.splice(index, 1);
  if (editingIndex.value !== null) {
    if (index < editingIndex.value) {
      editingIndex.value -= 1; // Decrement if deleted column was before
    } else if (index === editingIndex.value) {
      editingIndex.value = null; // Clear if deleted the edited column
    }
  }
  showDeleteAlert.value = false;
  emitUpdateColumns();
  const payload = { columns: JSON.parse(JSON.stringify(localColumns.value)) };
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
      primary_key: !!column.primary_key,
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
vscode-dropdown::part(control) {
  position: absolute;
  left: 0;
  z-index: 1000; /* Ensure it's above other elements */
}

input,
select {
  @apply text-xs bg-input-background text-input-foreground border-none outline-none p-1;
}
.pattern-input-container {
  @apply flex items-center space-x-2 w-full;
}

input:focus,
select:focus {
  outline: none;
}
</style>
