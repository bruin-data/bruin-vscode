<template>
  <div v-if="isBruinInstalled">
    <div class="flex flex-col pt-1">
      <div class="">
        <div class="flex items-center space-x-2 w-full justify-between">
          <div class="flex items-baseline w-3/4 min-w-0 font-md text-editor-fg text-lg font-mono">
            <!-- Asset name -->
            <div class="flex-grow min-w-0 overflow-hidden">
              <div class="flex items-center w-full">
                <div
                  id="asset-name-container"
                  class="w-full font-mono text-lg text-editor-fg"
                  :class="{ 'cursor-pointer': !isEditingName }"
                  @mouseenter="startNameEditing"
                  @mouseleave="handleMouseLeave"
                  @click="focusName"
                >
                  <template v-if="isEditingName">
                    <input
                      id="asset-name-input"
                      v-model="editingName"
                      @blur="saveNameEdit"
                      @keyup.enter="saveNameEdit"
                      ref="nameInput"
                      class="w-full text-lg bg-input-background border-0 p-0 text-editor-fg font-mono truncate"
                    />
                  </template>
                  <template v-else>
                    <span id="input-name" class="block truncate">
                      {{ assetDetailsProps?.name }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="flex w-1/4 items-center space-x-2 justify-end flex-shrink-0">
            <vscode-button
              appearance="secondary"
              v-if="versionStatus.status === 'outdated'"
              @click="updateBruinCli"
              class="flex-shrink-0"
            >
              <div class="flex items-center space-x-1 whitespace-nowrap">
                <span class="codicon codicon-circle-filled text-editorLink-activeFg"></span>
                Update CLI
              </div>
            </vscode-button>

            <!-- Tags div that will be hidden on small screens -->
            <div class="flex items-center tags">
              <DescriptionItem
                :value="assetDetailsProps?.type ?? 'undefined'"
                :className="assetDetailsProps?.type ? badgeClass.badgeStyle : badgeClass.grayBadge"
              />
              <DescriptionItem
                :value="assetDetailsProps?.pipeline?.schedule ?? 'undefined'"
                :className="badgeClass.grayBadge"
                class="xs:flex hidden overflow-hidden truncate"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- Rest of the existing template remains the same -->
      <vscode-panels :activeid="`tab-${activeTab}`" aria-label="Tabbed Content" class="pl-0">
        <vscode-panel-tab
          v-for="(tab, index) in visibleTabs"
          :key="`tab-${index}`"
          :id="`tab-${index}`"
          @click="activeTab = index"
        >
          <div class="flex items-center justify-center gap-1">
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.label === 'Settings' && versionStatus.status === 'outdated'"
              class="h-1 w-1 rounded-full bg-yellow-400 mt-0.5"
            ></span>
          </div>
        </vscode-panel-tab>

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
            class="flex w-full h-full"
            @update:assetName="updateAssetName"
            @update:columns="updateColumns"
            @update:customChecks="updateCustomChecks"
            @open-glossary="navigateToGlossary"
            @update:description="updateDescription"
          />
          <div class="flex w-full" v-else-if="parseError">
            <MessageAlert
              message="This file is either not a Bruin Asset or has no data to display."
            />
          </div>
        </vscode-panel-view>
      </vscode-panels>
    </div>
  </div>
  <div class="flex items-center space-x-2 w-full justify-between pt-2" v-else>
    <BruinSettings
      :isBruinInstalled="isBruinInstalled"
      :environments="environmentsList"
      class="flex w-full"
    />
  </div>
</template>
<script setup lang="ts">
import AssetDetails from "@/components/asset/AssetDetails.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { parseAssetDetails, parseEnvironmentList } from "./utilities/helper";
import { updateValue } from "./utilities/helper";
import MessageAlert from "@/components/ui/alerts/AlertMessage.vue";
import { useConnectionsStore } from "./store/bruinStore";
import type { EnvironmentsList } from "./types";
import AssetColumns from "@/components/asset/columns/AssetColumns.vue";
import CustomChecks from "@/components/asset/columns/custom-checks/CustomChecks.vue";
import BruinSettings from "@/components/bruin-settings/BruinSettings.vue";
import DescriptionItem from "./components/ui/description-item/DescriptionItem.vue";
import { badgeStyles, defaultBadgeStyle } from "./components/ui/badges/CustomBadgesStyle";
import RudderStackService from "./services/RudderStackService";

const rudderStack = RudderStackService.getInstance();
const connectionsStore = useConnectionsStore();
const parseError = ref(); // Holds any parsing errors
const environments = ref<EnvironmentsList | null>(null); // Holds the list of environments
const versionStatus = ref({
  status: "current",
  current: "",
  latest: "",
});
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
const hoverTimeout = ref<ReturnType<typeof setTimeout> | null>(null); // Timeout for hover events
// New reactive variables for editing
// Event listener for messages from the VSCode extension
window.addEventListener("message", (event) => {
  const message = event.data;
  try {
    switch (message.command) {
      case "init":
        lastRenderedDocument.value = message.lastRenderedDocument; // Update last rendered document
        break;
      case "environments-list-message":
        environments.value = updateValue(message, "success");
        connectionsStore.setDefaultEnvironment(selectedEnvironment.value); // Set the default environment in the store
        break;
      case "parse-message":
        parseError.value = updateValue(message, "error");
        if (!parseError.value) {
          data.value = updateValue(message, "success"); // Update asset data on success
          // console.log("Updated asset data:", data.value);
        }
        lastRenderedDocument.value = updateValue(message, "success");

        // Track asset parsing status
        rudderStack.trackEvent("Asset Parsing Status", {
          parseError: parseError.value ? `Error ${parseError.value}` : "No Error Found",
        });

        break;
      case "bruinCliInstallationStatus":
        isBruinInstalled.value = message.installed; // Update installation status
        console.log("Bruin installation status updated:", isBruinInstalled.value);
        break;

      case "bruinCliVersionStatus":
        versionStatus.value = message.versionStatus;
        console.log("Bruin update status updated in App.vue:", versionStatus.value);
        break;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    rudderStack.trackEvent("Error Handling Message", {
      errorMessage: (error as Error).message,
      message: message,
    });
  }
});

const activeTab = ref(0); // Tracks the currently active tab
const navigateToGlossary = () => {
  console.log("Opening glossary.");
  vscode.postMessage({ command: "bruin.openGlossary" });
};
// Computed property to check if the last rendered document is a Bruin YAML file
const isBruinYml = computed(() => {
  const result = lastRenderedDocument.value && lastRenderedDocument.value.endsWith(".bruin.yml");
  return result;
});

// Computed property to parse the list of environments
const environmentsList = computed(() => {
  if (!environments.value) return [];
  const parsedEnvironments = parseEnvironmentList(environments.value)?.environments || [];
  return parsedEnvironments;
});

const updateBruinCli = () => {
  vscode.postMessage({ command: "bruin.updateBruinCli" });
  setTimeout(() => {
    vscode.postMessage({ command: "bruin.checkBruinCLIVersion" });
    console.log("Checking Bruin CLI version after update");
  }, 15000);
};
// Computed property to get the selected environment
const selectedEnvironment = computed(() => {
  if (!environments.value) return [];
  const selected = parseEnvironmentList(environments.value)?.selectedEnvironment || "";
  console.log("Selected environment:", selected);
  return selected;
});

// Computed property for asset details
const assetDetailsProps = computed({
  get: () => {
    if (!data.value) return null;
    const parsedDetails = parseAssetDetails(data.value);
    console.log("Parsed asset details:", parsedDetails);
    return parsedDetails;
  },
  set: (newValue) => {
    if (newValue) {
      data.value = JSON.stringify({ asset: newValue }); // Update asset data
      // console.log("Updated asset data after setting:", data.value);
    }
  },
});

const isEditingName = ref(false);
const editingName = ref(assetDetailsProps.value?.name || "");
const nameInput = ref<HTMLInputElement | null>(null);

const startNameEditing = () => {
  if (hoverTimeout.value) clearTimeout(hoverTimeout.value);
  isEditingName.value = true;
  editingName.value = assetDetailsProps.value?.name || "";
};

const stopNameEditing = () => {
  console.log("Stopping name editing.");
  if (!editingName.value.trim()) {
    editingName.value = assetDetailsProps.value?.name || "";
  }
  isEditingName.value = false;
};

const saveNameEdit = () => {
  rudderStack.trackEvent("Asset Name Updated", {
    assetName: editingName.value.trim(),
  });
  if (editingName.value.trim() !== assetDetailsProps.value?.name) {
    updateAssetName(editingName.value.trim());
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: {
        name: editingName.value.trim(),
      },
    });
  }
  stopNameEditing();
};

