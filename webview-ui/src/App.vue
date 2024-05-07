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

const activeTab = ref(0);
const tabs = ref([
  { label: "General", component: AssetGeneral, props: { assetName: "Asset Name" } },
  {
    label: "Asset Details",
    component: AssetDetails,
    props: {
      assetName: "Asset Name",
      description: "This is the asset description",
      type: "BigQuery",
      schedule: "daily",
      owner: "Unknown",
      id: "123",
    },
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
    tab.props && (tab.props.assetName = newName);
  });
}
</script>
