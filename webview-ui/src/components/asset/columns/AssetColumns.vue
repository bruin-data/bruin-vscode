<template>
  <div class="flex flex-col py-4 sm:py-1 h-full w-full min-w-56 relative">
    <div class="flex justify-end mb-4 space-x-2">
      <vscode-button @click="fillColumnsFromDB" :disabled="fillColumnsStatus === 'loading'" class="py-1 focus:outline-none disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap">
        <template v-if="fillColumnsStatus === 'loading'">
          <svg
            class="animate-spin mr-1 h-4 w-4 text-editor-bg"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </template>
        <template v-else-if="fillColumnsStatus === 'success'">
          <span class="codicon codicon-check h-4 w-4 mr-1 text-editor-button-fg" aria-hidden="true"></span>
        </template>
        <template v-else-if="fillColumnsStatus === 'error'">
          <span class="codicon codicon-error h-4 w-4 mr-1 text-editorError-foreground" aria-hidden="true"></span>
        </template>
        Fill from DB
      </vscode-button>
      <vscode-button @click="handleAddColumn" class="py-1 focus:outline-none disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap" :disabled="isConfigFile"> Add column </vscode-button>
    </div>
    
    <!-- Error message for fill operation -->
    <SimpleErrorAlert 
      v-if="fillColumnsMessage && fillColumnsStatus === 'error'" 
      :errorMessage="fillColumnsMessage" 
      errorPhase="Fill Columns" 
      @error-close="fillColumnsStatus = null; fillColumnsMessage = null" 
    />

    <!-- Column Table -->
    <div class="flex-1 min-h-72 overflow-x-auto text-xs mt-5">
      <table class="w-full min-w-fit">
        <thead class="sticky top-0 bg-editorWidget-bg z-10">
          <tr class="font-semibold text-xs opacity-65 border-b-2 border-editor-fg">
            <th class="px-2 py-1 text-left" style="width: 2rem;" title="Primary key">
              <KeyIcon class="h-4 w-4 text-editor-fg opacity-60" />
            </th>
            <th class="px-2 py-1 text-left" style="width: 100px;">Name</th>
            <th class="px-2 py-1 text-left" style="width: 80px;">Type</th>
            <th class="px-2 py-1 text-left" style="width: 120px;">Description</th>
            <th class="px-2 py-1 text-left" style="width: 150px;">Checks</th>
            <th class="px-2 py-1 text-center" style="width: 100px;">Actions</th>
          </tr>
        </thead>
        <tbody v-if="localColumns.length">
          <tr
            v-for="(column, index) in localColumns"
            :key="index"
            class="border-b border-commandCenter-border"
          >
            <td class="px-2 py-1" style="width: 2rem;">
              <vscode-checkbox
                :checked="column.primary_key"
                @change="togglePrimaryKey($event, index)"
                title="Set as primary key"
              >
              </vscode-checkbox>
            </td>
            <!-- Name -->
            <td class="px-2 py-1 font-medium font-mono text-xs" style="width: 100px;">
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
            </td>

            <!-- Type -->
            <td class="px-2 py-1 text-xs" style="width: 80px;">
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
            </td>

            <!-- Description -->
            <td class="px-2 py-1 text-xs" style="width: 120px;">
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
            </td>

            <!-- Checks -->
            <td class="px-2 py-1" style="width: 150px;">
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
                      @close="closeDropdown"
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
                      <div class="flex items-center space-x-1">
                        <input
                          v-model="newPatternValue"
                          @input="updatePatternValue"
                          @keyup.enter="confirmPatternInput"
                          @keyup.escape="cancelPatternInput"
                          placeholder="Enter regex or Esc"
                          class="flex-1 px-1 min-w-28 bg-editorWidget-bg text-editor-fg text-xs border border-commandCenter-border"
                        />
                      </div>
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
            </td>

            <!-- Actions -->
            <td class="px-2 py-1 text-center" style="width: 100px;">
              <div class="flex justify-center items-center space-x-1">
                <vscode-button
                  v-if="editingIndex === index"
                  appearance="icon"
                  @click="saveChanges(index)"
                  aria-label="Save"
                  class="flex items-center flex-shrink-0"
                >
                  <CheckIcon class="h-3 w-3" />
                </vscode-button>
                <vscode-button
                  v-else
                  appearance="icon"
                  @click="startEditing(index)"
                  aria-label="Edit"
                  class="flex items-center flex-shrink-0"
                >
                  <PencilIcon class="h-3 w-3" />
                </vscode-button>
                <vscode-button
                  appearance="icon"
                  @click="showDeleteAlert = index"
                  aria-label="Delete"
                  class="flex items-center flex-shrink-0"
                >
                  <TrashIcon class="h-3 w-3" />
                </vscode-button>
                <DeleteAlert
                  v-if="showDeleteAlert === index"
                  title="Delete Column"
                  :message="`Are you sure you want to delete the column ${column.name}? This action cannot be undone.`"
                  @confirm="deleteColumn(index)"
                  confirm-text="Delete"
                  @cancel="showDeleteAlert = false"
                  class="absolute z-50"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!localColumns.length" class="px-4">
        <p class="flex text-md italic justify-start items-center opacity-70 p-2">
          No columns to display.
        </p>
      </div>
    </div>

    <SimpleErrorAlert :errorMessage="error" class="mb-4" @error-close="closeError"> </SimpleErrorAlert>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from "vue";
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
import SimpleErrorAlert from "@/components/ui/alerts/SimpleErrorAlert.vue";
import { updateValue } from "@/utilities/helper";

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

