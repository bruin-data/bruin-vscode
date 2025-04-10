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

        <vscode-button
          @click="installOrUpdateBruinCli"
          :appearance="
            props.versionStatus?.status === 'outdated' || !isBruinCliInstalled
              ? 'primary'
              : 'secondary'
          "
          class="text-sm font-semibold"
        >
          {{ isBruinCliInstalled ? "Update" : "Install" }} CLI
        </vscode-button>
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
import { ref, onMounted, computed, watch } from "vue";
import { vscode } from "@/utilities/vscode";
import { ChevronUpIcon, QuestionMarkCircleIcon, ChevronDownIcon } from "@heroicons/vue/20/solid";
import { DocumentDuplicateIcon } from "@heroicons/vue/24/outline";

const props = defineProps({
  versionStatus: {
    type: Object,
    required: true,
    default: () => ({ status: "", current: "", latest: "" }),
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

onMounted(() => {
  checkBruinCliInstallation();
  window.addEventListener("message", (event) => {
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
  });

  console.log("BruinCLI component mounted, versionStatus:", props.versionStatus);
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

function installOrUpdateBruinCli() {
  vscode.postMessage({ command: "bruinInstallOrUpdateCLI" });
}

watch(
  () => props.versionStatus,
  (newStatus) => {
    console.log("BruinCLI.vue - versionStatus updated:", newStatus);
  },
  { deep: true }
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
