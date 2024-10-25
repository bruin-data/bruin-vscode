<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab :id="`tab-lineage`">
      <div class="flex items-center justify-center">
        <span> Lineage </span>
        <ArrowPathIcon
          @click="refreshGraphLineage"
          class="ml-2 w-4 h-4 text-link-activeForeground hover:text-progressBar-bg focus:outline-none"
          title="Refresh"
        />
      </div>
    </vscode-panel-tab>

    <!-- Tab Content -->
    <vscode-panel-view
      v-for="(tab, index) in tabs"
      :key="`view-${index}`"
      :id="`view-${index}`"
      v-show="activeTab === index"
    >
      <component
        v-if="tab.props"
        :is="tab.component"
        v-bind="tab.props"
        class="flex w-full"
      />
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetLineageFlow from "@/components/lineage-flow/asset-lineage/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, onUnmounted, computed } from "vue";
import { updateValue } from "./utilities/helper";
import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";
import { ArrowPathIcon } from "@heroicons/vue/20/solid";

/**
 * LineageApp Component
 * 
 * This component serves as the main application for displaying lineage data.
 * It handles communication with the VSCode extension, manages the state of
 * lineage data, and renders the lineage flow component.
 */

const parseError = ref(); // Holds any parsing errors
const lineageData = ref(); // Holds the lineage data received from the extension
const lineageError = ref(); // Holds any errors related to lineage data
const activeTab = ref(0); // Tracks the currently active tab

/**
 * Handles incoming messages from the VSCode extension.
 * 
 * @param {MessageEvent} event - The message event containing data from the extension.
 */
const handleMessage = (event) => {
  const message = event.data;
  switch (message.command) {
    case "flow-lineage-message":
      lineageData.value = updateValue(message, "success");
      lineageError.value = updateValue(message, "error");
      break;
  }
};

window.addEventListener("message", handleMessage);

const pipeline = computed(() => {
  if (!lineageData.value?.pipeline) return null;
  try {
    return JSON.parse(lineageData.value.pipeline);
  } catch (error) {
    console.error("Error parsing pipeline data:", error);
    return null;
  }
});

const lineageErr = computed(() => lineageError.value);
const assetId = computed(() => lineageData.value?.id ?? null);

// Define tabs for the application
const tabs = ref([
  {
    label: "Lineage",
    component: AssetLineageFlow,
    props: {
      assetDataset: computed(() => getAssetDataset(pipeline.value, assetId.value)),
      pipelineData: computed(() => pipeline.value),
      LineageError: lineageErr.value,
      isLoading: computed(() => !lineageData.value && !lineageError.value),
    },
  },
]);

onMounted(() => {
  loadLineageData();
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});

/**
 * Debounce function to limit the rate at which a function can fire.
 * 
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to wait before calling the function.
 * @returns {Function} - A debounced version of the function.
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Refreshes the lineage graph by sending a message to the VSCode extension.
 * 
 * @param {Event} event - The click event that triggered the refresh.
 */
const refreshGraphLineage = debounce((event: Event) => {
  event.stopPropagation(); // Prevent event bubbling
  vscode.postMessage({ command: "bruin.assetGraphLineage" });
}, 300); // 300ms debounce time

/**
 * Loads lineage data by sending a message to the VSCode extension.
 */
function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}
</script>