// Fill columns from DB status
const fillColumnsStatus = ref(null);
const fillColumnsMessage = ref(null);
const updatePatternValue = () => {
  const patternCheck = editingColumn.value.checks.find((check) => check.name === "pattern");
  if (patternCheck) {
    patternCheck.value = newPatternValue.value;
  }
};

const openGlossaryLink = (entityAttribute) => {
  console.log("Opening glossary for entity:", entityAttribute);
  vscode.postMessage({ command: "bruin.openGlossary" });
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

const cancelPatternInput = () => {
  // Hide the input and reset the value without saving
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
  const checkbox = event.target;
  const isChecked = checkbox.checked;

  const col = localColumns.value[index];
  if (!col) return;

  // Avoid triggering if the value didn't actually change
  if (col.primary_key === isChecked) return;
  localColumns.value[index] = {
    ...col,
    primary_key: isChecked,
  };

  const payload = { columns: JSON.parse(JSON.stringify(localColumns.value)) };
  console.warn("Primary Key toggled for column:", col.name);
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
    source: "togglePrimaryKey",
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
      source: "saveChanges",
    });

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
  
  // Hide input fields when their corresponding checks are removed
  if (checkName === "accepted_values") {
    showAcceptedValuesInput.value = false;
  } else if (checkName === "pattern") {
    showPatternInput.value = false;
    newPatternValue.value = "";
  }
  
  const payload = { columns: JSON.parse(JSON.stringify(localColumns.value)) };
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
    source: "removeCheck",
  });
};

const ensureDropdownVisibility = (dropdown, container) => {
  if (!dropdown || !container) return;
  
  // Add temporary overflow class to container
  container.classList.add('dropdown-container-open');
  
  // Wait a bit for the dropdown to fully render
  setTimeout(() => {
    const dropdownRect = dropdown.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    console.log('Dropdown rect:', dropdownRect);
    console.log('Container rect:', containerRect);
    
    // Check if dropdown is clipped at the top of the container
    if (dropdownRect.top < containerRect.top) {
      const scrollOffset = containerRect.top - dropdownRect.top + 30;
      console.log('Scrolling up by:', scrollOffset);
      container.scrollBy({
        top: -scrollOffset,
        behavior: 'smooth'
      });
    }
    // Check if dropdown is clipped at the bottom of the container
    else if (dropdownRect.bottom > containerRect.bottom) {
      const scrollOffset = dropdownRect.bottom - containerRect.bottom + 30;
      console.log('Scrolling down by:', scrollOffset);
      container.scrollBy({
        top: scrollOffset,
        behavior: 'smooth'
      });
    }
    // Check if dropdown is clipped at the bottom of the viewport
    else if (dropdownRect.bottom > viewportHeight) {
      const scrollOffset = dropdownRect.bottom - viewportHeight + 50;
      console.log('Scrolling viewport by:', scrollOffset);
      window.scrollBy({
        top: scrollOffset,
        behavior: 'smooth'
      });
    }
  }, 50);
};

