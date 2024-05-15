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
      <component :is="tab && tab.component" v-bind="tab && tab.props" @update:assetName="updateAssetName" />
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetGeneral from "@/components/AssetGeneral.vue";
import AssetDetails from "@/components/AssetDetails.vue";
import AssetLineageText from "@/components/lineage-text/AssetLineageText.vue";
import AssetLineageFlow from "@/components/lineage-flow/asset-lineage/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed } from "vue";
import { parseAssetDetails } from "./utilities/helper";


const panelType = ref("");

window.addEventListener("message", event => {
  const message = event.data;
  switch(message.command) {
    case "init":
      panelType.value = message.panelType;
      console.log("---------------------------\n");
      console.log("Panel Type", message.panelType);
      break;
  }
});


const activeTab = ref(0);

const data = JSON.stringify({
  name: "Asset Name",
  description: "Asset Description",
  type: "BigQuery",
  schedule: "daily",
  owner: "Asset Owner",
  id: "ID",
});
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

const tabs = ref([
  { label: "General", component: AssetGeneral, props: { name: parseAssetDetails(data)?.name }, includeIn: ["bruin"] },
  /* {
    label: "Asset Details",
    component: AssetDetails,
    props: parseAssetDetails(data),
    includeIn: ["bruin"]
  }, */
  { label: "Asset Lineage", component: AssetLineageText, includeIn: ["bruin"] },
/*   { label: "Asset Graph Lineage", component: AssetLineageFlow, includeIn: ["lineage"] },
 */  //{ label: "Pipeline Graph Lineage", component: PipelineLineage, includeIn: ["lineage"] },

]);

const filteredTabs = computed(() => tabs.value.filter(tab => tab.includeIn.includes(panelType.value)));


onMounted(() => {
  loadLineageData();
  loadLineageDataForLineagePanel()
});

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}

function loadLineageDataForLineagePanel() {
  vscode.postMessage({ command: "bruin.assetLineage" });
}

function updateAssetName(newName) {
  tabs.value.map((tab) => {
    if(!tab) return;
    tab.props && (tab.props.name = newName);
  });
}
</script>

