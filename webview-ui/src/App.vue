<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab v-for="(tab, index) in tabs"
                      :key="`tab-${index}`"
                      :id="`tab-${index}`"
                      @click="activeTab = index"
                      >{{ tab.label }}
    </vscode-panel-tab>

    <!-- Tab Content -->
    <vscode-panel-view v-for="(tab, index) in tabs"
                       :key="`view-${index}`"
                       :id="`view-${index}`"
                       v-show="activeTab === index">
      <component :is="tab.component" />
    </vscode-panel-view>
  </vscode-panels>
</template>


<script>
import AssetDetails from '@/components/AssetDetails.vue';
import AssetLineage from '@/components/AssetLineage.vue';

export default {
  data() {
    return {
      activeTab: 0,
      tabs: [
        { label: 'Asset Details', component: AssetDetails },
        { label: 'Other Content', component: AssetLineage }
      ]
    };
  }
}
</script>


