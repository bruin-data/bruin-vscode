<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab
      v-for="(tab, index) in filteredTabs"
      :key="`tab-${index}`"
      :id="`tab-${index}`"
      @click="activeTab = index"
    >
      <div class="flex items-center justify-center">
        <span>{{ tab && tab.label }}</span>
        <ArrowPathIcon
          v-if="tab.label === 'Lineage' && activeTab === index"
          @click="refreshGraphLineage"
          class="ml-2 w-4 h-4 text-link-activeForeground hover:text-progressBar-bg focus:outline-none"
          title="Refresh"
        >
        </ArrowPathIcon>
      </div>
    </vscode-panel-tab>

    <!-- Tab Content -->
    <vscode-panel-view
      v-for="(tab, index) in filteredTabs"
      :key="`view-${index}`"
      :id="`view-${index}`"
      v-show="activeTab === index"
    >
      <component
        v-if="tab.props !== null"
        :is="tab && tab.component"
        v-bind="tab && tab.props"
        class="flex w-full"
        @update:assetName="updateAssetName"
      />
      <div class="flex w-full" v-else-if="parseError">
        <MessageAlert message="This file is either not a Bruin Asset or has no data to display." />
      </div>
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetDetails from "@/components/asset/AssetDetails.vue";
import AssetLineageText from "@/components/lineage-text/AssetLineageText.vue";
import AssetLineageFlow from "@/components/lineage-flow/asset-lineage/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed, watch } from "vue";
import { parseAssetDetails, parseEnvironmentList } from "./utilities/helper";
import { updateValue } from "./utilities/helper";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";
import { ArrowPathIcon } from "@heroicons/vue/20/solid";
import type { EnvironmentsList } from "./types";

const panelType = ref("");
const parseError = ref();
const environments = ref<EnvironmentsList | null>(null); // Type for environments list
const data = ref(
  JSON.stringify({
    asset: {
      name: "Asset Name",
      description: "Asset Description",
      type: "undefined",
      schedule: "daily",
      owner: "Asset Owner",
      id: "ID",
    },
  })
);
const lineageData = ref();
const lineageError = ref();
window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init":
      panelType.value = message.panelType;
      break;
    case "environments-list-message":
      environments.value = updateValue(message, "success");
      //environments.value = updateValue(message, "error");
      console.log("---------------------------\n");
      console.log("Environments", environments.value);
      break;
    case "parse-message":
      console.log("Parse Message", message);
      data.value = updateValue(message, "success");
      parseError.value = updateValue(message, "error");
      break;
    case "flow-lineage-message":
      console.log("Flow Lineage Data Message", message);
      lineageData.value = updateValue(message, "success");
      lineageError.value = updateValue(message, "error");
      console.log("Lineage Data from webview", lineageData.value);
      break;
  }
});

const activeTab = ref(0);

const environmentsList = computed(() => {
  if (!environments.value) return [];
  return parseEnvironmentList(environments.value)?.environments || [];
});

const selectedEnvironment = computed(() => {
  if (!environments.value) return [];
  return parseEnvironmentList(environments.value)?.selectedEnvironment || "something went wrong";
});

const assetDetailsProps = computed(() => {
  if (!data.value) return null;
  return parseAssetDetails(data.value);
});

const pipeline = computed(() => {
  if (!lineageData.value || !lineageData.value.pipeline) return null;
  try {
    return JSON.parse(lineageData.value.pipeline);
  } catch (error) {
    console.error("Error parsing pipeline data:", error);
    return null;
  }
});

const assetName = computed(() => {
  return lineageData.value?.name ?? null;
});

const assetId = computed(() => {
  return lineageData.value?.id ?? null;
});


const tabs = ref([
  /* { label: "General", component: AssetGeneral, props: { name: assetName }, includeIn: ["bruin"] }, */
  {
    label: "Asset Details",
    component: AssetDetails,
    includeIn: ["bruin"],
    props: computed(() => ({
      ...assetDetailsProps.value,
      environments: environmentsList.value,
      selectedEnvironment: selectedEnvironment.value,
    })),
  },
  { label: "Asset Lineage", component: AssetLineageText, includeIn: ["bruin"] },
  {
    label: "Lineage",
    component: AssetLineageFlow,
    includeIn: ["Lineage"],
    props: {
      assetDataset: computed(() => getAssetDataset(
        pipeline.value,
        assetId.value,
      )),
      pipelineData: computed(() => pipeline.value),
      name: assetName.value,
    },
  },
  //{ label: "Pipeline Graph Lineage", component: PipelineLineage, includeIn: ["lineage"] },
]);

const filteredTabs = computed(() =>
  tabs.value.filter((tab) => tab.includeIn.includes(panelType.value))
);

onMounted(() => {
  loadLineageData();
  loadAssetData();
  loadLineageDataForLineagePanel();
  loadEnvironmentsList();
});

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}

function loadLineageDataForLineagePanel() {
  vscode.postMessage({ command: "bruin.assetGraphLineage" });
}

function loadAssetData() {
  vscode.postMessage({ command: "bruin.getAssetDetails" });
}

function loadEnvironmentsList() {
  vscode.postMessage({ command: "bruin.getEnvironmentsList" });
}
function refreshGraphLineage() {
  vscode.postMessage({ command: "bruin.refreshGraphLineage" });
}

function updateAssetName(newName) {
  tabs.value.map((tab) => {
    if (!tab) return;
    tab.props && (tab.props.name = newName);
  });
}
</script>
