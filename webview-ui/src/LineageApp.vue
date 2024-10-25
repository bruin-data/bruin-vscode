<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab
      :id="`tab-lineage`"
    >
      <div class="flex items-center justify-center">
        <span> Lineage </span>
        <ArrowPathIcon
          @click="refreshGraphLineage"
          class="ml-2 w-4 h-4 text-link-activeForeground hover:text-progressBar-bg focus:outline-none"
          title="Refresh"
        >
        </ArrowPathIcon>
      </div>
    </vscode-panel-tab>

    <!-- Tab Content -->
    <vscode-panel-view
      v-for="(tab, index) in visibleTabs"
      :key="`view-${index}`"
      :id="`view-${index}`"
      v-show="activeTab === index"
    >
      <component
        v-if="tab.props !== null"
        :is="tab && tab.component"
        v-bind="tab && tab.props"
        class="flex w-full"
      />
      <div class="flex w-full" v-else-if="parseError">
        <MessageAlert message="This file is either not a Bruin Asset or has no data to display." />
      </div>
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetLineageFlow from "@/components/lineage-flow/asset-lineage/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed } from "vue";
import { updateValue } from "./utilities/helper";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";
import { ArrowPathIcon } from "@heroicons/vue/20/solid";

const panelType = ref("");
const parseError = ref();

const lineageData = ref();
const lineageError = ref();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init":
      panelType.value = message.panelType;
      break;
    case "flow-lineage-message":
      lineageData.value = updateValue(message, "success");
      lineageError.value = updateValue(message, "error");
      break;
  }
});

const activeTab = ref(0);

const pipeline = computed(() => {
  if (!lineageData.value || !lineageData.value.pipeline) return null;
  try {
    return JSON.parse(lineageData.value.pipeline);
  } catch (error) {
    console.error("Error parsing pipeline data:", error);
    return null;
  }
});

const lineageErr = computed(() => lineageError.value);
const assetId = computed(() => lineageData.value?.id ?? null);

const tabs = ref([
  {
    label: "Lineage",
    component: AssetLineageFlow,
    props: {
      assetDataset: computed(() => getAssetDataset(pipeline.value, assetId.value)),
      pipelineData: computed(() => pipeline.value),
      LineageError: lineageErr.value,
      isLoading: computed(() => !lineageData.value && !lineageError.value), // Add this line
    },
  },
]);

const visibleTabs = computed(() => {
  return tabs.value.filter((tab) => tab.label === "Lineage");
});

onMounted(() => {
  loadLineageData();
});

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Updated refreshGraphLineage function
const refreshGraphLineage = debounce((event: Event) => {
  event.stopPropagation(); // Prevent event bubbling
  vscode.postMessage({ command: "bruin.assetGraphLineage" });
}, 300); // 300ms debounce time

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}


</script>
