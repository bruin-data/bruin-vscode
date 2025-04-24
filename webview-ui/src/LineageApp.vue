<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab
      v-for="(tab, index) in tabs"
      :key="`tab-${index}`"
      :id="`tab-${index}`"
      @click="activeTab = index"
    >
      {{ tab.label }}
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
import PipelineLineageFlow from "@/components/lineage-flow/pipeline-lineage/PipelineLineage.vue";
import { ref, onUnmounted, computed } from "vue";
import { updateValue } from "./utilities/helper";
import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";

/**
 * LineageApp Component
 * 
 * This component serves as the main application for displaying lineage data.
 * It handles communication with the VSCode extension, manages the state of
 * lineage data, and renders the lineage flow component.
 */

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
const assetDataset = computed(() => {
  return getAssetDataset(pipeline.value, assetId.value)
});
const focusAssetName = computed(() => {
  if (!assetDataset.value) return null;
  return assetDataset.value.name;
});
// Define tabs for the application
const tabs = ref([
  {
    label: "Asset Lineage",
    component: AssetLineageFlow,
    props: {
      assetDataset,
      pipelineData: computed(() => pipeline.value),
      LineageError: lineageErr.value,
      isLoading: computed(() => !lineageData.value && !lineageError.value),
    },
  },
  {
    label: "Pipeline Lineage",
    component: PipelineLineageFlow,
    props: {
      assetDataset,
      pipelineData: pipeline,
      LineageError: lineageErr.value,
      isLoading: computed(() => !lineageData.value && !lineageError.value),
      focusAssetName
    },
  },
]);


onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});

</script>
<style>
vscode-panel-view {
  padding: 0 !important;
}
</style>