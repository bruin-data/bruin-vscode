<template>
  <div class="flex flex-col py-4 sm:py-1 bg-editorWidget-bg">
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
    <div class="flex-1 min-h-0">
      <div
        v-if="localColumns.length"
        v-for="(column, index) in localColumns"
        :key="index"
        class="flex p-1 border-b border-commandCenter-border items-center"
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
          <select
            v-if="editingIndex === index"
            v-model="editingColumn.type"
            class="w-full bg-editorWidget-bg text-editor-fg"
          >
            <option value="string">STRING</option>
            <option value="number">NUMBER</option>
            <option value="boolean">BOOLEAN</option>
            <option value="date">DATE</option>
          </select>
          <div
            v-else
            class="flex-1 min-w-0 px-2 text-left text-[0.7rem] opacity-70 truncate"
            :title="column.type.toUpperCase()"
          >
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
            class="text-xs text-input-foreground opacity-70 font-light"
          >
            {{ column.description || "No description provided." }}
          </div>
        </div>
        <!-- Checks Column -->
        <div class="flex-1 pr-6 min-w-0 text-left flex flex-wrap gap-2 whitespace-nowrap font-mono">
          <vscode-badge
            v-for="check in getActiveChecks(column)"
            :key="check"
            :class="{ 'relative cursor-pointer': check === 'accepted_values' }"
            :title="
              check === 'accepted_values'
                ? 'accepted_values \n' + column.checks.accepted_values.join('\n')
                : ''
            "
            :style="{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }"
          >
            <span class="flex items-center truncate"
              >{{ check }}
              <XMarkIcon
                v-if="editingIndex === index"
                @click="removeCheck(index, check)"
                class="h-3 w-3 text-editor-fg ml-[0.1rem] cursor-pointer"
              />
            </span>
          </vscode-badge>
          <div
            v-if="column.checks.patternEnabled && column.checks.pattern"
            class="text-sm sm:text-xs text-editor-fg whitespace-nowrap"
          >
            Pattern: {{ column.checks.pattern }}
          </div>
          <div v-if="editingIndex === index" class="relative">
            <vscode-button appearance="icon" @click="toggleAddCheckDropdown(index)" aria-label="Add Check">
              <PlusIcon class="h-4 w-4" />
            </vscode-button>
            <div v-if="showAddCheckDropdown === index" class="absolute z-10 mt-1 bg-editorWidget-bg border border-commandCenter-border rounded shadow-lg">
              <div
                v-for="check in availableChecks(column)"
                :key="check"
                @click="addCheck(index, check)"
                class="px-4 py-2 hover:bg-commandCenter-border cursor-pointer"
              >
                {{ check }}
              </div>
            </div>
          </div>
        </div>
        <div class="flex-[1/2] justify-end space-x-2">
          <vscode-button v-if="editingIndex === index" appearance="icon" @click="saveChanges(index)" aria-label="Save">
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
      <div
        v-else
        class="flex p-2 sm:p-2 bg-editorWidget-bg mb-2 text-editor-fg opacity-50 font-light italic"
      >
        No columns provided.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import { TrashIcon, PencilIcon, XMarkIcon, CheckIcon } from "@heroicons/vue/20/solid";
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

const emitUpdateColumns = () => {
  emit("update:columns", localColumns.value);
};

const startEditing = (index) => {
  editingIndex.value = index;
  editingColumn.value = { ...localColumns.value[index] };
};

const saveChanges = (index) => {
  localColumns.value[index] = { ...editingColumn.value };
  editingIndex.value = null;
  emitUpdateColumns();
};

const deleteColumn = (index) => {
  localColumns.value.splice(index, 1);
  showDeleteAlert.value = false;
  emitUpdateColumns();
};

const removeCheck = (index, check) => {
  localColumns.value[index].checks[check] = false;
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
}

vscode-button::part(control) {
  border: none;
  outline: none;
}

input, select {
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  padding: 2px 4px;
  font-size: 0.9em;
}
</style>