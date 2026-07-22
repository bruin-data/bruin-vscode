<template>
  <hr v-if="widget.type === 'divider'" class="dac-divider" />
  <div v-else class="dac-widget" :class="`dac-widget-${widget.type}`">
    <div class="dac-widget-head">
      <div v-if="showTitle" class="dac-widget-title">{{ widget.name }}</div>
      <DacQueryInfo v-if="query" :query="query" class="dac-widget-info" />
    </div>

    <DacMetric v-if="widget.type === 'metric'" :widget="widget" :result="result" />
    <DacChart v-else-if="widget.type === 'chart'" :widget="widget" :result="result" />
    <DacTable v-else-if="widget.type === 'table'" :widget="widget" :result="result" />
    <DacText v-else-if="widget.type === 'text'" :widget="widget" />
    <template v-else-if="widget.type === 'image'">
      <img
        v-if="imageLoaded"
        :src="widget.src"
        :alt="widget.alt || widget.name"
        class="dac-image"
        referrerpolicy="no-referrer"
      />
      <button v-else type="button" class="dac-image-gate" @click="imageLoaded = true">
        <span class="codicon codicon-file-media"></span>
        <span>Load image from {{ imageHost }}</span>
      </button>
    </template>
    <div v-else class="dac-widget-unknown">
      Unsupported widget type: {{ widget.type }}
      <DacTable v-if="result" :widget="widget" :result="result" />
    </div>

    <div v-if="result && result.error" class="dac-widget-error">{{ result.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { DacWidget, DacWidgetResult } from "./types";
import DacMetric from "./DacMetric.vue";
import DacChart from "./DacChart.vue";
import DacTable from "./DacTable.vue";
import DacText from "./DacText.vue";
import DacQueryInfo from "./DacQueryInfo.vue";

const props = defineProps<{ widget: DacWidget; result?: DacWidgetResult }>();

// The metric renders its own label; text/image/divider don't need a header.
const showTitle = computed(() =>
  ["chart", "table"].includes(props.widget.type) && !!props.widget.name
);

const query = computed(() => props.result?.query?.trim() || "");

// Don't auto-fetch remote images: loading a remote URL on open would beacon
// the user's IP/UA to an author-controlled host. Data URIs are inert, so they
// render immediately; remote images require an explicit click.
const src = computed(() => props.widget.src ?? "");
const isRemote = computed(() => /^https?:\/\//i.test(src.value));
const imageLoaded = ref(!isRemote.value);
const imageHost = computed(() => {
  try {
    return new URL(src.value).host;
  } catch {
    return src.value;
  }
});
</script>

<style scoped>
.dac-widget {
  position: relative;
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
  border: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
  border-radius: 6px;
  padding: 12px 14px;
  height: 100%;
  box-sizing: border-box;
}
.dac-widget-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-height: 0;
}
.dac-widget-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 10px;
}
/* Reveal the query "i" only while the widget is hovered (matches dac):
   hidden by default → subtle on widget hover → full when the icon itself is hovered. */
.dac-widget-info {
  opacity: 0;
  transition: opacity 0.12s ease;
}
.dac-widget:hover .dac-widget-info,
.dac-widget:focus-within .dac-widget-info {
  opacity: 0.55;
}
.dac-widget:hover .dac-widget-info:hover,
.dac-widget:focus-within .dac-widget-info:focus {
  opacity: 1;
}
.dac-widget-text,
.dac-widget-image {
  border: none;
  background: transparent;
  padding: 4px 0;
}
.dac-image-gate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editorWidget-background, transparent);
  border: 1px dashed var(--vscode-editorWidget-border, var(--vscode-panel-border));
  border-radius: 4px;
  cursor: pointer;
}
.dac-image-gate:hover {
  color: var(--vscode-foreground);
  border-color: var(--vscode-focusBorder);
}
.dac-image {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
}
.dac-divider {
  grid-column: 1 / -1;
  border: none;
  border-top: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
  margin: 4px 0;
  width: 100%;
}
.dac-widget-unknown {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
.dac-widget-error {
  margin-top: 8px;
  font-size: 11px;
  color: var(--vscode-errorForeground);
  white-space: pre-wrap;
}
</style>
