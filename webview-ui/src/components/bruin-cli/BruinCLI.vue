<template>
  <div class="flex flex-col h-full w-full text-editor-fg">
    <div class="flex flex-col p-2 space-y-2">
      <div v-if="!isBruinCliInstalled" class="flex flex-col space-y-3">
        <h2 class="text-lg font-semibold">Install Bruin CLI</h2>
        <p class="text-sm">
          Bruin CLI needs to be installed to use the full features of the Bruin Extension.
        </p>
        <vscode-button @click="installBruinCli" class="self-center">Install Bruin CLI</vscode-button>
      </div>
      <div v-else class="flex flex-col space-y-3">
        <h2 class="text-lg font-semibold">Update Bruin CLI</h2>
        <p class="text-sm">
          Keep your Bruin CLI up-to-date to ensure you have the latest features and improvements.
        </p>
        <vscode-button @click="updateBruinCli" class="self-center">Update Bruin CLI</vscode-button>
      </div>
    </div>
    
    <vscode-divider role="separator"></vscode-divider>
    
    <div class="flex-grow p-4">
      <!-- Additional content can go here -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { vscode } from "@/utilities/vscode";

const isBruinCliInstalled = ref(false);

onMounted(() => {
  checkBruinCliInstallation();

  window.addEventListener("message", (event) => {
    const message = event.data;
    console.log("Message received in Vue component:", message);
    if (message.command === "bruinCliInstallationStatus") {
      isBruinCliInstalled.value = message.installed;
    }
  });
});

function checkBruinCliInstallation() {
  vscode.postMessage({ command: "checkBruinCliInstallation" });
}

function installBruinCli() {
  vscode.postMessage({ command: "bruinInstallCLI" });
}

function updateBruinCli() {
  vscode.postMessage({ command: "bruinUpdateCLI" });
}
</script>