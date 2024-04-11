<template>
  <div class="flex flex-col">
    <label for="sql-editor" class="mb-2 text-sm font-medium text-gray-700">SQL Editor</label>
    <div class="relative">
      <div class="absolute top-0 right-0 m-2 mb-2">
        <IConButton v-if="code"></IConButton>
      </div>
      <div
        id="sql-editor" class="">
        <highlightjs language="sql" :code= code  />
      </div>
    </div>
  </div>
</template>

<script setup>
import IConButton from "@/components/IconButton.vue";
const props = defineProps({
  code: String | undefined,
});

</script>

<style scoped>
.highlight-container {
  background-color: var(--vscode-editor-background); 
  border: 1px solid var(--vscode-editorGroup-border); 
  border-radius: 4px; 
}
</style>