<template>
  <div v-if="isBruinInstalled === null" class="flex items-center justify-center h-full"></div>
  
  <div v-else-if="isBruinInstalled === false" class="flex items-center space-x-2 w-full justify-between pt-2">
    <BruinSettings
      :isBruinInstalled="isBruinInstalled"
      :environments="environmentsList"
      :settings-only-mode="settingsOnlyMode"
      class="flex w-full"
    />
  </div>
  
  <div v-else-if="isBruinInstalled === true" class="flex flex-col pt-1">
    <div v-if="isNotAsset && showConvertMessage" class="w-full">
      <NonAssetMessage
        :showConvertMessage="showConvertMessage"
        :fileType="nonAssetFileType"
        :filePath="nonAssetFilePath"
      />
    </div>

    <div v-else-if="!isNotAsset && !showConvertMessage && !settingsOnlyMode" class="">
      <div class="flex items-center space-x-2 w-full justify-between min-h-6">
        <div class="flex items-baseline w-3/4 min-w-0 font-md text-editor-fg text-lg font-mono">
          <div class="flex-grow min-w-0 overflow-hidden">
            <div class="flex items-center w-full">
              <div
                id="asset-name-container"
                class="w-full font-mono text-lg text-editor-fg"
                :class="{ 'cursor-pointer': !isEditingName, 'hover-background': !isEditingName }"
                @click="focusName"
              >
                <template v-if="isEditingName">
                  <input
                    id="asset-name-input"
                    v-model="editingName"
                    @blur="saveNameEdit"
                    @keyup.enter="saveNameEdit"
                    @mouseleave="handleInputMouseLeave"
                    ref="nameInput"
                    class="w-full text-lg bg-input-background border-0 p-0 text-editor-fg font-mono truncate"
                  />
                </template>
                <template v-else>
                  <span
                    v-if="assetDetailsProps?.name && assetDetailsProps?.name !== 'undefined'"
                    id="input-name"
                    class="block truncate"
                  >
                    {{ displayName }}
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

          <div class="flex items-center tags">
            <DescriptionItem
              v-if="assetType"
              :value="assetType"
              :className="assetDetailsProps?.type ? badgeClass.badgeStyle : badgeClass.grayBadge"
            />
            <DescriptionItem
              v-if="displaySchedule"
              :value="displaySchedule"
              :className="badgeClass.grayBadge"
              class="xs:flex hidden overflow-hidden truncate"
            />
          </div>
        </div>
      </div>
    </div>
    <vscode-panels
      v-if="!showConvertMessage"
      :activeid="`tab-${activeTab}`"
      aria-label="Tabbed Content"
      class="pl-0"
    >
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
            class="h-[3px] w-[3px] rounded-full bg-yellow-400 mt-0.5"
          ></span>
        </div>
      </vscode-panel-tab>

      <vscode-panel-view
        v-for="(tab, index) in visibleTabs"
        :key="`view-${index}`"
        :id="`view-${index}`"
        class="px-0"
      >
        <keep-alive>
          <component
            v-if="isTabActive(index)"
            :is="tab.component"
            v-bind="tab.props"
            class="flex w-full h-full"
            @update:description="updateDescription"
          />
        </keep-alive>
      </vscode-panel-view>
    </vscode-panels>
  </div>
