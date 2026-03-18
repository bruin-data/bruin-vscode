<template>
  <div class="highlight-container rounded overflow-visible">
    <div
      class="header flex items-center justify-between  py-0.5 border-commandCenter-border shadow-sm"
    >
      <!-- Tab Navigation -->
      <div class="flex items-center gap-2">
        <button
          @click="activeTab = 'rendered'"
          :class="['tab-button', { active: activeTab === 'rendered' }]"
        >
          Rendered
        </button>
        <button
          @click="activeTab = 'raw'"
          :class="['tab-button', { active: activeTab === 'raw' }]"
        >
          Raw
        </button>
        <button
          @click="activeTab = 'ddl'"
          :class="['tab-button', { active: activeTab === 'ddl' }]"
        >
          DDL
        </button>
      </div>
      <div class="flex items-center">
        <!-- BigQuery Cost Estimate (success and error) -->
        <div
          v-if="language === 'sql' && isBigQueryAsset && (bigqueryCostEstimate || bigqueryError)"
          class="flex items-center gap-1 relative z-50"
        >
          <!-- Success state -->
          <template v-if="!bigqueryError && bigqueryCostEstimate">
            <span
              :title="formatBytes(bigqueryMetadata.TotalBytesProcessed)"
              class="text-xs opacity-85 mr-1 text-[var(--vscode-foreground)] cursor-help"
              >{{ bigqueryCostEstimate }}</span
            >
          </template>

          <!-- Error state with hover -->
          <template v-else-if="bigqueryError">
            <span
              ref="errorIcon"
              class="text-sm cursor-pointer"
              style="color: var(--vscode-notificationsErrorIcon-foreground)"
              @mouseenter="showCostError = true"
              @mouseleave="handleMouseLeave"
              @click="toggleErrorSticky"
              >$</span
            >

            <!-- Error tooltip -->
            <div
              v-if="showCostError"
              class="fixed bg-[var(--vscode-input-background)] border border-[var(--vscode-commandCenter-border)] rounded px-3 py-2 shadow-lg"
              :style="tooltipPosition"
              @mouseenter="showCostError = true"
              @mouseleave="handleTooltipMouseLeave"
            >
              <div class="flex items-start justify-between gap-2">
                <span
                  class="text-xs text-[var(--vscode-notificationsErrorIcon-foreground)] break-words flex-1 select-text"
                  >{{ bigqueryError }}</span
                >
                <button
                  v-if="isErrorSticky"
                  @click="closeError"
                  class="p-1 hover:bg-[var(--vscode-list-hoverBackground)] rounded text-[var(--vscode-foreground)] opacity-70 hover:opacity-100 flex-shrink-0"
                  title="Close"
                >
                  <span class="codicon codicon-close text-xs"></span>
                </button>
              </div>
            </div>
          </template>
        </div>

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
      </div>
    </div>
    <!-- Code Editor -->
    <div id="sql-editor" class="code-container pb-0">
      <div class="copy-button-wrapper">
        <vscode-button
          v-if="activeTab === 'raw' && rawQuerySuccess"
          @click="runRawQueryInPreview"
          appearance="icon"
          class="copy-button mr-1"
          title="Run in Query Preview"
        >
          <span class="codicon codicon-play text-xs" aria-hidden="true"></span>
        </vscode-button>
        <vscode-button
          @click="copyToClipboard"
          appearance="icon"
          :disabled="!currentCode"
          class="copy-button"
        >
          <span class="codicon codicon-copy text-xs" v-show="!copied" aria-hidden="true" />
          <span v-if="copied" class="codicon codicon-check text-xs"></span>
        </vscode-button>
      </div>
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
import { ref, defineProps, computed, watch, onMounted, onBeforeUnmount } from "vue";
import "highlight.js/styles/default.css";
import hljs from "highlight.js/lib/core";
import { DynamicScroller, DynamicScrollerItem } from "vue3-virtual-scroller";
import "vue3-virtual-scroller/dist/vue3-virtual-scroller.css";
import { formatBytes, calculateBigQueryCost } from "@/utilities/helper";
import { vscode } from "@/utilities/vscode";

