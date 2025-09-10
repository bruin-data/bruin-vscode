<template>
  <div class="highlight-container rounded overflow-hidden">
    <div class="header flex items-center justify-between px-1.5 py-0.5 border-commandCenter-border shadow-sm">
      <label class="text-xs font-sans">Preview</label>
      <div class="flex items-center">
        <div class="relative" v-if="showIntervalAlert">
          <vscode-button
            appearance="icon"
            class="ml-1"
            @click="toggleWarningMessage"
            @mouseenter="onWarningMouseEnter"
            @mouseleave="onWarningMouseLeave"
            v-click-outside="onClickOutsideWarning"
          >
            <span
              class="codicon codicon-warning text-xs text-notificationsWarningIcon-fg"
              aria-hidden="true"
            ></span>
          </vscode-button>
          <div
            v-if="showAlertMassage"
            class="absolute top-full right-0 mt-1 z-50 transition-all duration-300 ease-in-out"
            style="min-width: 250px; white-space: nowrap"
          >
            <div
              class="flex items-center border border-commandCenter-border bg-vscode-input-background px-2 py-1 rounded-md text-notification-fg shadow-lg warning-message-box"
            >
              <span class="text-xs">Check "Interval-modifiers" to apply them.</span>
            </div>
          </div>
        </div>
        <vscode-button
          @click="copyToClipboard"
          appearance="icon"
          :disabled="!code"
          class="copy-button flex items-center bg-none border-none cursor-pointer"
        >
          <span class="codicon codicon-copy text-xs" v-show="!copied" aria-hidden="true" />
          <span v-if="copied" class="text-sm">Copied!</span>
        </vscode-button>
      </div>
    </div>
    <div id="sql-editor" class="code-container pb-0">
      <!-- Use regular rendering for small content, virtual scroller for large content -->
      <div v-if="shouldUseVirtualScroller" class="scroller">
        <DynamicScroller
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
      <div v-else class="regular-content">
        <div v-for="item in visibleHighlightedLines" :key="item.lineNumber" class="line">
          <span class="line-number">{{ item.lineNumber }}</span>
          <span class="line-content" v-html="item.content"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, computed, watch } from "vue";
import "highlight.js/styles/default.css";
import hljs from "highlight.js/lib/core";
import { DynamicScroller, DynamicScrollerItem } from "vue3-virtual-scroller";
import "vue3-virtual-scroller/dist/vue3-virtual-scroller.css";

const props = defineProps({
  code: String | undefined,
  language: "sql" | "python" | "yaml",
  copied: Boolean,
  showIntervalAlert: Boolean,
});

const showIntervalAlert = ref(props.showIntervalAlert);
const showAlertMassage = ref(false);
const copied = ref(false);
const clickOpened = ref(false);

const vClickOutside = {
  mounted(el, binding) {
    el.__ClickOutsideHandler__ = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener("click", el.__ClickOutsideHandler__);
  },
  unmounted(el) {
    document.body.removeEventListener("click", el.__ClickOutsideHandler__);
  },
};

function copyToClipboard() {
  navigator.clipboard.writeText(props.code);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

const lineHeight = 18;
const editorPadding = 12; 
const minEditorHeight = `${lineHeight * 2}px`;
const maxEditorHeight = "500px";

const lineNumberWidth = computed(() => {
  const totalLines = visibleHighlightedLines.value.length;
  const digits = totalLines.toString().length;
  return 20 + (digits * 8);
});

const shouldUseVirtualScroller = computed(() => {
  return visibleHighlightedLines.value.length > 50;
});

const highlightedLines = computed(() => {
  if (!props.code) return [""];
  const highlighted = hljs.highlight(props.code, { language: props.language }).value;
  return highlighted.split("\n").map((line) => `<span>${line}</span>`);
});

const visibleHighlightedLines = computed(() => {
  const lines = highlightedLines.value;
  if (lines.length === 0) {
    return [{ lineNumber: 1, content: "<span></span>" }];
  }
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    content: line,
  }));
});

const editorHeight = computed(() => {
  const lineCount = visibleHighlightedLines.value.length;
  const calculatedHeight = lineCount * lineHeight + editorPadding;

  if (!props.code || lineCount === 0) {
    return minEditorHeight;
  }
  return `${Math.min(Math.max(calculatedHeight, parseInt(minEditorHeight)), parseInt(maxEditorHeight))}px`;
});

const toggleWarningMessage = () => {
  if (clickOpened.value) {
    showAlertMassage.value = false;
    clickOpened.value = false;
  } else {
    showAlertMassage.value = true;
    clickOpened.value = true;
  }
};

const onWarningMouseEnter = () => {
  if (!clickOpened.value) {
    showAlertMassage.value = true;
  }
};

const onWarningMouseLeave = () => {
  if (!clickOpened.value) {
    showAlertMassage.value = false;
  }
};

const onClickOutsideWarning = () => {
  if (clickOpened.value) {
    showAlertMassage.value = false;
    clickOpened.value = false;
  }
};

watch(
  () => props.showIntervalAlert,
  (newVal) => {
    showIntervalAlert.value = newVal;
  }
);
</script>

<style scoped>
.highlight-container {
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-input-border);
  display: flex;
  flex-direction: column;
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
  display: flex;
  align-items: flex-start;
}
#sql-editor {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  flex-grow: 1;
}

.line-number {
  height: v-bind(lineHeight + "px");
  line-height: v-bind(lineHeight + "px");
  padding: 0 10px;
  color: var(--vscode-disabledForeground);
  user-select: none;
  position: sticky;
  left: 0;
  white-space: nowrap;
  width: v-bind(lineNumberWidth + "px");
  flex-shrink: 0;
}
.line-content {
  line-height: v-bind(lineHeight + "px");
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow-x: visible;
  padding-right: 10px;
  flex-grow: 1;
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
  white-space: pre-wrap;
}

.regular-content {
  height: 100%;
  width: 100%;
  overflow: visible;
}

.warning-message-box {
  background-color: var(--vscode-input-background);
  backdrop-filter: blur(8px);
  font-family: var(--vscode-font-family);
}
</style>