</template>
<script setup lang="ts">
import AssetDetails from "@/components/asset/AssetDetails.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { parseAssetDetails, parseEnvironmentList } from "./utilities/helper";
import { updateValue } from "./utilities/helper";
import { useConnectionsStore } from "./store/bruinStore";
import type { Asset, EnvironmentsList } from "./types";
import AssetColumns from "@/components/asset/columns/AssetColumns.vue";
import CustomChecks from "@/components/asset/columns/custom-checks/CustomChecks.vue";
import BruinSettings from "@/components/bruin-settings/BruinSettings.vue";
import DescriptionItem from "./components/ui/description-item/DescriptionItem.vue";
import { badgeStyles, defaultBadgeStyle } from "./components/ui/badges/CustomBadgesStyle";
import RudderStackService from "./services/RudderStackService";
import NonAssetMessage from "./components/ui/alerts/NonAssetMessage.vue";
import Materialization from "./components/asset/materialization/Materialization.vue";

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
      name: "",
      description: "Asset Description",
      type: "undefined",
      schedule: "daily",
      owner: "Asset Owner",
      id: "ID",
    },
  })
);
const isBruinInstalled = ref<boolean | null>(null); // Start as unknown until CLI check completes
const lastRenderedDocument = ref(""); 
const pipelineAssetsData = ref([]);
const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  console.log("Message received:", message.command, message);
  
  try {
    switch (message.command) {
      case "init": {
        settingsOnlyMode.value = !!message.settingsOnlyMode;
        break;
      }
        case "bruinCliInstallationStatus": {
          // Always respect backend signal; show install UI when not installed
          isBruinInstalled.value = !!message.installed;
          break;
        }
      case "environments-list-message":
        environments.value = updateValue(message, "success");
        connectionsStore.setDefaultEnvironment(selectedEnvironment.value);
        break;
      case "clear-convert-message": {
        const currentFile = lastRenderedDocument.value;
        const messageFile = message.filePath;
        
        if (messageFile && currentFile && messageFile !== currentFile) {
          break;
        }
        
        isNotAsset.value = false;
        showConvertMessage.value = false;
        nonAssetFileType.value = "";
        nonAssetFilePath.value = "";
        rudderStack.trackEvent("Asset Converted and Clear Convert Message", {
          assetName: message.assetName,
        });
        break;
      }
      case "non-asset-file": {
        const currentFilePath = lastRenderedDocument.value;
        const messageFilePath = message.filePath;
        
        if (messageFilePath && currentFilePath && messageFilePath !== currentFilePath) {
          break;
        }
        
        isNotAsset.value = true;
        rudderStack.trackEvent("Non Asset File", {
          assetName: message.assetName,
        });
        
        if (message.showConvertMessage) {
          rudderStack.trackEvent("Non Asset File Show Convert Message", {
            assetName: message.assetName,
            filePath: message.filePath,
          });
          showConvertMessage.value = true;
          nonAssetFileType.value = message.fileType || "";
          nonAssetFilePath.value = message.filePath || "";
        } else {
          showConvertMessage.value = false;
          nonAssetFileType.value = "";
          nonAssetFilePath.value = "";
          rudderStack.trackEvent("Non Asset File Show Convert Message False", {
            assetName: message.assetName,
            filePath: message.filePath,
          });
        }
        break;
      }
      case "parse-message": {
        parseError.value = updateValue(message, "error");
        const parsed = updateValue(message, "success");
        // Ignore stale parse results that don't correspond to the currently tracked file
        try {
          const parsedFilePath = (parsed && (parsed.filePath || (parsed.asset?.executable_file?.path ?? null))) || null;
          const currentFilePath = lastRenderedDocument.value;
          if (parsedFilePath && currentFilePath && parsedFilePath !== currentFilePath) {
            break;
          }
        } catch (_) {
          // Safely ignore guard errors
        }
        if (!parseError.value && parsed) {
          parseError.value = null;
          isNotAsset.value = false;
          showConvertMessage.value = false;
          
          // If we receive asset parsing data successfully, assume CLI is installed
          isBruinInstalled.value = true;
          
          // Check if we have incomplete data and need to refocus
          const hasAssetData = parsed && parsed.asset;
          const hasColumns = parsed.asset?.columns && parsed.asset.columns.length > 0;
          const hasEnvironments = environmentsList.value && environmentsList.value.length > 0;
          
          if (hasAssetData && !hasColumns && !hasEnvironments) {
            console.log("⚠️ [App.vue] Incomplete data detected, requesting refocus");
            setTimeout(() => {
              vscode.postMessage({ command: "bruin.refocusActiveEditor" });
            }, 1000);
          }
          
          if (parsed && parsed.type === "pipelineConfig") {
            data.value = parsed;
            lastRenderedDocument.value = parsed.filePath;
            break;
          }
          
          if (parsed && parsed.type === "bruinConfig") {
            isBruinYml.value = true;
            activeTab.value = 3;
            lastRenderedDocument.value = parsed.filePath;
            break;
          }
          
          if (parsed && parsed.filePath) {
            lastRenderedDocument.value = parsed.filePath;
          } else if (parsed && parsed.asset && parsed.asset.executable_file && parsed.asset.executable_file.path) {
            lastRenderedDocument.value = parsed.asset.executable_file.path;
          }
          data.value = parsed;
        }

        rudderStack.trackEvent("Asset Parsing Status", {
          parseError: parseError.value ? `Error ${parseError.value}` : "No Error Found",
        });
        break;
      }
      case "pipeline-assets":
        pipelineAssetsData.value = updateValue(message, "success");
        break;
      case "bruinCliInstallationStatus":
        console.log("🔧 [App.vue] CLI status received:", message.installed);
        isBruinInstalled.value = message.installed;
        break;

      case "bruinCliVersionStatus":
        versionStatus.value = message.versionStatus;
        break;
      case "file-changed":
        lastRenderedDocument.value = message.filePath;
        break;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    rudderStack.trackEvent("Error Handling Message", {
      errorMessage: (error as Error).message,
      message: message,
    });
  }
};

