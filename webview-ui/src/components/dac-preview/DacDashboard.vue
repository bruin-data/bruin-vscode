<template>
  <div class="dac-dashboard">
    <header class="dac-header">
      <div class="dac-header-main">
        <h1 class="dac-title">{{ dashboard.name }}</h1>
        <p v-if="dashboard.description" class="dac-desc">{{ dashboard.description }}</p>
      </div>
      <div class="dac-actions">
        <vscode-button appearance="secondary" @click="$emit('refresh')" title="Refresh data">
          <span class="codicon codicon-refresh"></span>
        </vscode-button>
        <vscode-button appearance="secondary" @click="$emit('open-external')" title="Open full dashboard in browser">
          Open in Browser
        </vscode-button>
      </div>
    </header>

    <div v-if="metaLine" class="dac-meta">{{ metaLine }}</div>

    <div v-if="dashboard.filters && dashboard.filters.length" class="dac-filters">
      <span v-for="f in dashboard.filters" :key="f.name" class="dac-filter-chip">
        <span class="dac-filter-name">{{ f.name }}</span>
        <span v-if="defaultLabel(f)" class="dac-filter-value">{{ defaultLabel(f) }}</span>
      </span>
    </div>

    <section v-for="(row, ri) in dashboard.rows" :key="ri" class="dac-row">
      <div v-if="row.tab" class="dac-row-tab">{{ row.tab }}</div>
      <div class="dac-grid">
        <div
          v-for="(w, wi) in row.widgets"
          :key="wi"
          class="dac-cell"
          :style="w.type === 'divider' ? { gridColumn: '1 / -1' } : { gridColumn: `span ${span(w.col)}` }"
        >
          <DacWidget :widget="w" :result="results[widgetId(ri, wi)]" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DacDashboard, DacFilter, DacWidgetResult } from "./types";
import { widgetId } from "./types";
import DacWidget from "./DacWidget.vue";

const props = defineProps<{
  dashboard: DacDashboard;
  results: Record<string, DacWidgetResult>;
}>();
defineEmits<{ (e: "refresh"): void; (e: "open-external"): void }>();

function span(col?: number): number {
  if (!col || col < 1) {
    return 12;
  }
  return Math.min(col, 12);
}

function defaultLabel(f: DacFilter): string {
  if (f.default === undefined || f.default === null) {
    return "";
  }
  if (typeof f.default === "object") {
    return "";
  }
  return String(f.default);
}

const metaLine = computed(() => {
  const parts: string[] = [];
  if (props.dashboard.connection) {
    parts.push(props.dashboard.connection);
  }
  const widgetCount = props.dashboard.rows.reduce((n, r) => n + r.widgets.length, 0);
  parts.push(`${widgetCount} widget${widgetCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
});
</script>

<style scoped>
.dac-dashboard {
  padding: 16px 18px 32px;
  max-width: 1100px;
  margin: 0 auto;
}
.dac-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.dac-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--vscode-foreground);
}
.dac-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}
.dac-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.dac-meta {
  margin-top: 6px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}
.dac-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 4px;
}
.dac-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}
.dac-filter-name {
  opacity: 0.75;
}
.dac-filter-value {
  font-weight: 600;
}
.dac-row {
  margin-top: 16px;
}
.dac-row-tab {
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 8px;
}
.dac-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
  align-items: stretch;
}
.dac-cell {
  min-width: 0;
}
@media (max-width: 640px) {
  .dac-cell {
    grid-column: 1 / -1 !important;
  }
}
</style>
