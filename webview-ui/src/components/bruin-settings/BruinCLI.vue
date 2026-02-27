<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg">
    <div class="p-4 sm:p-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-editor-fg">Bruin CLI Status</h3>
        <div class="flex space-x-1">
          <vscode-button
            appearance="icon"
            @click="openBruinDocumentation"
            title="Bruin Documentation"
            class="text-md font-semibold"
          >
            <span class="codicon codicon-book"></span>
          </vscode-button>

          <vscode-button
            appearance="icon"
            @click="CheckInstallationsInfo"
            title="Check Bruin CLI/system Versions"
            class="text-md font-semibold"
          >
            <span v-if="showInfoCard" class="codicon codicon-chevron-up"></span>
            <span v-else class="codicon codicon-chevron-down"></span>
          </vscode-button>
        </div>
      </div>

      <div class="mt-2 flex items-center justify-between">
        <div class="max-w-xl text-sm text-editor-fg">
          <div v-if="isBruinCliInstalled" class="flex items-center">
            <span v-if="props.versionStatus?.status === 'outdated'" class="flex items-center">
              <span class="inline-block h-2 w-2 rounded-full bg-yellow-400 mr-2"></span>
              <span>Update available for Bruin CLI</span>
            </span>
            <span v-else class="flex items-center">
              <span class="inline-block h-2 w-2 rounded-full bg-green-400 mr-2"></span>
              <span>Bruin CLI is up-to-date</span>
            </span>
          </div>
          <div v-else>
            <span class="flex items-center">
              <span class="inline-block h-2 w-2 rounded-full bg-red-400 mr-2"></span>
              <span>Bruin CLI needs to be installed</span>
            </span>
          </div>
        </div>

        <div class="relative flex items-center">
          <div class="flex items-center">
            <vscode-button
              @click="installOrUpdateBruinCli(false)"
              :appearance="
                props.versionStatus?.status === 'outdated' || !isBruinCliInstalled
                  ? 'primary'
                  : 'secondary'
              "
              class="text-sm font-semibold rounded-r-none h-7"
            >
              {{ isBruinCliInstalled ? "Update" : "Install" }} CLI
            </vscode-button>

            <vscode-button
              v-if="isBruinCliInstalled"
              appearance="icon"
              @click="toggleVersionOptions"
              title="Version Options"
              class="flex items-center justify-center h-7 w-7 border-l border-commandCenter-border text-sm font-semibold rounded-none bg-input-background text-input-foreground hover:bg-inputOption-hoverBackground"
            >
              <span class="codicon codicon-chevron-down"></span>
            </vscode-button>
          </div>

          <div
            v-if="showVersionOptions"
            class="absolute right-2 mt-12 w-44 bg-input-background shadow-lg rounded-sm z-10"
            ref="versionOptionsDropdown"
          >
            <div
              class="p-1 cursor-pointer hover:bg-inputOption-hoverBackground"
              @click="showSpecificVersionInput = true; showVersionOptions = false"
            >
              Specific Version...
            </div>
          </div>
        </div>
      </div>

      <div v-if="showSpecificVersionInput" class="mt-2 flex items-center justify-end space-x-1">
        <input
          v-model="specificVersion"
          type="text"
          placeholder="Enter version"
          class="border rounded-sm text-sm w-36 h-6 bg-input-background text-input-foreground"
        />
        <vscode-button
          @click="installOrUpdateBruinCli(true)"
          appearance="icon"
          class="text-xs bg-input-background text-input-foreground"
        >
          <span class="codicon codicon-check"></span>
        </vscode-button>
        <vscode-button
          @click="showSpecificVersionInput = false"
          appearance="icon"
          class="text-xs bg-input-background text-input-foreground"
        >
          <span class="codicon codicon-x"></span>
        </vscode-button>
      </div>

      <div v-if="errorMessage" class="text-errorForeground text-sm mt-2">
        {{ errorMessage }}
      </div>

      <div v-if="showInfoCard" class="bg-editorWidget-bg shadow sm:rounded-lg mt-4 p-3 relative">
        <div class="absolute top-3 right-3">
          <vscode-button
            appearance="icon"
            v-if="!copied"
            @click="copySystemInfo"
            title="Copy System Info"
            class="text-md font-semibold"
          >
            <DocumentDuplicateIcon class="h-5 w-5 text-editor-fg" />
          </vscode-button>
          <span v-if="copied" class="text-sm">Copied!</span>
        </div>
        <h4 class="text-md font-medium text-editor-fg">System Information</h4>
        <div class="mt-2 max-w-xl text-sm">
          <pre
            class="bg-editorWidget-bg-secondary overflow-x-auto text-editor-fg-secondary p-2 rounded"
            ref="systemInfoContent"
            >{{ formattedSystemInfo }}</pre
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import { vscode } from "@/utilities/vscode";
import { DocumentDuplicateIcon } from "@heroicons/vue/24/outline";

