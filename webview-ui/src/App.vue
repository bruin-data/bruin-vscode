<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab
      v-for="(tab, index) in tabs"
      :key="`tab-${index}`"
      :id="`tab-${index}`"
      @click="activeTab = index"
      >{{ tab.label }}
    </vscode-panel-tab>

    <!-- Tab Content -->
    <vscode-panel-view
      v-for="(tab, index) in tabs"
      :key="`view-${index}`"
      :id="`view-${index}`"
      v-show="activeTab === index"
    >
      <component :is="tab.component" v-bind="tab.props" @update:assetName="updateAssetName" />
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetGeneral from "@/components/AssetGeneral.vue";
import AssetDetails from "@/components/AssetDetails.vue";
import AssetLineage from "@/components/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted } from "vue";
import { parseAssetDetails } from "./utilities/helper";

const activeTab = ref(0);
const data = JSON.stringify({
name: "Asset Name",
description: "Asset Description",
type: "BigQuery",
schedule: "daily",
owner: "Asset Owner",
id: "ID",
});  
const tabs = ref([
  { label: "General", component: AssetGeneral, props: { name: parseAssetDetails(data)?.name } },
  {
    label: "Asset Details",
    component: AssetDetails,
    props: parseAssetDetails(data),
  },
  { label: "Asset Lineage", component: AssetLineage },
]);

onMounted(() => {
  loadLineageData();
});

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}

function updateAssetName(newName) {
  tabs.value.map((tab) => {
    tab.props && (tab.props.name = newName);
  });
}
</script>
