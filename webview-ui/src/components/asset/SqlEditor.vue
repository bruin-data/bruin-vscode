<template>
  <div class="highlight-container rounded-md overflow-hidden">
    <div
      class="header flex items-center justify-between p-2 border-gray-300 shadow-sm"
    >
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
    <div id="sql-editor" class="code-container pb-0">
      <pre id="editor-pre">
        <div v-for="(line, index) in highlightedLines" :key="index" class="line">
          <span class="line-number pl-1 pr-4 min-w-10 user-select-none text-right">{{ index + 1 }}</span>
          <span v-html="line"></span>
        </div>
      </pre>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, computed } from "vue";
import 'highlight.js/styles/default.css'; 
import IConButton from "@/components/ui/buttons/IconButton.vue";
import hljs from 'highlight.js/lib/core';

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

const highlightedLines = computed(() => {
  if (!props.code) return [];
  const highlighted = hljs.highlight(props.code, { language: props.language }).value;

  let lines = highlighted.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop(); 
  }
  return lines.map(line => `<span>${line}</span>`);
});

</script>

<style scoped>
.highlight-container {
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-input-background);
}

.header {
  color: var(--vscode-disabledForeground);
  background-color: var(--vscode-input-background);
}

.copy-button {
  color: var(--vscode-icon-foreground);
}
#sql-editor,
.python-content {
  background-color: var(--vscode-sideBar-background);
}

.python-content {
  white-space: pre-wrap; 
  color: var(--vscode-foreground);
}

.sql-content {
  background-color: var(--vscode-sideBar-background);
  border-top: none;
}

.line {
  display: flex;
  white-space: pre-wrap; 
}

.line-number {
  color: var(--vscode-disabledForeground);
}

.code-content {
  flex-grow: 1;
  overflow: hidden;
}

#editor-pre {
  overflow: auto;
  word-wrap: break-word;
  white-space: pre-wrap;
  max-width: 100%;
  color: var(--vscode-icon-foreground);
  margin-bottom: -1em;
  padding: 0 8px;
}
  



</style>