const props = defineProps({
  code: String | undefined,
  language: "sql" | "python" | "yaml",
  copied: Boolean,
  showIntervalAlert: Boolean,
  assetType: {
    type: String,
    default: null,
  },
  bigqueryMetadata: {
    type: Object,
    default: null,
  },
  bigqueryError: {
    type: String,
    default: null,
  },
});

const activeTab = ref('rendered');
const ddlContent = ref('');
const ddlLoading = ref(false);
const rawQueryContent = ref('');
const rawQueryLoading = ref(false);
const rawQuerySuccess = ref(false);
const showIntervalAlert = ref(props.showIntervalAlert);
const showAlertMassage = ref(false);
const copied = ref(false);
const clickOpened = ref(false);
const showCostError = ref(false);
const isErrorSticky = ref(false);
const errorIcon = ref(null);

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
  navigator.clipboard.writeText(currentCode.value);
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
  return 20 + digits * 8;
});

const shouldUseVirtualScroller = computed(() => {
  return visibleHighlightedLines.value.length > 50;
});

const currentCode = computed(() => {
  if (activeTab.value === 'ddl') {
    // Show existing content while loading, only show loading message if no content yet
    if (ddlLoading.value && !ddlContent.value) {
      return '-- Loading DDL...';
    }
    return ddlContent.value || '-- Loading DDL...';
  }
  if (activeTab.value === 'raw') {
    // Show existing content while loading, only show loading message if no content yet
    if (rawQueryLoading.value && !rawQueryContent.value) {
      return '-- Loading raw query...';
    }
    return rawQueryContent.value || '-- Loading raw query...';
  }
  return props.code;
});