const toggleAddCheckDropdown = (index) => {
  if (showAddCheckDropdown.value === index) {
    closeDropdown();
  } else {
    showAddCheckDropdown.value = index;
    nextTick(() => {
      const dropdown = document.querySelector(`[data-dropdown-index="${index}"]`);
      const tableContainer = document.querySelector('.overflow-x-auto');
      
      if (dropdown && tableContainer) {
        // First, scroll the row into view
        dropdown.scrollIntoView({ block: "nearest", inline: "nearest" });
        
        // Wait for dropdown to fully render, then ensure visibility
        setTimeout(() => {
          // Look for the actual dropdown listbox that contains the items
          const dropdownListbox = dropdown.querySelector('vscode-dropdown-item') || dropdown;
          ensureDropdownVisibility(dropdownListbox, tableContainer);
        }, 100); // Increased delay to ensure dropdown content is fully rendered
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
  const payload = { columns: JSON.parse(JSON.stringify(localColumns.value)) };
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: payload,
    source: "deleteColumn",
  });
};

const fillColumnsFromDB = () => {
  // Clear any existing error messages
  fillColumnsStatus.value = "loading";
  fillColumnsMessage.value = null;
  vscode.postMessage({
    command: "bruin.fillAssetColumn",
  });
};



// Message handler for fill operations
const handleMessage = (event) => {
  const envelope = event.data;
  
  switch (envelope.command) {
    case "fill-columns-message":
      const loadingMessage = updateValue(envelope, "loading");
      const successMessage = updateValue(envelope, "success");
      const errorMessage = updateValue(envelope, "error");
      
      if (loadingMessage) {
        fillColumnsStatus.value = "loading";
        fillColumnsMessage.value = loadingMessage;
      } else if (successMessage) {
        fillColumnsStatus.value = "success";
        fillColumnsMessage.value = successMessage;
        setTimeout(() => {
          fillColumnsStatus.value = null;
          fillColumnsMessage.value = null;
        }, 10000);
      } else if (errorMessage) {
        fillColumnsStatus.value = "error";
        fillColumnsMessage.value = errorMessage;
      }
      break;
  }
};

// Handle click outside to close dropdown
const handleClickOutside = (event) => {
  const target = event.target;
  const dropdown = target.closest('vscode-dropdown');
  const button = target.closest('vscode-button[aria-label="Add check"]');
  
  if (!dropdown && !button) {
    closeDropdown();
  }
};

// Enhanced dropdown close function with cleanup
const closeDropdown = () => {
  if (showAddCheckDropdown.value !== null) {
    // Remove temporary overflow class if it was added
    const tableContainer = document.querySelector('.overflow-x-auto');
    if (tableContainer) {
      tableContainer.classList.remove('dropdown-container-open');
    }
  }
  showAddCheckDropdown.value = null;
};

// Handle keyboard events for better accessibility
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (showAddCheckDropdown.value !== null) {
      closeDropdown();
    } else if (showPatternInput.value) {
      cancelPatternInput();
    }
  }
};

// Register message handler
onMounted(() => {
  window.addEventListener("message", handleMessage);
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeyDown);
});

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

vscode-dropdown::part(listbox) {
  max-height: 200px;
  overflow-y: auto;
  z-index: 1001;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Temporary class to adjust container overflow during dropdown display */
.dropdown-container-open {
  overflow: visible !important;
  position: relative;
}

/* Enhanced dropdown positioning */
.relative vscode-dropdown {
  position: relative;
}

.relative vscode-dropdown::part(listbox) {
  position: absolute;
  z-index: 9999;
  min-width: 100%;
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