const handleMouseLeave = () => {
  // Delay closing to avoid flickering if mouse quickly leaves
  hoverTimeout.value = setTimeout(() => {
    stopNameEditing();
  }, 100);
};

const focusName = () => {
  nextTick(() => {
    nameInput.value?.focus();
  });
};

// Computed property for asset columns
const columnsProps = computed(() => {
  if (!data.value) return [];
  const details = parseAssetDetails(data.value);
  const columns = details?.columns || [];
  console.log("Asset columns:", columns);
  return columns;
});

const columns = ref([...columnsProps.value]); // Reactive reference for columns
console.debug("Initial Columns:", columns.value);
// Computed property for asset columns
const customChecksProps = computed(() => {
  if (!data.value) {
    console.log("No data found for custom checks");
    return [];
  }
  const details = parseAssetDetails(data.value);
  const customChecks = details?.custom_checks || [];
  console.log("Asset Custom checks:", customChecks);
  return customChecks;
});

const customChecks = ref([...customChecksProps.value]); // Reactive reference for custom checks

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
    label: "Custom Checks",
    component: CustomChecks,
    props: computed(() => ({
      customChecks: customChecksProps.value,
    })),
  },
  {
    label: "Settings",
    component: BruinSettings,
    props: {
      isBruinInstalled: computed(() => isBruinInstalled.value),
      environments: computed(() => environmentsList.value),
      versionStatus: computed(() => versionStatus.value),
    },
  },
]);

