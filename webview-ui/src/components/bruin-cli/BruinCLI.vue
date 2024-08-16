<!-- <template>
  <div class="flex flex-col h-full w-full text-editor-fg">
    <div class="flex flex-col p-2 space-y-2">
      <h2 class="text-lg font-semibold">
        {{ isBruinCliInstalled ? "Update" : "Install" }} Bruin CLI
      </h2>
      <p class="text-sm">
        {{
          isBruinCliInstalled
            ? "Keep your Bruin CLI up-to-date to ensure you have the latest features and improvements."
            : "Bruin CLI needs to be installed to use the full features of the Bruin Extension."
        }}
      </p>
      <template v-if="isWindows && !isBruinCliInstalled && !goInstalled">
        <p class="text-sm">
          Go is required to install Bruin CLI on Windows. Please install Go first.
          <a href="https://golang.org/doc/install" target="_blank">Go installation guide</a>
        </p>
      </template>
      <vscode-button v-else @click="installOrUpdateBruinCli" class="self-center">
        {{ isBruinCliInstalled ? "Update" : "Install" }} Bruin CLI
      </vscode-button>
    </div>
  </div>
</template> -->

<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-base font-semibold leading-6 text-editor-fg">
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
        <template v-if="isWindows && !isBruinCliInstalled && !goInstalled">
          <div class="mt-3 text-sm leading-6">
            <a
              href="https://golang.org/doc/install"
              class="font-semibold text-editorLink-activeFg  hover:text-link-activeForeground"
            >
              Go is required to install Bruin CLI on Windows. Please install Go first.
              <span aria-hidden="true"> &rarr;</span>
            </a>
          </div>
        </template>

        <vscode-button
          v-else
          @click="installOrUpdateBruinCli"
          class="inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm"
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
const goInstalled = ref(false);

onMounted(() => {
  checkBruinCliInstallation();

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.command === "bruinCliInstallationStatus") {
      isBruinCliInstalled.value = message.installed;
      isWindows.value = message.isWindows;
      goInstalled.value = message.goInstalled;
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
