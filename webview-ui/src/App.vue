<template>
  <div v-if="isBruinInstalled">
    <div class="flex flex-col pt-1">
      <div class="">
        <div class="flex items-center space-x-2 w-full justify-between">
          <!-- Name editing -->
          <div class="flex items-baseline w-3/4 font-md text-editor-fg text-lg font-mono">
            <div class="pipeline-name max-w-[40%] text-xs opacity-50 truncate inline-block">
              {{ assetDetailsProps?.pipeline.name }}
            </div>
            <span class="slash opacity-50 text-xs px-0.5">/</span>
            <div class="flex-grow inline-block">
              <div class="flex items-center">
                <div
                  class="flex-grow font-mono text-lg text-editor-fg"
                  @mouseenter="startNameEditing"
                  @mouseleave="stopNameEditing"
                >
                  <template v-if="isEditingName">
                    <input
                      v-model="editingName"
                      @blur="saveNameEdit"
                      @keyup.enter="saveNameEdit"
                      ref="nameInput"
                      class="text-lg bg-input-background border-0 p-0 text-editor-fg font-mono"
                    />
                  </template>
                  <template v-else>
                    <span class="cursor-pointer" @click="focusName">{{
                      assetDetailsProps?.name
                    }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="tags flex w-1/4 items-center space-x-2 justify-end overflow-hidden">
            <DescriptionItem :value="assetDetailsProps?.type" :className="badgeClass.badgeStyle" />
            <DescriptionItem
              :value="assetDetailsProps?.pipeline.schedule"
              :className="badgeClass.grayBadge"
              class="xs:flex hidden overflow-hidden truncate"
            />
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
          <div class="flex items-center justify-center">
            <span>{{ tab.label }}</span>
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
            class="flex w-full"
            @update:assetName="updateAssetName"
            @update:columns="updateColumns"
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
import { ref, onMounted, computed, watch, nextTick } from "vue";
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
import { PencilIcon, EyeIcon } from "@heroicons/vue/24/outline";
import { QuestionMarkCircleIcon } from "@heroicons/vue/24/solid";

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
// New reactive variables for editing
// Event listener for messages from the VSCode extension
window.addEventListener("message", (event) => {
  const message = event.data;
  console.log("Received message from VSCode extension:", message); // Log received messages
  switch (message.command) {
    case "init":
      lastRenderedDocument.value = message.lastRenderedDocument; // Update last rendered document
      console.log("Last Rendered Document:", lastRenderedDocument.value);
      break;
    case "environments-list-message":
      environments.value = updateValue(message, "success");
      connectionsStore.setDefaultEnvironment(selectedEnvironment.value); // Set the default environment in the store
      console.log("Updated environments list:", environments.value);
      break;
    case "parse-message":
      parseError.value = updateValue(message, "error");
      if (!parseError.value) {
        data.value = updateValue(message, "success"); // Update asset data on success
        console.log("Updated asset data:", data.value);
      }
      lastRenderedDocument.value = updateValue(message, "success");
      break;
    case "bruinCliInstallationStatus":
      isBruinInstalled.value = message.installed; // Update installation status
      console.log("Bruin installation status updated:", isBruinInstalled.value);
      break;
  }
});

const activeTab = ref(0); // Tracks the currently active tab

// Computed property to check if the last rendered document is a Bruin YAML file
const isBruinYml = computed(() => {
  const result = lastRenderedDocument.value && lastRenderedDocument.value.endsWith(".bruin.yml");
  console.log("Is last rendered document a Bruin YAML file?", result);
  return result;
});

// Computed property to parse the list of environments
const environmentsList = computed(() => {
  if (!environments.value) return [];
  const parsedEnvironments = parseEnvironmentList(environments.value)?.environments || [];
  console.log("Parsed environments list:", parsedEnvironments);
  return parsedEnvironments;
});

// Computed property to get the selected environment
const selectedEnvironment = computed(() => {
  if (!environments.value) return [];
  const selected =
    parseEnvironmentList(environments.value)?.selectedEnvironment || "something went wrong";
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
      console.log("Updated asset data after setting:", data.value);
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
        ...assetDetailsProps.value,
        name: editingName.value.trim(),
      },
    });
  }
  stopNameEditing();
};

const focusName = () => {
  nextTick(() => {
    nameInput.value?.focus();
  });
};
const openBruinDocumentation = () => {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: "https://bruin-data.github.io/bruin/",
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
  },
  { deep: true }
);

// Function to update columns
const updateColumns = (newColumns) => {
  console.log("Updating columns with new data:", newColumns);
  columns.value = newColumns;
};

const updateDescription = (newDescription) => {
  console.log("Updating description with new data:", newDescription);
  if (assetDetailsProps.value) {
    assetDetailsProps.value.description = newDescription;
    vscode.postMessage({
      command: "bruin.setAssetDetails",
      payload: {
        ...assetDetailsProps.value,
        name: editingName.value || assetDetailsProps.value?.name,
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
/* Media query to hide the pipeline name, slash, and tags when the panel is too small */
@media (max-width: 320px) {
  .pipeline-name,
  .slash,
  .tags {
    display: none;
  }
}

</style>
