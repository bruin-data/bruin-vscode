<template>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content">
    <!-- Tab Headers -->
    <vscode-panel-tab
      v-for="(tab, index) in visibleTabs"
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
        @update:assetName="updateAssetName"
        @update:columns="updateColumns"
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
import AssetColumns from "@/components/asset/columns/AssetColumns.vue";
import BruinSettings from "@/components/bruin-settings/BruinSettings.vue";
import { useConnectionsStore } from "./store/bruinStore";

const connectionsStore = useConnectionsStore();
const panelType = ref("");
const parseError = ref();
const environments = ref<EnvironmentsList | null>(null);
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
const isBruinInstalled = ref(true);
const lineageData = ref();
const lastRenderedDocument = ref("");
const lineageError = ref();

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init":
      panelType.value = message.panelType;
      lastRenderedDocument.value = message.lastRenderedDocument;
      console.log("Last Rendered:", lastRenderedDocument.value);
      break;
    case "lastRenderedDocument":
      lastRenderedDocument.value = updateValue(message, "success");
      console.log("Last Rendered 2:", lastRenderedDocument.value);
      break;
    case "environments-list-message":
      environments.value = updateValue(message, "success");
      lastRenderedDocument.value = updateValue(message, "success");
      connectionsStore.setDefaultEnvironment(selectedEnvironment.value); // Set the default environment in the store
      break;
    case "parse-message":
      data.value = updateValue(message, "success");
      parseError.value = updateValue(message, "error");
      lastRenderedDocument.value = updateValue(message, "success");
      break;
    case "bruinCliInstallationStatus":
      isBruinInstalled.value = message.installed;
      break;
    case "flow-lineage-message":
      lineageData.value = updateValue(message, "success");
      lineageError.value = updateValue(message, "error");
      break;
  }
});

const activeTab = ref(0);
const isBruinYml = computed(() => {
  return lastRenderedDocument.value && lastRenderedDocument.value.endsWith(".bruin.yml");
});

const environmentsList = computed(() => {
  if (!environments.value) return [];
  return parseEnvironmentList(environments.value)?.environments || [];
});

const selectedEnvironment = computed(() => {
  if (!environments.value) return [];
  return parseEnvironmentList(environments.value)?.selectedEnvironment || "something went wrong";
});

const assetDetailsProps = computed({
  get: () => {
    if (!data.value) return null;
    return parseAssetDetails(data.value);
  },
  set: (newValue) => {
    if (newValue) {
      data.value = JSON.stringify({ asset: newValue });
    }
  },
});

const columnsProps = computed(() => {
  if (!data.value) return [];
  const details = parseAssetDetails(data.value);
  return details?.columns || [];
});

const columns = ref([...columnsProps.value]);

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
const assetName = computed(() => lineageData.value?.name ?? null);
const assetId = computed(() => lineageData.value?.id ?? null);
const assetDataset = computed(() => getAssetDataset(pipeline.value, assetId.value));

const tabs = ref([
  {
    label: "Asset Details",
    component: AssetDetails,
    includeIn: ["bruin"],
    props: computed(() => ({
      ...assetDetailsProps.value,
      environments: environmentsList.value,
      selectedEnvironment: selectedEnvironment.value,
    })),
    emits: ["update:name", "update:description"],
  },
  {
    label: "Columns",
    component: AssetColumns,
    includeIn: ["bruin"],
    props: computed(() => ({
      columns: columns.value,
    })),
  },
  { label: "Asset Lineage", component: AssetLineageText, includeIn: ["bruin"] },
  {
    label: "Settings",
    component: BruinSettings,
    includeIn: ["bruin"],
    props: {
      isBruinInstalled: computed(() => isBruinInstalled.value),
      environments: computed(() => environmentsList.value),
    },
  },
  {
    label: "Lineage",
    component: AssetLineageFlow,
    includeIn: ["Lineage"],
    props: {
      assetDataset: computed(() => getAssetDataset(pipeline.value, assetId.value)),
      pipelineData: computed(() => pipeline.value),
      name: assetName.value,
      LineageError: lineageErr.value,
    },
  },
]);

const visibleTabs = computed(() => {
  if (isBruinYml.value) {
    // Only show the "Settings" tab
    return tabs.value.filter((tab) => tab.label === "Settings");
  }
  // Show tabs based on panel type
  return tabs.value.filter((tab) => tab.includeIn.includes(panelType.value));
});

onMounted(() => {
  loadLineageData();
  loadAssetData();
  loadEnvironmentsList();
  checkBruinCliInstallation();
  vscode.postMessage({ command: "getLastRenderedDocument" });
});

function checkBruinCliInstallation() {
  vscode.postMessage({ command: "checkBruinCliInstallation" });
}

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

watch(
  () => [assetDataset, pipeline],
  ([newAssetDataset, newPipeline]) => {
    console.log("Asset dataset or pipeline changed:", {
      assetDataset: newAssetDataset,
      pipeline: newPipeline,
    });
  },
  { deep: true }
);

watch(
  columnsProps,
  (newColumns) => {
    columns.value = newColumns;
  },
  { deep: true }
);

const updateColumns = (newColumns) => {
  columns.value = newColumns;
};

// Updated refreshGraphLineage function
const refreshGraphLineage = debounce((event: Event) => {
  event.stopPropagation(); // Prevent event bubbling
  vscode.postMessage({ command: "bruin.assetGraphLineage" });
}, 300); // 300ms debounce time

function loadLineageData() {
  vscode.postMessage({ command: "bruin.getAssetLineage" });
}

function loadAssetData() {
  vscode.postMessage({ command: "bruin.getAssetDetails" });
}

function loadEnvironmentsList() {
  vscode.postMessage({ command: "bruin.getEnvironmentsList" });
}

function updateAssetName(newName) {
  if (assetDetailsProps.value) {
    assetDetailsProps.value.name = newName;
  }
  tabs.value.forEach((tab) => {
    if (tab && tab.props && "name" in tab.props) {
      tab.props.name = newName;
    }
  });
  vscode.postMessage({ command: "bruin.updateAssetName", name: newName });
}
</script>
./store/bruinStore