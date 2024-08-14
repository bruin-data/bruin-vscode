<template>
  <div class="flex flex-col h-full w-full text-editor-fg">
    <div class="flex flex-col p-2 space-y-2">
            <div class="flex flex-col space-y-3">
        <h2 class="text-lg font-semibold">Update Bruin CLI</h2>
        <p class="text-sm">
          Bruin CLI needs to be installed and up-to-date in order to use the full features of the
          Bruin Extension.
        </p>
        <vscode-button class="self-center">Upgrade</vscode-button>
      </div>
    </div>
    
<vscode-divider role="separator"></vscode-divider>
    
    <div class="flex-grow p-4">
      <!-- Additional content can go here -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";

onMounted(() => {
  window.addEventListener("message", (event) => {
    const message = event.data;
    console.log("Message received in Vue component:", message);
    // Handle messages
  });
});
</script>
