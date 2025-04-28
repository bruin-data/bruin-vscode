<template>
  <div class="flex w-full">
    <AssetLineageFlow
      :assetDataset="assetDataset"
      :pipelineData="pipelineData"
      :LineageError="lineageError"
      :isLoading="isLoading"
    />
  </div>
</template>

<script setup lang="ts">
import AssetLineageFlow from "@/components/lineage-flow/asset-lineage/AssetLineage.vue";
import { ref, onUnmounted, computed, watch } from "vue";
import { updateValue } from "./utilities/helper";
import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";

/**
 * AssetLineagePanel Component
 * 
 * This component serves as the dedicated panel for displaying asset lineage data.
 */

const lineageData = ref(); // Holds the lineage data received from the extension
const lineageError = ref(); // Holds any errors related to lineage data

/**
 * Handles incoming messages from the VSCode extension.
 * 
 * @param {MessageEvent} event - The message event containing data from the extension.
 */
const handleMessage = (event) => {
  const message = event.data;
  if (message.panelType !== "AssetLineage") return;
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

const pipelineData = computed(() => pipeline.value);
const isLoading = computed(() => !lineageData.value && !lineageError.value);

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});
</script>