<template>
  <div class="dac-table-wrap">
    <table class="dac-table">
      <thead>
        <tr>
          <th v-for="(col, i) in headers" :key="i">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in bodyRows" :key="ri">
          <td v-for="(col, ci) in headers" :key="ci">
            {{ formatValue(row[col.index], col.format) }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="!bodyRows.length" class="dac-table-empty">No rows</div>
    <div v-if="truncated" class="dac-table-note">Showing first {{ MAX_ROWS }} rows</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DacWidget, DacWidgetResult } from "./types";
import { columnIndex, formatValue } from "./format";

const MAX_ROWS = 100;
const props = defineProps<{ widget: DacWidget; result?: DacWidgetResult }>();

interface Header {
  label: string;
  index: number;
  format?: string;
}

const headers = computed<Header[]>(() => {
  const cols = props.result?.columns ?? [];
  // Prefer the widget's declared columns (label/format), fall back to result columns.
  if (props.widget.columns && props.widget.columns.length) {
    return props.widget.columns.map((c) => ({
      label: c.label || c.name,
      index: columnIndex(cols, c.name),
      format: c.format,
    }));
  }
  return cols.map((c, i) => ({ label: c.name, index: i }));
});

const bodyRows = computed(() => (props.result?.rows ?? []).slice(0, MAX_ROWS));
const truncated = computed(() => (props.result?.rows.length ?? 0) > MAX_ROWS);
</script>

<style scoped>
.dac-table-wrap {
  overflow: auto;
  max-height: 320px;
}
.dac-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.dac-table th,
.dac-table td {
  text-align: left;
  padding: 5px 10px;
  border-bottom: 1px solid var(--vscode-editorWidget-border, var(--vscode-panel-border));
  white-space: nowrap;
}
.dac-table th {
  position: sticky;
  top: 0;
  background: var(--vscode-editor-background);
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
}
.dac-table tbody tr:hover {
  background: var(--vscode-list-hoverBackground);
}
.dac-table-empty,
.dac-table-note {
  padding: 8px 4px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}
</style>