const isBruinYml = ref(false);
const settingsOnlyMode = ref(false);
const isNotAsset = ref(false);
const showConvertMessage = ref(false);
const nonAssetFileType = ref("");
const nonAssetFilePath = ref("");
const activeTab = ref(0); // Tracks the currently active tab

// Computed property to parse the list of environments
const environmentsList = computed(() => {
  if (!environments.value) return [];
  const parsedEnvironments = parseEnvironmentList(environments.value)?.environments || [];
  return parsedEnvironments;
});

const updateBruinCli = () => {
  vscode.postMessage({ command: "bruin.updateBruinCli" });
};
// Computed property to get the selected environment
const selectedEnvironment = computed(() => {
  if (!environments.value) return [];
  const selected = parseEnvironmentList(environments.value)?.selectedEnvironment || "";
  console.log("Selected environment:", selected);
  return selected;
});

const parsedData = computed(() => {
  if (!data.value) return null;
  try {
    return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
  } catch {
    return null;
  }
});

const isPipelineConfig = computed(() => parsedData.value?.type === "pipelineConfig");
const isBruinConfig = computed(() => parsedData.value?.type === "bruinConfig");
const isConfigFile = computed(() => isBruinConfig.value || isPipelineConfig.value);
const displayName = computed(() => {
  if (isPipelineConfig.value) return parsedData.value?.name || "";
  if (isBruinConfig.value) return "Bruin Config";
  return assetDetailsProps.value?.name || "";
});

const displaySchedule = computed(() => {
  if (isPipelineConfig.value) return parsedData.value?.schedule || "";
  return assetDetailsProps.value?.pipeline?.schedule || "";
});

// Computed property for asset details
const assetDetailsProps = computed({
  get: () => {
    if (!data.value) return null;
    const parsedDetails = parseAssetDetails(data.value);
    return parsedDetails;
  },
  set: (newValue) => {
    if (newValue) {
      data.value = JSON.stringify({ asset: newValue }); // Update asset data
      // console.log("Updated asset data after setting:", data.value);
    }
  },
});

const intervalModifiers = computed(() => {
  console.warn("Interval modifiers from app:", assetDetailsProps.value?.interval_modifiers);
  return assetDetailsProps.value?.interval_modifiers || false;
});
const ingestrParameters = computed(() => {
  if (!data.value) return null;
  const parsedDetails = parseAssetDetails(data.value);
  return parsedDetails?.parameters;
});
const hasIntervalModifiers = computed(() => {
  const intervalModifiersValue = assetDetailsProps.value?.interval_modifiers ? true : false;
  return intervalModifiersValue;
});

const isEditingName = ref(false);
const editingName = ref(assetDetailsProps.value?.name || "");
const nameInput = ref<HTMLInputElement | null>(null);

const stopNameEditing = () => {
  console.log("Stopping name editing.");
  isEditingName.value = false;
};

const saveNameEdit = () => {
  rudderStack.trackEvent("Asset Name Updated", {
    assetName: editingName.value.trim(),
  });
  if (editingName.value.trim() && editingName.value.trim() !== assetDetailsProps.value?.name) {
    updateAssetName(editingName.value.trim());
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: {
        name: editingName.value.trim(),
      },
      source: "saveNameEdit",
    });
  } else if (!editingName.value.trim()) {
    editingName.value = assetDetailsProps.value?.name || "";
  }
  stopNameEditing();
};

