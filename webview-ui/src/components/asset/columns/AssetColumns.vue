<template>
  <div class="flex flex-col space-y-1 p-4 sm:p-1 bg-editor-bg">
    <!-- Header Row -->
    <div class="flex bg-editorWidget-bg p-2 sm:p-2 font-semibold text-editor-fg text-md opacity-65">
      <div class="header-cell">Name</div>
      <div class="header-cell">Type</div>
      <div class="header-cell">Description</div>
    </div>

    <!-- Column Rows -->
    <div
      v-if="columns.length"
      v-for="(column, index) in columns"
      :key="index"
      class="flex flex-col bg-editorWidget-bg mb-2 shadow-sm"
    >
      <!-- Column Details -->
      <div class="flex p-2 sm:p-2 border-b border-commandCenter-border items-center">
        <div class="column-cell">{{ column.name }}</div>
        <div class="column-cell">
          <vscode-tag v-if="column.type">{{ column.type.toUpperCase() }}</vscode-tag>
          <div class="text-editor-fg opacity-30 text-sm sm:text-xs" v-else>undefined</div>
        </div>
        <div v-if="column.description" class="column-cell">
          {{ column.description }}
        </div>
        <div v-else class="column-cell">No description provided.</div>
      </div>

      <!-- Checks Section -->
      <div class="p-2 sm:p-2 flex items-center flex-wrap gap-2">
        <vscode-badge
          v-for="check in getActiveChecks(column)"
          :key="check"
          :class="{ 'has-tooltip': check === 'accepted_values' }"
          :title="check === 'accepted_values' ? column.checks.accepted_values.join('\n') : ''"
        >
          {{ check }}
        </vscode-badge>
        <div v-if="column.checks.patternEnabled && column.checks.pattern" class="mt-2 text-sm sm:text-xs text-editor-fg">
          Pattern: {{ column.checks.pattern }}
        </div>
      </div>
    </div>
    <div v-else class="flex p-2 sm:p-2 bg-editorWidget-bg mb-2 text-editor-fg opacity-50 font-light italic">No columns provided.</div>
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
.has-tooltip {
  position: relative;
  cursor: pointer;
}

.header-cell {
  flex: 1;
  padding: 0 8px;
  text-align: left;
}

.column-cell {
  flex: 1;
  padding: 0 8px; 
  text-align: left;
}

vscode-badge::part(control) {
  background-color: var(--vscode-button-background);
}
</style>
