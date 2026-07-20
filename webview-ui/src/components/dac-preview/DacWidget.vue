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
    <img
      v-else-if="widget.type === 'image'"
      :src="widget.src"
      :alt="widget.alt || widget.name"
      class="dac-image"
    />
    <div v-else class="dac-widget-unknown">
      Unsupported widget type: {{ widget.type }}
      <DacTable v-if="result" :widget="widget" :result="result" />
    </div>

    <div v-if="result && result.error" class="dac-widget-error">{{ result.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
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
