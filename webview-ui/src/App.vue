<template>
  <div >
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
                      {{ displayName }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- <div class="flex w-1/4 items-center space-x-2 justify-end flex-shrink-0">
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
          </div> -->
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
          />
          
        </vscode-panel-view>
      </vscode-panels>
    </div>
  </div>

</template>
<script setup lang="ts">
import AssetDetails from "@/components/asset/AssetDetails.vue";
import { vscode } from "@/utilities/vscode";
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from "vue";
import { parseAssetDetails } from "./utilities/helper";
import { updateValue } from "./utilities/helper";


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
// New reactive variables for editing
// Event listener for messages from the VSCode extension
const  handleMessage = ((event: MessageEvent) => {
  const message = event.data;
  try {
    switch (message.command) {
  
      case "parse-message": {
        console.warn("Parsing message received:", (new Date).toISOString());
        const parsed = updateValue(message, "success");
      
          data.value = parsed;
    
        
        console.warn("Parsing message received END:", (new Date).toISOString());
        break;
      }
    
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
});

const isBruinYml = ref(false); 
const activeTab = ref(0); // Tracks the currently active tab
const navigateToGlossary = () => {
  console.log("Opening glossary.");
  vscode.postMessage({ command: "bruin.openGlossary" });
};
// Computed property to parse the list of environments



// Computed property to get the selected environment

const parsedData = computed(() => {
  if (!data.value) return null;
  try {
    return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
  } catch {
    return null;
  }
});

const isPipelineConfig = computed(() => parsedData.value?.type === "pipelineConfig");
const isBruinConfig = computed(() => parsedData.value?.type === "bruinConfig")
const displayName = computed(() => {
  if (isPipelineConfig.value) return parsedData.value?.name || "";
  if (isBruinConfig.value) return "Bruin Config";
  return assetDetailsProps.value?.name || "";
});


// Computed property for asset details
const assetDetailsProps = computed({
  get: () => {
    if (!data.value ) return null;
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

const isEditingName = ref(false);
const editingName = ref(assetDetailsProps.value?.name || "");
const nameInput = ref<HTMLInputElement | null>(null);

const startNameEditing = () => {
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

};

const focusName = () => {
  nextTick(() => {
    nameInput.value?.focus();
  });
};

// Computed property for asset columns

// Computed property for asset columns

// Define tabs for the application
const tabs = ref([
  {
    label: "Asset Details",
    component: AssetDetails,
    props: computed(() => ({
      ...assetDetailsProps.value,
    })),
    emits: ["update:name", "update:description"],
  },
  /* {
    label: "Columns",
    component: AssetColumns,
    props: computed(() => ({
      columns: columns.value,
      isConfigFile: isConfigFile.value,
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
    },
  }, */
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
onMounted(async() => {
  console.log("onMounted");
  console.time("allPromises");
  console.log("Adding message listener");
  window.addEventListener('message', handleMessage);
  try {
    await Promise.all([
      loadAssetData(),
    ]);
  } catch (error) {
    console.error("Error in Promise.all:", error);
  }
  console.log("allPromises completed");
  console.timeEnd("allPromises");
  console.time("postMessage");
  vscode.postMessage({ command: "getLastRenderedDocument" });
  //vscode.postMessage({ command: "bruin.checkTelemtryPreference" });
  vscode.postMessage({ command: "bruin.checkBruinCLIVersion" });
  console.timeEnd("postMessage");
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

// send the message to check the bruin version every 30 minutes
setInterval(() => {
  vscode.postMessage({ command: "bruin.checkBruinCLIVersion" });
}, 1800000);

// Lifecycle hook to clean up hover timeout

// Function to check if Bruin CLI is installed
function checkBruinCliInstallation() {
  console.log("Checking Bruin CLI installation status.");
  vscode.postMessage({ command: "checkBruinCliInstallation" });
}




// Function to load asset data
function loadAssetData() {
  console.log("Loading asset data from Bruin.");
  vscode.postMessage({ command: "bruin.getAssetDetails" });
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


onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
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
