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
      <div class="mt-5">
        <template v-if="isWindows && !isBruinCliInstalled && !gitAvailble">
          <div class="mt-3 text-sm leading-6">
              Git is required to install Bruin CLI on Windows. Please install Git first.
          </div>
        </template>

        <vscode-button
          v-else
          @click="installOrUpdateBruinCli"
          class="inline-flex items-center rounded-md px-3 py-2 text-lg font-semibold shadow-sm"
        >
          {{ isBruinCliInstalled ? "Update" : "Install" }} Bruin CLI
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { vscode } from "@/utilities/vscode";

const isBruinCliInstalled = ref(false);
const isWindows = ref(false);
const gitAvailble = ref(false);

onMounted(() => {
  checkBruinCliInstallation();

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.command === "bruinCliInstallationStatus") {
      isBruinCliInstalled.value = message.installed;
      isWindows.value = message.isWindows;
      gitAvailble.value = message.gitAvailble;
    }
  });
});

function checkBruinCliInstallation() {
  vscode.postMessage({ command: "checkBruinCliInstallation" });
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