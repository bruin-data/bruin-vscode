<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab
      v-for="(tab, index) in filteredTabs"
      :key="`tab-${index}`"
      :id="`tab-${index}`"
      @click="activeTab = index"
      >{{ tab && tab.label }}
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
        @update:assetName="updateAssetName"
      />
      <div class="flex w-full" v-else-if="parseError">
        <MessageAlert message="This file is not a Bruin Asset or has No data to dipslay" />
      </div>
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetGeneral from "@/components/AssetGeneral.vue";
import AssetDetails from "@/components/AssetDetails.vue";
import AssetLineageText from "@/components/lineage-text/AssetLineageText.vue";
import AssetLineageFlow from "@/components/lineage-flow/asset-lineage/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed, watch } from "vue";
import { parseAssetDetails } from "./utilities/helper";
import { useParseAsset } from "./composables/useParseAsset";
import { updateValue } from "./utilities/helper";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";

const panelType = ref("");
const parseError = ref();
const data = ref(
  JSON.stringify({
    asset: {
      name: "Asset Name",
      description: "Asset Description",
      type: "BigQuery",
      schedule: "daily",
      owner: "Asset Owner",
      id: "ID",
    },
  })
);

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init":
      panelType.value = message.panelType;
      console.log("---------------------------\n");
      console.log("Panel Type", message.panelType);
      break;
    case "parse-message":
      data.value = updateValue(message, "success");
      parseError.value = updateValue(message, "error");
      break;
  }
});

console.log("Data", data.value);

const activeTab = ref(0);

/* const tabs = ref([
  { label: "General", component: AssetGeneral, props: { name: parseAssetDetails(data)?.name } },
  {
    label: "Asset Details",
    component: AssetDetails,
    props: parseAssetDetails(data),
  },
  { label: "Asset Lineage", component: AssetLineage },
  { label: "Asset Graph Lineage", component: PipelineLineage},
]); */
const assetDetailsProps = computed(() => {
  if (!data.value) return null;
  return parseAssetDetails(data.value);
});

const assetName = computed(() => {
  if (!data.value) return null;
  return parseAssetDetails(data.value)?.name;
});
const tabs = ref([
  { label: "General", component: AssetGeneral, props: { name: assetName }, includeIn: ["bruin"] },
  {
    label: "Asset Details",
    component: AssetDetails,
    includeIn: ["bruin"],
    props: assetDetailsProps || null,
  },
  { label: "Asset Lineage", component: AssetLineageText, includeIn: ["bruin"] },
  /*   { label: "Asset Graph Lineage", component: AssetLineageFlow, includeIn: ["lineage"] },
   */ //{ label: "Pipeline Graph Lineage", component: PipelineLineage, includeIn: ["lineage"] },
]);

const filteredTabs = computed(() =>
  tabs.value.filter((tab) => tab.includeIn.includes(panelType.value))
);

onMounted(() => {
  loadLineageData();
  loadAssetData();
  loadLineageDataForLineagePanel();
});

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}

function loadLineageDataForLineagePanel() {
  vscode.postMessage({ command: "bruin.assetLineage" });
}

function loadAssetData() {
  vscode.postMessage({ command: "bruin.getAssetDetails" });
}

function updateAssetName(newName) {
  tabs.value.map((tab) => {
    if (!tab) return;
    tab.props && (tab.props.name = newName);
  });
}
</script>
