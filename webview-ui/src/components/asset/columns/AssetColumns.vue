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
          <div class="truncate" :title="column.name">{{ column.name }}</div>
        </div>
        <div class="flex-1 min-w-0 px-2 text-left">
          <div
            v-if="column.type"
            class="flex-1 min-w-0 px-2 text-left text-[0.7rem] opacity-70 truncate"
            :title="column.type.toUpperCase()"
          >
            {{ column.type.toUpperCase() }}
          </div>
          <div
            class="flex-1 min-w-0 px-2 text-left text-editor-fg opacity-30 text-xs sm:text-xs truncate"
            title="undefined"
            v-else
          >
            undefined
          </div>
        </div>
        <div
          v-if="column.description"
          class="flex-[2] min-w-0 px-2 text-left text-xs text-input-foreground opacity-70 font-light"
        >
          {{ column.description }}
        </div>
        <div
          v-else
          class="flex-[2] min-w-0 px-2 text-left text-xs text-input-foreground opacity-60 font-light italic"
        >
          No description provided.
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
            <span class="block truncate max-w-[100px]">{{ check }}</span>
          </vscode-badge>
          <div
            v-if="column.checks.patternEnabled && column.checks.pattern"
            class="text-sm sm:text-xs text-editor-fg whitespace-nowrap"
          >
            Pattern: {{ column.checks.pattern }}
          </div>
        </div>
        <div class="flex-[1/2] justify-end space-x-2">
          <vscode-button appearance="icon" @click="startEditing(index)" aria-label="Edit">
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
import { TrashIcon, PencilIcon } from "@heroicons/vue/20/solid";
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
  // Implement editing functionality here
  console.log(`Editing column at index ${index}`);
};

const deleteColumn = (index) => {
  localColumns.value.splice(index, 1);
  showDeleteAlert.value = !showDeleteAlert.value;
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
</style>
