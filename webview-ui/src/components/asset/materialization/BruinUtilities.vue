<template>
  <div class="bg-editorWidget-bg border border-commandCenter-border rounded-md">
    <div class="py-3">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-editor-fg">Utilities</h3>
      </div>

      <div class="flex items-center gap-2">
        <vscode-button
          @click="fillAssetDependency"
          appearance="default"
          class="text-2xs h-6 px-2"
        >
          Fill Asset Dependencies
        </vscode-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { vscode } from "@/utilities/vscode";

const fillAssetDependency = () => {
  vscode.postMessage({
    command: "bruin.fillAssetDependency",
  });
};

const fillColumnsFromDB = () => {
  vscode.postMessage({
    command: "bruin.fillColumnsFromDB",
  });
};
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
  padding: 0 8px;
}
</style> 