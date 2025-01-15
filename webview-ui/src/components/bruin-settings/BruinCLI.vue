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
      <div v-if="showInfoCard" class="bg-editorWidget-bg shadow sm:rounded-lg mt-4 p-4">
        <h4 class="text-lg font-semibold leading-6 text-editor-fg">System Info</h4>
        <div class="mt-2 max-w-xl text-sm">
          <ul class="list-none m-0 p-0">
            <li class="flex items-center mb-2">
              <span class="text-editor-fg-secondary font-medium mr-2">Platform:</span>
              <span class="text-editor-fg">{{ currentPlatform }}</span>
            </li>
            <li class="flex items-center mb-2">
              <span class="text-editor-fg-secondary font-medium mr-2">Bruin CLI:</span>
              <span class="text-editor-fg">{{ bruinCliVersion }}</span>
            </li>
            <li class="flex items-center">
              <span class="text-editor-fg-secondary font-medium mr-2">Bruin Extension:</span>
              <span class="text-editor-fg">{{ bruinVscodeVersion }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { vscode } from "@/utilities/vscode";
import { ChevronUpIcon, QuestionMarkCircleIcon, ChevronDownIcon } from "@heroicons/vue/20/solid";

const isBruinCliInstalled = ref(false);
const isWindows = ref(false);
const gitAvailable = ref(false);
const currentPlatform = ref("");
const bruinCliVersion = ref("");
const showInfoCard = ref(false);
const bruinVscodeVersion = ref("");
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
</style>
