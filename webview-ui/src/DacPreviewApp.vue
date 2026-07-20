<template>
  <div class="dac-app">
    <div v-if="errorMessage" class="dac-state dac-state-error">
      <div class="dac-state-title">Preview unavailable</div>
      <div class="dac-state-body">{{ errorMessage }}</div>
      <vscode-button appearance="secondary" @click="refresh">Retry</vscode-button>
    </div>

    <div v-else-if="!dashboard" class="dac-state">
      <span class="codicon codicon-loading codicon-modifier-spin"></span>
      <span>{{ loadingMessage || "Loading dashboard…" }}</span>
    </div>

    <DacDashboard
      v-else
      :dashboard="dashboard"
      :results="results"
      @refresh="refresh"
      @open-external="openExternal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { vscode } from "./utilities/vscode";
import DacDashboard from "@/components/dac-preview/DacDashboard.vue";
import type { DacDashboard as DacDashboardDef, DacWidgetResult } from "@/components/dac-preview/types";

const dashboard = ref<DacDashboardDef | null>(null);
const results = ref<Record<string, DacWidgetResult>>({});
const loadingMessage = ref<string>("");
const errorMessage = ref<string>("");

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "loading":
      loadingMessage.value = message.payload?.message ?? "";
      errorMessage.value = "";
      break;
    case "dashboard": {
      errorMessage.value = "";
      loadingMessage.value = "";
      const next = message.payload.dashboard;
      // Only clear results when switching to a *different* dashboard. For an
      // in-place reload (edit/save/refresh of the same dashboard) keep the
      // current results so Vue patches values in place instead of tearing the
      // whole view down and flashing empty.
      if (dashboard.value?.name !== next?.name) {
        results.value = {};
      }
      dashboard.value = next;
      break;
    }
    case "data":
      // Merge so widgets update in place; unchanged widgets keep their values.
      results.value = { ...results.value, ...(message.payload.data?.widgets ?? {}) };
      break;
    case "error":
      errorMessage.value = message.payload?.message ?? "Something went wrong.";
      break;
  }
};

const refresh = () => vscode.postMessage({ command: "refresh" });
const openExternal = () => vscode.postMessage({ command: "openExternal" });

onMounted(() => {
  window.addEventListener("message", handleMessage);
  vscode.postMessage({ command: "ready" });
});
onUnmounted(() => window.removeEventListener("message", handleMessage));
</script>

<style>
body {
  padding: 0;
  margin: 0;
}
.dac-app {
  font-family: var(--vscode-font-family);
  color: var(--vscode-foreground);
}
.dac-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}
.dac-state-error {
  flex-direction: column;
  align-items: flex-start;
}
.dac-state-title {
  font-weight: 600;
  color: var(--vscode-errorForeground);
}
.dac-state-body {
  white-space: pre-wrap;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 12px;
}
</style>
