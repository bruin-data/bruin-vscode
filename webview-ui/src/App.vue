<template>
  <div class="flex items-center space-x-2 w-full justify-between pt-2">
    <!-- Name editing -->
    <div class="font-md text-editor-fg text-lg font-mono cursor-pointer truncate max-w-[70%]">
      {{ assetDetailsProps?.name }}
    </div>

    <div class="space-x-2">
      <DescriptionItem :value="assetDetailsProps?.type" :className="badgeClass.badgeStyle" />
      <DescriptionItem
        :value="assetDetailsProps?.pipeline.schedule"
        :className="badgeClass.grayBadge"
      />
    </div>
  </div>
  <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content" class="pl-0">
    <!-- Tab Headers -->
    <vscode-panel-tab
      v-for="(tab, index) in visibleTabs"
      :key="`tab-${index}`"
      :id="`tab-${index}`"
      @click="activeTab = index"
    >
      <div class="flex items-center justify-center">
        <span>{{ tab.label }}</span>
      </div>
    </vscode-panel-tab>

    <!-- Tab Content -->
    <vscode-panel-view
      v-for="(tab, index) in visibleTabs"
      :key="`view-${index}`"
      :id="`view-${index}`"
      v-show="activeTab === index"
      class="px-0"
    >
      <component
        v-if="tab.props"
        :is="tab.component"
        v-bind="tab.props"
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
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed, watch } from "vue";
import { parseAssetDetails, parseEnvironmentList } from "./utilities/helper";
import { updateValue } from "./utilities/helper";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { useConnectionsStore } from "./store/bruinStore";
import type { EnvironmentsList } from "./types";
import AssetColumns from "@/components/asset/columns/AssetColumns.vue";
import BruinSettings from "@/components/bruin-settings/BruinSettings.vue";
import DescriptionItem from "./components/ui/description-item/DescriptionItem.vue";
import { badgeStyles, defaultBadgeStyle } from "./components/ui/badges/CustomBadgesStyle";
/**
 * App Component
 *
 * This component serves as the main application interface for managing assets.
 * It handles communication with the VSCode extension, manages the state of
 * asset data, and renders different tabs for asset details, columns, and settings.
 */

const connectionsStore = useConnectionsStore();
const parseError = ref(); // Holds any parsing errors
const environments = ref<EnvironmentsList | null>(null); // Holds the list of environments
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
const isBruinInstalled = ref(true); // Tracks if Bruin is installed
const lastRenderedDocument = ref(""); // Holds the last rendered document

// Event listener for messages from the VSCode extension
window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case "init":
      lastRenderedDocument.value = message.lastRenderedDocument; // Update last rendered document
      console.log("Last Rendered:", lastRenderedDocument.value);
      break;
    case "environments-list-message":
      environments.value = updateValue(message, "success");
      connectionsStore.setDefaultEnvironment(selectedEnvironment.value); // Set the default environment in the store
      break;
    case "parse-message":
      parseError.value = updateValue(message, "error");
      if (!parseError.value) {
        data.value = updateValue(message, "success"); // Update asset data on success
      }
      lastRenderedDocument.value = updateValue(message, "success");
      break;
    case "bruinCliInstallationStatus":
      isBruinInstalled.value = message.installed; // Update installation status
      break;
  }
});

const activeTab = ref(0); // Tracks the currently active tab

// Computed property to check if the last rendered document is a Bruin YAML file
const isBruinYml = computed(() => {
  return lastRenderedDocument.value && lastRenderedDocument.value.endsWith(".bruin.yml");
});

// Computed property to parse the list of environments
const environmentsList = computed(() => {
  if (!environments.value) return [];
  return parseEnvironmentList(environments.value)?.environments || [];
});

// Computed property to get the selected environment
const selectedEnvironment = computed(() => {
  if (!environments.value) return [];
  return parseEnvironmentList(environments.value)?.selectedEnvironment || "something went wrong";
});

// Computed property for asset details
const assetDetailsProps = computed({
  get: () => {
    if (!data.value) return null;
    return parseAssetDetails(data.value);
  },
  set: (newValue) => {
    if (newValue) {
      data.value = JSON.stringify({ asset: newValue }); // Update asset data
    }
  },
});

// Computed property for asset columns
const columnsProps = computed(() => {
  if (!data.value) return [];
  const details = parseAssetDetails(data.value);
  return details?.columns || [];
});

const columns = ref([...columnsProps.value]); // Reactive reference for columns

// Define tabs for the application
const tabs = ref([
  {
    label: "Asset Details",
    component: AssetDetails,
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
    props: computed(() => ({
      columns: columns.value,
    })),
  },
  {
    label: "Settings",
    component: BruinSettings,
    props: {
      isBruinInstalled: computed(() => isBruinInstalled.value),
      environments: computed(() => environmentsList.value),
    },
  },
]);

// Computed property to determine which tabs to show based on the document type
const visibleTabs = computed(() => {
  if (isBruinYml.value) {
    // Only show the "Settings" tab
    return tabs.value.filter((tab) => tab.label === "Settings");
  }
  // Show all tabs
  return tabs.value;
});

// Lifecycle hook to load data when the component is mounted
onMounted(() => {
  loadAssetData();
  loadEnvironmentsList();
  checkBruinCliInstallation();
  vscode.postMessage({ command: "getLastRenderedDocument" });
});

// Function to check if Bruin CLI is installed
function checkBruinCliInstallation() {
  vscode.postMessage({ command: "checkBruinCliInstallation" });
}

// Debounce function to limit the rate at which a function can fire
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

// Watcher to update columns when columnsProps change
watch(
  columnsProps,
  (newColumns) => {
    columns.value = newColumns;
  },
  { deep: true }
);

// Function to update columns
const updateColumns = (newColumns) => {
  columns.value = newColumns;
};

// Function to load asset data
function loadAssetData() {
  vscode.postMessage({ command: "bruin.getAssetDetails" });
}

// Function to load the list of environments
function loadEnvironmentsList() {
  vscode.postMessage({ command: "bruin.getEnvironmentsList" });
}

// Function to update the asset name
const updateAssetName = (newName) => {
  if (assetDetailsProps.value) {
    assetDetailsProps.value.name = newName;
  }
  tabs.value.forEach((tab) => {
    if (tab && tab.props && "name" in tab.props) {
      tab.props.name = newName; // Update the name in the tab props
    }
  });
  vscode.postMessage({ command: "bruin.updateAssetName", name: newName });
};

const badgeClass = computed(() => {
  const commonStyle =
    "inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset";
  const styleForType = badgeStyles[assetDetailsProps.value?.type] || defaultBadgeStyle;
  return {
    commonStyle: commonStyle,
    grayBadge: `${commonStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonStyle} ${styleForType.main}`,
  };
});
</script>
<style>
vscode-panels::part(tablist) {
  padding-left: 0 !important;
}
</style>