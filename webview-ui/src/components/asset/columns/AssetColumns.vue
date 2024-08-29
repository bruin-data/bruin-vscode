<template>
  <div class="flex flex-col space-y-2 p-4 bg-editor-bg">
    <h2 class="text-2xl font-bold text-editor-fg mb-4">Column Details</h2>

    <!-- Header Row -->
    <div class="flex bg-editorWidget-bg p-2 rounded-t-lg font-semibold text-editor-fg text-md">
      <div class="w-1/4">Name</div>
      <div class="w-1/4">Type</div>
      <div class="w-1/2">Description</div>
    </div>

    <!-- Column Rows -->
    <div
      v-for="(column, index) in columns"
      :key="index"
      class="flex flex-col bg-editorWidget-bg mb-2 rounded-b-lg shadow-sm"
    >
      <!-- Column Details -->
      <div class="flex p-4 border-b border-commandCenter-border items-center">
        <div class="w-1/4 font-semibold text-editor-fg text-md">{{ column.name }}</div>
        <div class="w-1/4">
          <vscode-tag>{{ column.type.toUpperCase() }}</vscode-tag>
        </div>
        <div class="w-1/2 text-editor-fg opacity-50 text-sm">{{ column.description }}</div>
      </div>

      <!-- Checks Section -->
      <div class="p-4">
        <div class="flex justify-between mb-2">
          <h3 class="text-lg font-semibold text-editor-fg">Checks</h3>
          <!-- Blocking switch -->
          <div class="flex items-center space-x-1">
            <label class="inline-flex items-center cursor-pointer">
              <input type="checkbox" class="sr-only peer" checked disabled />

              <div
                class="relative w-9 h-5 bg-input-background rounded-full peer-checked:bg-editor-button-bg peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-editor-fg after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-disabled:opacity-60 peer-disabled:cursor-not-allowed"
              ></div>

              <span
                class="ml-3 text-sm font-medium text-[var(--vscode-editor-foreground)] opacity-50"
              >
                Blocking
              </span>
            </label>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <vscode-badge v-for="check in getActiveChecks(column)" :key="check" class="custom-badge">
            {{ check }}
          </vscode-badge>
        </div>
        <!-- <div v-if="column.checks.acceptedValuesEnabled" class="mt-2">
          <span class="text-sm text-editor-fg">
            Accepted values: {{ column.checks.accepted_values.join(", ") }}
          </span>
        </div> -->
        <div v-if="column.checks.patternEnabled && column.checks.pattern" class="mt-2">
          <span class="text-sm text-editor-fg"> Pattern: {{ column.checks.pattern }} </span>
        </div>
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
  background-color: var(--vscode-button-background);
}
</style>
