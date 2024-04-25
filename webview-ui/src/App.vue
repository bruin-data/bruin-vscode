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
      <component
        :is="tab.component"
        :assetName="tab.props?.assetName"
      />
    </vscode-panel-view>
  </vscode-panels>
</template>

<script setup lang="ts">
import AssetDetails from "@/components/AssetDetails.vue";
import AssetLineage from "@/components/AssetLineage.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted } from "vue";

const activeTab = ref(0);
const tabs = ref([
  { label: "General", component: AssetDetails, props: { assetName: "Asset Details"} },
  { label: "Asset Lineage", component: AssetLineage },
]);

onMounted(() => {
  loadLineageData();
});

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}
</script>
