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
const isReloading = ref(false); // A new parse is in flight (file switch / edit)
// True while an asset switch is in flight (the panel only sends the loading
// signal on a real file change). Lets us tell a switch apart from a same-file
// re-parse so a failed switch drops the graph while a same-file error keeps it.
const switchPending = ref(false);

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
    case "flow-lineage-loading":
      // A real file switch started (this signal is only sent on a file change).
      // Only fall back to the loading spinner when there's nothing to show yet;
      // if we already have a graph, keep it on screen and let the incoming data
      // swap it in place so the switch is smooth instead of blanking.
      switchPending.value = true;
      if (!lineageData.value) {
        isReloading.value = true;
      }
      lineageError.value = undefined;
      return;
    case "flow-lineage-message":
      isReloading.value = false;
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
        return;
      }
      lastMessageId = messageId;

      const wasSwitch = switchPending.value;
      switchPending.value = false;

      if (newData || wasSwitch) {
        // Valid data, or a switch that failed: adopt the result (null on a
        // failed switch clears the previous asset's graph so it isn't left
        // showing under the new file).
        lineageData.value = newData;
      }
      // Otherwise this is a same-file re-parse that errored — keep the last
      // good graph on screen and just surface the error.
      lineageError.value = newError;
      break;
  }
};

window.addEventListener("message", handleMessage);

// Set a timeout to stop infinite loading after 10 seconds
setTimeout(() => {
  if (!lineageData.value && !lineageError.value) {
    hasTimedOut.value = true;
    lineageError.value = "Timed out loading lineage data. Please try refreshing the panel.";
  }
}, 10000);

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
const isLoading = computed(() => !hasTimedOut.value && (isReloading.value || (!lineageData.value && !lineageError.value)));

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