const highlightedLines = computed(() => {
  if (!currentCode.value) return [""];
  const highlighted = hljs.highlight(currentCode.value, { language: props.language }).value;
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

const isBigQueryAsset = computed(() => {
  return props.assetType && props.assetType.startsWith('bq');
});

const bigqueryCostEstimate = computed(() => {
  if (!props.bigqueryMetadata || props.bigqueryError) return null;
  return calculateBigQueryCost(props.bigqueryMetadata.TotalBytesProcessed);
});

const toggleErrorSticky = () => {
  isErrorSticky.value = !isErrorSticky.value;
  if (isErrorSticky.value) {
    showCostError.value = true;
  }
};

const handleMouseLeave = () => {
  if (!isErrorSticky.value) {
    showCostError.value = false;
  }
};

const handleTooltipMouseLeave = () => {
  if (!isErrorSticky.value) {
    showCostError.value = false;
  }
};

const closeError = () => {
  showCostError.value = false;
  isErrorSticky.value = false;
};

const tooltipPosition = computed(() => {
  if (!errorIcon.value) {
    return {
      position: "fixed",
      top: "50px",
      left: "50px",
      zIndex: 9999,
      maxWidth: "400px",
      minWidth: "250px",
    };
  }

  try {
    const rect = errorIcon.value.getBoundingClientRect();
    const tooltipWidth = 400; // max width of tooltip
    const viewportWidth = window.innerWidth;

    // Calculate left position to ensure tooltip stays within viewport
    // Position tooltip to the right of the icon, but if it would go off-screen, position it to the left
    let leftOffset = rect.right + 10; // Start to the right of the icon

    if (leftOffset + tooltipWidth > viewportWidth) {
      // If tooltip would go off-screen to the right, position it to the left of the icon
      leftOffset = Math.max(10, rect.left - tooltipWidth - 10);
    }

    return {
      position: "fixed",
      top: `${rect.top - 60}px`, // Position above the icon
      left: `${leftOffset}px`,
      zIndex: 9999,
      maxWidth: "400px",
      minWidth: "250px",
    };
  } catch (error) {
    return {
      position: "fixed",
      top: "50px",
      left: "50px",
      zIndex: 9999,
      maxWidth: "400px",
      minWidth: "250px",
    };
  }
});

// Function to request DDL from backend
const requestDdl = () => {
  console.log('Requesting DDL from backend');
  ddlLoading.value = true;

  vscode.postMessage({
    command: 'bruin.renderDdl'
  });
  console.log('DDL request sent to backend');
};

// Function to request raw query from backend
const requestRawQuery = () => {
  console.log('Requesting raw query from backend');
  rawQueryLoading.value = true;
  rawQuerySuccess.value = false;

  vscode.postMessage({
    command: 'bruin.renderRawQuery'
  });
  console.log('Raw query request sent to backend');
};

// Function to run raw query in Query Preview panel
const runRawQueryInPreview = () => {
  if (!rawQueryContent.value) {
    console.log('No raw query content to run');
    return;
  }

  console.log('Running raw query in preview panel');
  vscode.postMessage({
    command: 'bruin.runRawQueryInPreview',
    payload: {
      query: rawQueryContent.value
    }
  });
};

// Function to handle DDL response from backend
const handleDdlResponse = (response) => {
  console.log('Handling DDL response:', response);
  ddlLoading.value = false;
  if (response.status === 'success') {
    ddlContent.value = response.ddl || '-- No DDL content received';
    console.log('DDL content set:', ddlContent.value);
  } else {
    ddlContent.value = `-- Error generating DDL\n-- ${response.message || 'Unknown error'}`;
    console.error('DDL generation failed:', response.message);
  }
};

// Watch for tab changes to load DDL or raw query when needed
watch(activeTab, (newTab) => {
  if (newTab === 'ddl' && !ddlContent.value && !ddlLoading.value) {
    requestDdl();
  }
  if (newTab === 'raw' && !rawQuerySuccess.value && !rawQueryLoading.value) {
    requestRawQuery();
  }
});

// Handle raw query response from backend
const handleRawQueryResponse = (response) => {
  console.log('Handling raw query response:', response);
  rawQueryLoading.value = false;
  if (response.status === 'success') {
    rawQueryContent.value = response.query || '-- No query content received';
    rawQuerySuccess.value = true;
    console.log('Raw query content set:', rawQueryContent.value);
  } else {
    rawQueryContent.value = `-- Error getting raw query\n-- ${response.message || 'Unknown error'}`;
    rawQuerySuccess.value = false;
    console.error('Raw query fetch failed:', response.message);
  }
};

// Listen for DDL and raw query responses from the backend
const handleMessage = (event) => {
  if (!event || !event.data) return;
  const envelope = event.data;
  console.log('SqlEditor received message:', envelope);

  if (envelope.command === 'ddlResponse') {
    console.log('Processing DDL response:', envelope);
    handleDdlResponse(envelope);
  }

  if (envelope.command === 'rawQueryResponse') {
    console.log('Processing raw query response:', envelope);
    handleRawQueryResponse(envelope);
  }
};

// Setup message listeners
onMounted(() => {
  window.addEventListener('message', handleMessage);
  console.log('SqlEditor: Message listener added');
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
  console.log('SqlEditor: Message listener removed');
});

watch(
  () => props.showIntervalAlert,
  (newVal) => {
    showIntervalAlert.value = newVal;
  }
);

// Re-fetch DDL and raw query when source code changes (keep showing old content while loading)
watch(
  () => props.code,
  () => {
    // Re-fetch if currently viewing that tab (don't clear - keep showing old content)
    if (activeTab.value === 'ddl') {
      requestDdl();
    } else if (activeTab.value === 'raw') {
      requestRawQuery();
    } else {
      // Clear cache for tabs not currently visible so they refresh when switched to
      ddlContent.value = '';
      rawQueryContent.value = '';
      rawQuerySuccess.value = false;
    }
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
  background-color: var(--vscode-editor-background);
}

.copy-button-wrapper {
  position: sticky;
  top: 6px;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
  margin-right: 4px;
  height: 0;
  overflow: visible;
}

.copy-button {
  pointer-events: auto;
  color: var(--vscode-icon-foreground);
  background-color: var(--vscode-sideBar-background);
  border: 1px solid var(--vscode-input-border);
  cursor: pointer;
}

.copy-button:hover {
  background-color: var(--vscode-list-hoverBackground);
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

.tab-button {
  padding: 4px 8px 4px 0;
  background: transparent;
  border: none;
  color: var(--vscode-disabledForeground);
  font-size: 12px;
  font-family: var(--vscode-font-family);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--vscode-foreground);
}

.tab-button.active {
  color: var(--vscode-foreground);
  position: relative;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: calc((var(--design-unit) / 4) * 1px);
  background: var(--panel-tab-active-foreground);
  border-radius: calc(var(--corner-radius) * 1px);
}

</style>
