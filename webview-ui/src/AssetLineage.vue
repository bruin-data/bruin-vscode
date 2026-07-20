<template>
  <div class="flex w-full" data-component="AssetLineageFlow">
    <Lineage
      :assetDataset="assetDataset"
      :pipelineData="pipelineData"
      :LineageError="lineageError"
      :isLoading="isLoading"
    />
  </div>
</template>

<script setup lang="ts">
import Lineage from "@/components/lineage-flow/Lineage.vue";
import { ref, onUnmounted, computed, watch, onMounted } from "vue";
import { updateValue } from "./utilities/helper";
import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";

/**
 * AssetLineagePanel Component
 * 
 * This component serves as the dedicated panel for displaying asset lineage data.
 */

const lineageData = ref(); // Holds the lineage data received from the extension
const lineageError = ref(); // Holds any errors related to lineage data
const hasTimedOut = ref(false); // Tracks if initial load has timed out

let lastMessageId: string | null = null;

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
      const newData = updateValue(message, "success");
      const newError = updateValue(message, "error");
      
      // Create a detailed hash to detect truly identical messages
      const messageId = JSON.stringify({ 
        assetId: newData?.id, 
        upstreamNames: newData?.upstreams?.map(u => u.name).sort(), 
        downstreamNames: newData?.downstream?.map(d => d.name).sort(),
        error: newError,
        timestamp: Math.floor(Date.now() / 50) // Group within 50ms only
      });
      
      // Skip if this is the exact same message we just processed
      if (messageId === lastMessageId && messageId !== 'null') {
        console.log('⚡ [AssetLineage] Skipping duplicate message');
        return;
      }
      lastMessageId = messageId;
      
      lineageData.value = newData;
      lineageError.value = newError;
      break;
  }
};

window.addEventListener("message", handleMessage);

// Safety net: only fires if the very first load never returns any data or
// error. Once a graph has rendered, switches keep the previous data on screen,
// so this never surfaces a false error mid-parse.
setTimeout(() => {
  if (!lineageData.value && !lineageError.value) {
    hasTimedOut.value = true;
    lineageError.value = "Timed out loading lineage data. Please try refreshing the panel.";
  }
}, 30000);

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
  // For pipeline view, return the lineage data directly with pipeline info
  if (lineageData.value?.isPipelineView) {
    return {
      id: 'pipeline',
      name: lineageData.value.name || 'Pipeline',
      isPipelineView: true,
      pipelineData: lineageData.value.pipelineData || pipeline.value,
      // Include any other data that might be needed
      ...lineageData.value
    };
  }
  
  // For regular asset view, use the existing logic
  return getAssetDataset(pipeline.value, assetId.value);
});

const pipelineData = computed(() => pipeline.value);
const isLoading = computed(() => !lineageData.value && !lineageError.value && !hasTimedOut.value);

onMounted(() => {
  console.log('🚀 [AssetLineage] Component mounted');
  console.log('🚀 [AssetLineage] Initial lineageData:', lineageData.value);
  console.log('🚀 [AssetLineage] Initial lineageError:', lineageError.value);
  console.log('🚀 [AssetLineage] Initial isLoading:', isLoading.value);
  
  // Log state changes
  watch([lineageData, lineageError, isLoading], ([newData, newError, newLoading]) => {
    console.log('🔄 [AssetLineage] State changed:');
    console.log('  - lineageData:', !!newData);
    console.log('  - lineageError:', newError);
    console.log('  - isLoading:', newLoading);
  });
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});
</script>