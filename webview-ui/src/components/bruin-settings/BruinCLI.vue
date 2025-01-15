<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg">
    <div class="p-4 sm:p-4">
      <h3 class="text-lg font-semibold leading-6 text-editor-fg">
        {{ isBruinCliInstalled ? "Update" : "Install" }} Bruin CLI
      </h3>
      <div class="mt-2 max-w-xl text-sm text-editor-fg">
        <p>
          {{
            isBruinCliInstalled
              ? "Keep your Bruin CLI up-to-date to ensure you have the latest features and improvements."
              : "Bruin CLI needs to be installed to use the full features of the Bruin Extension."
          }}
        </p>
      </div>
      <div class="flex items-center justify-between mt-5">
        <vscode-button
          @click="installOrUpdateBruinCli"
          class="inline-flex items-center rounded-md px-3 py-2 text-lg font-semibold shadow-sm"
        >
          {{ isBruinCliInstalled ? "Update" : "Install" }} Bruin CLI
        </vscode-button>
        <div class="flex space-x-1">
          <vscode-button
            appearance="icon"
            @click="openBruinDocumentation"
            title="Bruin Documentation"
            class="text-md font-semibold"
          >
            <QuestionMarkCircleIcon class="h-5 w-5 text-editor-fg" />
          </vscode-button>

          <vscode-button
            appearance="icon"
            @click="CheckInstallationsInfo"
            title="Check Bruin CLI/system Versions"
            class="text-md font-semibold"
          >
            <ChevronUpIcon v-if="showInfoCard" class="h-5 w-5 text-editor-fg" />
            <ChevronDownIcon v-else class="h-5 w-5 text-editor-fg" />
          </vscode-button>
        </div>
      </div>
      <div v-if="showInfoCard" class="bg-editorWidget-bg shadow sm:rounded-lg mt-2 p-2 relative">
        <div class="absolute top-4 right-4">
          <vscode-button
            appearance="icon"
            v-if="!copied"
            @click="copySystemInfo"
            title="Copy System Info"
            class=" text-md font-semibold"
          >
            <DocumentDuplicateIcon class="h-5 w-5 text-editor-fg" />
          </vscode-button>
          <span v-if="copied" class="text-sm">Copied!</span>
        </div>
        <h4 class="text-lg font-semibold leading-6 text-editor-fg">System Info</h4>
        <div class="mt-2 max-w-xl text-sm">
          <pre
            class="bg-editorWidget-bg-secondary overflow-x-auto text-editor-fg-secondary"
            ref="systemInfoContent"
            >{{ formattedSystemInfo }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { vscode } from "@/utilities/vscode";
import { ChevronUpIcon, QuestionMarkCircleIcon, ChevronDownIcon } from "@heroicons/vue/20/solid";
import { DocumentDuplicateIcon } from "@heroicons/vue/24/outline";

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
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
