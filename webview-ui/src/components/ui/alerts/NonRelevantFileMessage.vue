<template>
  <div class="non-relevant-file-container p-6">
    <div class="flex flex-col items-center justify-center space-y-4 text-center">
      <div class="text-6xl text-editor-fg opacity-50">
        <span class="codicon codicon-file"></span>
      </div>
      <div class="text-editor-fg text-lg font-semibold">File Not Supported</div>
      <p class="text-editor-fg opacity-75 max-w-md">
        This file type is not supported by Bruin. Bruin works with SQL, Python, and YAML asset files.
      </p>
      <div class="text-sm text-editor-fg opacity-60">
        <p>Supported file types:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li>SQL files (.sql)</li>
          <li>Python files (.py)</li>
          <li>YAML asset files (.asset.yml, .asset.yaml)</li>
          <li>Pipeline files (pipeline.yml, pipeline.yaml)</li>
          <li>Bruin config files (.bruin.yml, .bruin.yaml)</li>
        </ul>
      </div>
      <div class="mt-4 p-3 bg-editorWidget-bg rounded-md border border-editorWidget-border">
        <p class="text-sm text-editor-fg">
          <strong>Current file:</strong> {{ filePath }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps({
  filePath: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.non-relevant-file-container {
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>