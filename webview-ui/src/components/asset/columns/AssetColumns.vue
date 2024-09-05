<template>
  <div class="flex flex-col py-4 sm:py-1">
    <!-- Header Row -->
    <div
      class="flex p-2 sm:p-2 font-semibold text-editor-fg text-md opacity-65 border-b-2 border-editor-fg"
    >
      <div class="flex-[2] min-w-0 px-2 text-left">Name</div>
      <div class="flex-[2] min-w-0 px-2 text-left">Type</div>
      <div class="flex-[3] min-w-0 px-2 text-left">Description</div>
      <div class="flex-[2] min-w-0 px-2 text-left">Checks</div>
    </div>

    <!-- Column Rows -->
    <div class="flex-[2] min-h-0">
      <div
        v-if="columns.length"
        v-for="(column, index) in columns"
        :key="index"
        class="flex p-1 border-b border-commandCenter-border items-center"
      >
        <!-- Column Details -->
        <div class="flex-[2] min-w-0 px-2 text-left font-medium font-mono">
          <div class="truncate" :title="column.name">{{ column.name }}</div>
        </div>
        <div class="flex-[2] min-w-0 px-2 text-left">
          <div
            v-if="column.type"
            class="flex-[2] min-w-0 px-2 text-left text-[0.7rem] opacity-70 truncate font-mono"
            :title="column.type.toUpperCase()"
          >
            {{ column.type.toUpperCase() }}
          </div>
          <div
            class="flex-[2] min-w-0 px-2 text-left text-editor-fg opacity-30 text-xs sm:text-xs truncate font-mono"
            title="undefined"
            v-else
          >
            undefined
          </div>
        </div>
        <div
          v-if="column.description"
          class="flex-[3] min-w-0 px-2 text-left text-xs text-input-foreground opacity-70 font-light"
        >
          {{ column.description }}
        </div>
        <div v-else class="flex-[3] min-w-0 px-2 text-left text-xs text-input-foreground opacity-60 font-light italic">
          No description provided.
        </div>
        <!-- Checks Column -->
        <div class="flex-[2] min-w-0 px-2 text-left flex flex-wrap gap-2 whitespace-nowrap font-mono">
          <vscode-badge
            v-for="check in getActiveChecks(column)"
            :key="check"
            :class="{ 'relative cursor-pointer': check === 'accepted_values' }"
            :title="check === 'accepted_values' ? 'accepted_values \n' + column.checks.accepted_values.join('\n') : ''"
            :style="{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              
            }"
          >
            <span class="block truncate max-w-[100px] font-mono">{{ check }}</span>
          </vscode-badge>
          <div
            v-if="column.checks.patternEnabled && column.checks.pattern"
            class="text-sm sm:text-xs text-editor-fg whitespace-nowrap"
          >
            Pattern: {{ column.checks.pattern }}
          </div>
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
import { defineProps } from "vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
});

const getActiveChecks = (column) => {
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
};
</script>

<style scoped>
vscode-badge::part(control) {
  background-color: transparent; 
  border: 1px solid var(--vscode-commandCenter-border); 
  color: var(--vscode-editor-foreground);
  font-family: 'monospace';
}
</style>
