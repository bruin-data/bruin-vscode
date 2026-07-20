<template>
  <div class="dac-metric">
    <div class="dac-metric-value">
      <span v-if="widget.prefix" class="dac-metric-affix">{{ widget.prefix }}</span>
      <span>{{ display }}</span>
      <span v-if="widget.suffix" class="dac-metric-affix">{{ widget.suffix }}</span>
    </div>
    <div class="dac-metric-label">{{ widget.name }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DacWidget, DacWidgetResult } from "./types";
import { columnIndex, formatValue } from "./format";

const props = defineProps<{ widget: DacWidget; result?: DacWidgetResult }>();

const display = computed(() => {
  const r = props.result;
  if (!r || !r.rows.length || !r.columns.length) {
    return "—";
  }
  const idxByColumn = columnIndex(r.columns, props.widget.column || props.widget.value);
  const idx = idxByColumn >= 0 ? idxByColumn : 0;
  return formatValue(r.rows[0][idx], props.widget.format);
});
</script>

<style scoped>
.dac-metric {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
}
.dac-metric-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--vscode-foreground);
}
.dac-metric-affix {
  color: var(--vscode-descriptionForeground);
  font-weight: 500;
}
.dac-metric-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
</style>
