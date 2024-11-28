<template>
  <div class="flex flex-col py-2 sm:py-1 h-full w-56 relative">
    <table class="min-w-full border-collapse border-editor-fg">
      <thead>
        <tr
          class="border-opacity-test text-xs font-semibold text-left opacity-65 border-b-2"
        >
          <th class="px-2 py-1 w-1/4">Name</th>
          <th class="px-2 py-1 w-1/6 text-center">Value</th>
          <th class="px-2 py-1 w-1/4 text-center">Description</th>
          <th class="px-2 py-1 w-1/2">Query</th>
        </tr>
      </thead>
      <tbody v-if="customChecks.length">
        <tr
          v-for="(check, index) in customChecks"
          :key="index"
          class="border-b border-commandCenter-border"
        >
          <!-- Check Name with improved handling -->
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/4">
            <div class="break-words whitespace-normal truncate" :title="check.name">
              {{ check.name }}
            </div>
          </td>
          <!-- Value -->
          <td class="px-2 py-1 font-medium font-mono text-xs w-1/6 text-center">
            <div v-if="check.value" class="truncate" :title="check.value">
              {{ check.value }}
            </div>
            <div v-else class="italic opacity-70 truncate whitespace-normal">undefined</div>
          </td>
          <!-- Description -->
          <td class="px-2 py-1 text-xs w-1/4 text-center">
            <div
              v-if="check.description"
              class="truncate whitespace-normal"
              :title="check.description"
            >
              {{ check.description }}
            </div>
            <div v-else class="italic opacity-70 truncate whitespace-normal">
              No description provided
            </div>
          </td>
          <!-- Query -->
          <td class="px-2 py-1 text-xs w-1/2">
            <div v-html="highlightedLines(check.query)" class="truncate" :title="check.query"></div>
          </td>
        </tr>
      </tbody>
      <div class="w-56 text-left p-2 text-md italic opacity-70" v-else>
        <span> No custom checks to display. </span>
      </div>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { CustomChecks } from "@/types";
import "highlight.js/styles/default.css";
import hljs from "highlight.js/lib/core";

const props = defineProps<{
  customChecks: CustomChecks[];
}>();

const highlightedLines = (query) => {
  if (!query) return []; // Return an empty array if no query is provided
  const highlighted = hljs.highlight(query, { language: "sql" }).value;

  // Split the highlighted output into lines
  let lines = highlighted.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop(); // Remove the last empty line if it exists
  }

  // Return each line wrapped in a <div> for proper formatting
  return lines.map((line) => `<div>${line}</div>`).join(""); // Join lines with <div> for line breaks
};
</script>

<style scoped>
table thead tr.border-opacity-test {
  border: 0.7!important; /* Adjust the opacity value as needed */
}

</style>