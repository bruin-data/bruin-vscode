<template>
<div class="flex flex-col py-4 sm:py-1 bg-editorWidget-bg">
  <!-- Header Row -->
  <div class="flex p-2 sm:p-2 font-semibold text-editor-fg text-md opacity-65 border-b-2 border-editor-fg">
    <div class="flex-1 min-w-0 px-2 text-left">Name</div>
    <div class="flex-1 min-w-0 px-2 text-left">Type</div>
    <div class="flex-1 min-w-0 px-2 text-left">Description</div>
    <div class="flex-1 min-w-0 px-2 text-left">Checks</div>
  </div>

  <!-- Column Rows -->
  <div class="flex-1 min-h-0 overflow-auto">
    <div
      v-if="columns.length"
      v-for="(column, index) in columns"
      :key="index"
      class="flex p-2 sm:p-2 border-b border-commandCenter-border items-center"
    >
      <!-- Column Details -->
      <div class="flex-1 min-w-0 px-2 text-left">{{ column.name }}</div>
      <div class="flex-1 min-w-0 px-2 text-left">
        <vscode-tag v-if="column.type">{{ column.type.toUpperCase() }}</vscode-tag>
        <div class="text-editor-fg opacity-30 text-sm sm:text-xs" v-else>undefined</div>
      </div>
      <div v-if="column.description" class="flex-1 min-w-0 px-2 text-left">
        {{ column.description }}
      </div>
      <div v-else class="flex-1 min-w-0 px-2 text-left">No description provided.</div>
      <!-- Checks Column -->
      <div class="flex-1 min-w-0 px-2 text-left flex flex-wrap gap-2 whitespace-nowrap">
        <vscode-badge
          v-for="check in getActiveChecks(column)"
          :key="check"
          :class="{ 'relative cursor-pointer': check === 'accepted_values' }"
          :title="check === 'accepted_values' ? column.checks.accepted_values.join('\n') : ''"
        >
          {{ check }}
        </vscode-badge>
        <div v-if="column.checks.patternEnabled && column.checks.pattern" class="text-sm sm:text-xs text-editor-fg whitespace-nowrap">
          Pattern: {{ column.checks.pattern }}
        </div>
      </div>
    </div>
    <div v-else class="flex p-2 sm:p-2 bg-editorWidget-bg mb-2 text-editor-fg opacity-50 font-light italic">No columns provided.</div>
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
/* Custom styles for vscode-badge */
vscode-badge::part(control) {
  background-color: var(--vscode-button-background);
}
</style>
