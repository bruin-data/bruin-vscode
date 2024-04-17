<template>
  <div class="highlight-container rounded-tl-md rounded-tr-md">
    <div class="header rounded-tl-md rounded-tr-md flex items-center justify-between p-2">
      <label class="text-sm font-medium">SQL Preview</label>
      <button
        @click="copyToClipboard"
        :disabled="!code"
        class="copy-button flex items-center bg-none border-none cursor-pointer"
      >
        <IConButton v-show="!copied" aria-hidden="true" />
        <span v-if="copied" class="text-sm">Copied!</span>
      </button>
    </div>
    <div id="sql-editor" v-if="language === 'sql'">
      <highlightjs language="sql" :code="code" />
    </div>
    <div id="sql-editor" v-else-if="language === 'python'" class="python-content">
      {{ code }}
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps } from "vue";
import IConButton from "./ui/buttons/IconButton.vue";
const props = defineProps({
  code: String | undefined,
  language: "sql" | "python",
  copied: Boolean,
});

const copied = ref(false);

function copyToClipboard() {
  navigator.clipboard.writeText(props.code);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>

<style scoped>
.highlight-container {
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-background);
}

.header {
  color: var(--vscode-disabledForeground);
  background-color: var(--vscode-input-background);
}

.copy-button {
  color: var(--vscode-icon-foreground);
}
#sql-editor, .python-content {
  padding: 1rem;
  background-color: var(--vscode-sideBar-background);
}

.python-content {
  white-space: pre-wrap; /* Preserves whitespace formatting */
  color: var(--vscode-foreground);
}

.sql-content {
  background-color: var(--vscode-sideBar-background);
  border-top: none;
}
.sql-content >>> .hljs {
  background-color: var(--vscode-sideBar-background);
}
</style>
