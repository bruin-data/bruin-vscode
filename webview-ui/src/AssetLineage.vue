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
import { updateValue, normalizePath } from "./utilities/helper";
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
// The file whose parse we're now waiting on (from the loading signal, sent only
// on a real file change) and the file currently drawn. Correlating responses by
// path — rather than a shared flag — means an out-of-order response for an older
// asset can't be mistaken for the current one when loads overlap.
let expectedFile: string | undefined;
let displayedFile: string | undefined;

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
      // Remember the target so we can correlate the eventual response. Only fall
      // back to the loading spinner when there's nothing to show yet; if we
      // already have a graph, keep it on screen and swap in place.
      expectedFile = message.filePath;
      if (!lineageData.value) {
        isReloading.value = true;
      }
      lineageError.value = undefined;
      return;
    case "flow-lineage-message":
      const responseFile = message.payload?.filePath;
      // Drop a response for a file we're no longer waiting on — an out-of-order
      // result from a previous asset must not touch the current graph/state.
      // Compare normalized paths so Windows/macOS case and separator differences
      // don't wrongly reject a matching response.
      if (
        expectedFile &&
        responseFile &&
        normalizePath(responseFile) !== normalizePath(expectedFile)
      ) {
        return;
      }
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

      // A response for a different file than what's drawn is a switch; on
      // failure that must drop the previous asset's graph. A same-file re-parse
      // that errors keeps the last good graph and just surfaces the error.
      const isSwitch =
        !displayedFile ||
        (responseFile && normalizePath(responseFile) !== normalizePath(displayedFile));
      if (newData || isSwitch) {
        lineageData.value = newData;
      }
      if (responseFile) {
        displayedFile = responseFile;
      }
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