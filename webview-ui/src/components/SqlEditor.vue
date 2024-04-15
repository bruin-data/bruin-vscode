<template>
  <div class="flex flex-col">
    <label for="sql-editor" class="mb-2 text-sm font-medium text-gray-700">SQL Preview</label>
    <div class="relative">
      <div class="absolute top-0 right-0 m-2 mb-2">
        <div v-if="copied">
          <span class="text-sm text-green-500">Copied!</span>
        </div>
        <div v-else>
          <IConButton v-if="code" @click="copyToClipboard" />
        </div>
      </div>
      <div id="sql-editor" class="">
        <highlightjs language="sql" :code="code" />
      </div>
    </div>
  </div>
</template>

<script setup>
import IConButton from "@/components/ui/buttons/IconButton.vue";
const props = defineProps({
  code: String | undefined,
  copied: Boolean,
});

const copyToClipboard = () => {
  navigator.clipboard.writeText(props.code);
  props.copied = true;
  setTimeout(() => {
    props.copied = false;
  }, 2000);
};
</script>

<style scoped>
.highlight-container {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorGroup-border);
  border-radius: 4px;
}
</style>