const handleInputMouseLeave = () => {
  if (isEditingName.value) {
    saveNameEdit();
  }
};

const focusName = () => {
  isEditingName.value = true;
  editingName.value = assetDetailsProps.value?.name || "";
  nextTick(() => {
    nameInput.value?.focus();
  });
};
const materializationProps = computed(() => {
  if (!data.value) return;
  const details = parseAssetDetails(data.value);
  return details?.materialization;
});

const columnsProps = computed(() => {
  if (!data.value) return [];
  const details = parseAssetDetails(data.value);
  const columns = details?.columns || [];
  console.log("Asset columns:", columns);
  return columns;
});

const columns = ref([...columnsProps.value]);
console.debug("Initial Columns:", columns.value);

const dependencies = ref([...assetDetailsProps.value?.upstreams || []]);
console.debug("Initial Dependencies:", dependencies.value);

// Computed property to transform upstreams to dependencies format for Materialization component
const transformedDependencies = computed(() => {
  const upstreams = assetDetailsProps.value?.upstreams || [];
  const transformed = upstreams.map(upstream => ({
    name: upstream.value,
    isExternal: upstream.type === 'external' || upstream.type !== 'asset',
    type: upstream.type,
    mode: upstream.mode || 'full',
  }));
  
  console.log('Transformed dependencies:', transformed);
  return transformed;
});

// Computed property to extract pipeline assets from asset details
const pipelineAssets = computed(() => {
  const assets = pipelineAssetsData.value || [];
  console.log("Pipeline assets raw data:", assets);
  // Return the full asset objects, not just the name
  return assets;
});

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

// Define tabs for the application
const tabs = ref([
  {
    label: "General",
    component: AssetDetails,
    props: computed(() => ({
      ...assetDetailsProps.value,
      environments: environmentsList.value,
      selectedEnvironment: selectedEnvironment.value,
      hasIntervalModifiers: hasIntervalModifiers.value,
      parameters: ingestrParameters.value,
      columns: columns.value,
    })),
    emits: ["update:assetName", "update:description"],
  },
  {
    label: "Columns",
    component: AssetColumns,
    props: computed(() => ({
      columns: columns.value,
      isConfigFile: isConfigFile.value,
    })),
  },
  {
    label: "Details",
    component: Materialization,
    props: computed(() => ({
      materialization: materializationProps.value,
      columns: columns.value,
      owner: assetDetailsProps.value?.owner,
      tags: assetDetailsProps.value?.tags,
      intervalModifiers: intervalModifiers.value,
      dependencies: transformedDependencies.value,
      pipelineAssets: pipelineAssets.value,
      currentFilePath: lastRenderedDocument.value,
      secrets: assetDetailsProps.value?.secrets,
    })),
  },
  {
    label: "Custom Checks",
    component: CustomChecks,
    props: computed(() => ({
      customChecks: customChecksProps.value,
      isConfigFile: isConfigFile.value,
    })),
  },
  {
    label: "Settings",
    component: BruinSettings,
    props: {
      isBruinInstalled: computed(() => isBruinInstalled.value),
      environments: computed(() => environmentsList.value),
      versionStatus: computed(() => versionStatus.value),
      settingsOnlyMode: computed(() => settingsOnlyMode.value),
    },
  },
]);

// Computed property to determine which tabs to show based on the document type
const visibleTabs = computed(() => {
  console.log("🔄 [App.vue] visibleTabs check:", {
    isBruinInstalled: isBruinInstalled.value,
    isBruinYml: isBruinYml.value,
    totalTabs: tabs.value.length
  });
  
  // If CLI check in progress or CLI not installed, show no tabs
  if (isBruinInstalled.value === null || isBruinInstalled.value === false) {
    console.log("❌ [App.vue] No tabs shown - CLI status:", isBruinInstalled.value);
    return [];
  }
  
  // If panel is in settings-only mode (e.g. welcome/installation context), only show Settings tab
  if (settingsOnlyMode.value) {
    return tabs.value.filter((tab) => tab.label === "Settings");
  }

  if (isBruinYml.value) {
    // Only show the "Settings" tab for .bruin.yml files
    console.log("⚙️ [App.vue] Settings only - bruin.yml file");
    return tabs.value.filter((tab) => tab.label === "Settings");
  }
  // Show all tabs
  console.log("✅ [App.vue] Showing all tabs");
  return tabs.value;
});

