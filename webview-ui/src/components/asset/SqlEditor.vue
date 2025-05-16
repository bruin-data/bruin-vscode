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
    <div id="sql-editor" class="code-container pb-0" :style="{ height: editorHeight }">
      <DynamicScroller
        class="scroller"
        :items="visibleHighlightedLines"
        :min-item-size="lineHeight"       
        key-field="lineNumber"
        v-slot="{ item }"
      >
        <DynamicScrollerItem :item="item">
          <div class="line">
            <span class="line-number">{{ item.lineNumber }}</span>
            <span class="line-content" v-html="item.content"></span>
          </div>
        </DynamicScrollerItem>
      </DynamicScroller>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, computed } from "vue";
import 'highlight.js/styles/default.css'; 
import IConButton from "@/components/ui/buttons/IconButton.vue";
import hljs from 'highlight.js/lib/core';
import { DynamicScroller, DynamicScrollerItem } from 'vue3-virtual-scroller';
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';

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
const lineHeight = 15; 
const minEditorHeight = `${lineHeight * 8}px`;
const maxEditorHeight = '500px';
const highlightedLines = computed(() => {
  if (!props.code) return [];
  const highlighted = hljs.highlight(props.code, { language: props.language }).value;

  const lines = highlighted.split('\n').filter(line => line !== ''); // Filter out empty strings
  return lines.map(line => `<span>${line}</span>`);
});
const visibleHighlightedLines = computed(() => {
  if (!props.code) return [];
  const lines = highlightedLines.value;
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    content: line,
  }));
});

const editorHeight = computed(() => {
  if (!props.code) return minEditorHeight;
  const lineCount = visibleHighlightedLines.value.length;
  const calculatedHeight = lineCount * lineHeight;
  return `${Math.min(Math.max(calculatedHeight, lineHeight * 5), 500)}px`;
});

</script>

<style scoped>
.highlight-container {
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-input-background);
  display: flex;
  flex-direction: column;
  min-height: v-bind(minEditorHeight);
  max-height: v-bind(maxEditorHeight);
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
  display: grid;
  grid-template-columns: 60px 1fr;
}
#sql-editor {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  flex-grow: 1;
}

.line-number {
  height: v-bind(lineHeight + 'px');
  line-height: v-bind(lineHeight + 'px');
  padding: 0 1rem;
  color: var(--vscode-disabledForeground);
  user-select: none;
  position: sticky;
  left: 0;
  text-align: right;
  white-space: nowrap;
}
.line-content {
  line-height: v-bind(lineHeight + 'px');
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow-x: visible;
}
.header {
  color: var(--vscode-disabledForeground);
  background-color: var(--vscode-input-background);
}
.copy-button {
  color: var(--vscode-icon-foreground);
}
.python-content {
  white-space: pre-wrap; 
  color: var(--vscode-foreground);
}

.sql-content {
  background-color: var(--vscode-sideBar-background);
  border-top: none;
}

#editor-pre {
  background-color: var(--vscode-sideBar-background);
  padding: 8px 0;
  counter-reset: line;
  overflow-x: auto;
}

.highlight-container {
  position: relative;
  font-family: var(--vscode-editor-font-family);
  font-size: var(--vscode-editor-font-size);
}
.code-content {
  flex-grow: 1;
  overflow: hidden;
}
.scroller {
  height: 100%;
  width: 100%;
  min-height: v-bind(minEditorHeight);
  white-space: pre-wrap;
}
</style>