const props = defineProps({
  versionStatus: {
    type: Object,
    required: true,
    default: () => ({ status: "", current: "", latest: "" }),
  },
  allowInitialLoad: {
    type: Boolean,
    default: true,
  },
});

const isBruinCliInstalled = ref(false);
const isWindows = ref(false);
const gitAvailable = ref(false);
const currentPlatform = ref("");
const bruinCliVersion = ref("");
const showInfoCard = ref(false);
const bruinVscodeVersion = ref("");
const copied = ref(false);
const specificVersion = ref("");
const errorMessage = ref("");
const showVersionOptions = ref(false);
const showSpecificVersionInput = ref(false);
const versionOptionsDropdown = ref<HTMLElement | null>(null);
const hasRequestedInitialStatus = ref(false);

const requestCliStatusIfAllowed = () => {
  if (!props.allowInitialLoad || hasRequestedInitialStatus.value) {
    return;
  }

  hasRequestedInitialStatus.value = true;
  checkBruinCliInstallation();
};

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "bruinCliInstallationStatus":
      isBruinCliInstalled.value = message.installed;
      isWindows.value = message.isWindows;
      gitAvailable.value = message.gitAvailable;
      console.log("BruinCLI installation status:", isBruinCliInstalled.value);
      break;

    case "installationInfo":
      console.log("Updating currentPlatform:", message.platform);
      currentPlatform.value = message.platform;
      console.log("Updating bruinCliVersion:", message.cliVersion);
      bruinCliVersion.value = message.cliVersion;
      bruinVscodeVersion.value = message.extensionVersion;
      break;
  }
};

onMounted(() => {
  requestCliStatusIfAllowed();
  window.addEventListener("message", handleMessage);

  console.log("BruinCLI component mounted, versionStatus:", props.versionStatus);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", handleMessage);
});

const openBruinDocumentation = () => {
  vscode.postMessage({
    command: "bruin.openDocumentationLink",
    payload: "https://bruin-data.github.io/bruin/",
  });
};

function checkBruinCliInstallation() {
  vscode.postMessage({ command: "checkBruinCliInstallation" });
}

const systemInfoContent = ref<HTMLElement | null>(null);

function copySystemInfo() {
  if (systemInfoContent.value) {
    navigator.clipboard.writeText(systemInfoContent.value.innerText);
    copied.value = true;
  }
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

const formattedSystemInfo = computed(() => {
  return (
    "Platform: " +
    currentPlatform.value +
    "\n" +
    "Bruin CLI: " +
    bruinCliVersion.value +
    "\n" +
    "Bruin Extension: " +
    bruinVscodeVersion.value
  );
});

function CheckInstallationsInfo() {
  vscode.postMessage({ command: "checkInstallationsInfo" });
  showInfoCard.value = !showInfoCard.value;
}

function toggleVersionOptions() {
  showVersionOptions.value = !showVersionOptions.value;
  showSpecificVersionInput.value = false;
  specificVersion.value = "";
  errorMessage.value = "";
}

function installOrUpdateBruinCli(isSpecificVersion: boolean) {
  if (isSpecificVersion && specificVersion.value) {
    // Validate the version format
    const versionPattern = /^v?\d+(\.\d+){0,2}$/;
    if (!versionPattern.test(specificVersion.value)) {
      errorMessage.value = "Invalid version format. Please enter a valid version (e.g., 1.0.0).";
      return;
    }

    // Send command to install or update to the specific version
    vscode.postMessage({
      command: "bruin.installSpecificVersion",
      version: specificVersion.value,
    });
  } else {
    // Install or update to the latest version
    if (isBruinCliInstalled.value) {
      vscode.postMessage({ command: "bruin.updateBruinCli" });
    } else {
      vscode.postMessage({ command: "bruin.installBruinCli" });
    }
  }

  // Clear the error message
  errorMessage.value = "";
  showVersionOptions.value = false;
  showSpecificVersionInput.value = false;
}

watch(
  () => props.versionStatus,
  (newStatus) => {
    console.log("BruinCLI.vue - versionStatus updated:", newStatus);
  },
  { deep: true }
);

watch(
  () => props.allowInitialLoad,
  (isAllowed) => {
    if (isAllowed) {
      requestCliStatusIfAllowed();
    }
  }
);
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  line-height: 1.4;
}
</style>