onMounted(async () => {
  // Bootstrap CLI status; if unknown (null), keep neutral blank state to avoid flicker
  try {
    const initialStatus = (window as any).initialBruinCliStatus;
    if (typeof initialStatus === "boolean") {
      isBruinInstalled.value = initialStatus;
    } else {
      isBruinInstalled.value = null; // wait for backend result bounded by timeout
    }
  } catch (_) {
    isBruinInstalled.value = null;
  }
  window.addEventListener("message", handleMessage);
  
  vscode.postMessage({ command: "getLastRenderedDocument" });
  // Proactively request CLI status to avoid missing early emission
  vscode.postMessage({ command: "checkBruinCliInstallation" });
  
  // Auto-refocus if we still have black panel after 3 seconds
  setTimeout(() => {
    if (isBruinInstalled.value === null && !data.value) {
      console.log("🔄 [App.vue] Auto-refocusing due to persistent black panel");
      vscode.postMessage({ command: "bruin.refocusActiveEditor" });
    }
  }, 3000);
  
  // If status is still unknown after a short, bounded time, default to install UI
  setTimeout(() => {
    if (isBruinInstalled.value === null) {
      console.log("⏱️ [App.vue] CLI status still unknown after timeout; showing install UI");
      isBruinInstalled.value = false;
    }
  }, 2500);
  
  // Track page view
  /* try {
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

  console.log("Custom event tracked."); */
});

watch(columnsProps, (newColumns) => {
  columns.value = newColumns;
});


watch(activeTab, (newTab, oldTab) => {
  rudderStack.trackEvent("Tab Switched", {
    fromTab: tabs.value[oldTab]?.label,
    toTab: tabs.value[newTab]?.label,
    assetName: assetDetailsProps.value?.name,
  });
});

// Watch for CLI installation status changes
watch(isBruinInstalled, (newStatus) => {
  console.log("CLI installation status changed to:", newStatus);
  if (newStatus) {
    // CLI is now installed, load the necessary data
    loadAssetData();
    loadEnvironmentsList();
    vscode.postMessage({ command: "bruin.checkBruinCLIVersion" });
  }
});

const updateDescription = (newDescription) => {
  console.log("Updating description with new data:", newDescription);
  if (assetDetailsProps.value) {
    assetDetailsProps.value.description = newDescription;
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: {
        description: newDescription,
      },
      source: "updateDescription",
    });
  }
};

// Function to load asset data
function loadAssetData() {
  if (!isBruinInstalled.value) {
    console.log("CLI not installed, skipping asset data load.");
    return;
  }
  console.log("Loading asset data from Bruin.");
  vscode.postMessage({ command: "bruin.getAssetDetails" });
}

// Function to load the list of environments
function loadEnvironmentsList() {
  if (!isBruinInstalled.value) {
    console.log("CLI not installed, skipping environments list load.");
    return;
  }
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
      tab.props.name = newName; 
    }
  });
};
const assetType = computed(() => {
  if (isPipelineConfig.value) return "pipeline";
  if (isBruinConfig.value) return "config";
  return assetDetailsProps.value?.type || "";
});

const commonBadgeStyle =
  "inline-flex items-center rounded-md px-1 py-0.5 text-xs font-medium ring-1 ring-inset";

const badgeClass = computed(() => {
  const styleForType = badgeStyles[assetType.value] || defaultBadgeStyle;
  return {
    grayBadge: `${commonBadgeStyle} ${defaultBadgeStyle.main}`,
    badgeStyle: `${commonBadgeStyle} ${styleForType.main}`,
  };
});

const isTabActive = (index) => {
  // If CLI check in progress or CLI not installed, no tabs should be active
  if (isBruinInstalled.value === null || isBruinInstalled.value === false) {
    return false;
  }
  return tabs.value[index].props && activeTab.value === index;
};

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style>
vscode-panels::part(tablist) {
  padding-left: 0 !important;
}

vscode-text-field {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
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

#asset-name-container.hover-background:hover {
  background-color: var(--vscode-input-background);
}
</style>