// Computed property to determine which tabs to show based on the document type
const visibleTabs = computed(() => {
  if (isBruinYml.value) {
    // Only show the "Settings" tab
    console.log("Showing only Settings tab for Bruin YAML file.");
    return tabs.value.filter((tab) => tab.label === "Settings");
  }
  // Show all tabs
  console.log("Showing all tabs.");
  return tabs.value;
});

// Lifecycle hook to load data when the component is mounted
onMounted(() => {
  console.log("Component mounted. Loading asset data and environments.");
  loadAssetData();
  loadEnvironmentsList();
  checkBruinCliInstallation();
  vscode.postMessage({ command: "getLastRenderedDocument" });
  vscode.postMessage({ command: "bruin.checkTelemtryPreference" });
  vscode.postMessage({ command: "bruin.checkBruinCLIVersion" });
  // Track page view
  try {
    rudderStack.trackPageView("Asset Details Page", {
      path: window.location.pathname,
      url: window.location.href,
    });
  } catch (error) {
    console.error("RudderStack page tracking error:", error);
  }

  // Track a custom event
  rudderStack.trackEvent("Asset Viewed", {
    assetType: assetDetailsProps.value?.type,
  });

  rudderStack.trackEvent("Loading environments list onMounted", {
    environments: environmentsList.value,
  });

  // Track custom checks interactions
  rudderStack.trackEvent("Custom Checks Interaction", {
    assetName: assetDetailsProps.value?.name,
    customChecksCount: customChecksProps.value.length,
  });

  console.log("Custom event tracked.");
});

// send the message to check the bruin version every 30 minutes
setInterval(() => {
  vscode.postMessage({ command: "bruin.checkBruinCLIVersion" });
}, 1800000);

// Lifecycle hook to clean up hover timeout
onBeforeUnmount(() => {
  if (hoverTimeout.value) clearTimeout(hoverTimeout.value);
});
// Function to check if Bruin CLI is installed
function checkBruinCliInstallation() {
  console.log("Checking Bruin CLI installation status.");
  vscode.postMessage({ command: "checkBruinCliInstallation" });
}

// Watcher to update columns when columnsProps change
watch(
  columnsProps,
  (newColumns) => {
    console.log("Columns props changed. Updating columns:", newColumns);
    columns.value = newColumns;
    // Track column modifications
    rudderStack.trackEvent("Columns Modified", {
      columnCount: columns.value.length,
    });
  },
  { deep: true }
);

watch(activeTab, (newTab, oldTab) => {
  rudderStack.trackEvent("Tab Switched", {
    fromTab: tabs.value[oldTab]?.label,
    toTab: tabs.value[newTab]?.label,
    assetName: assetDetailsProps.value?.name,
  });
});
// Function to update columns
const updateColumns = (newColumns) => {
  console.log("Updating columns with new data:", newColumns);
  columns.value = newColumns;
};

const updateCustomChecks = (newCustomChecks) => {
  console.log("Updating custom checks with new data:", newCustomChecks);
  customChecks.value = newCustomChecks;
};

const updateDescription = (newDescription) => {
  console.log("Updating description with new data:", newDescription);
  if (assetDetailsProps.value) {
    assetDetailsProps.value.description = newDescription;
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: {
        description: newDescription,
      },
    });
  }
};

// Function to load asset data
function loadAssetData() {
  console.log("Loading asset data from Bruin.");
  vscode.postMessage({ command: "bruin.getAssetDetails" });
}

// Function to load the list of environments
function loadEnvironmentsList() {
  console.log("Loading environments list from Bruin.");
  vscode.postMessage({ command: "bruin.getEnvironmentsList" });
}

// Function to update the asset name
const updateAssetName = (newName) => {
  console.log("Updating asset name to:", newName);
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

@media (max-width: 480px) {
  .pipeline-name,
  .slash,
  .tags {
    display: none;
  }

  .flex-grow {
    @apply w-full;
  }

  .flex-grow span,
  .flex-grow input {
    @apply block w-full truncate;
  }

  vscode-button {
    @apply flex-shrink-0 block;
  }
}

@media (max-width: 320px) {
  .flex-grow span,
  .flex-grow input {
    @apply text-sm;
  }

  vscode-button::part(control) {
    font-size: 9px;
    padding: 3px;
  }
}
</style>
<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
  font-size: 10px;
  padding: 4px;
}
vscode-button .codicon {
  font-size: 12px;
  padding-right: 2px;
}
</style>
