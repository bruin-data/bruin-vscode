<template>
  <div class="flex flex-col h-full p-2 text-[12px] text-editor-fg bg-editor-bg">
    <div class="mb-3">
      <div class="flex items-center justify-end">
        <div class="flex items-center gap-2">
          <vscode-dropdown
            v-if="pipelines.length > 1"
            v-model="selectedPipeline"
            @change="filterByPipeline"
            class="min-w-[120px]"
          >
            <vscode-option value="">All Pipelines</vscode-option>
            <vscode-option v-for="p in pipelines" :key="p" :value="p">{{ p }}</vscode-option>
          </vscode-dropdown>
          <vscode-button
            appearance="icon"
            @click="refreshRuns"
            :disabled="isLoading"
            title="Refresh"
          >
            <span
              class="codicon codicon-refresh"
              :class="{ 'animate-spin': isLoading }"
            ></span>
          </vscode-button>
        </div>
      </div>
    </div>

    <div
      v-if="isLoading && runs.length === 0"
      class="flex flex-col items-center justify-center gap-2 px-4 py-8 text-xs text-descriptionForeground"
    >
      <span class="codicon codicon-loading animate-spin text-lg"></span>
      <span>Loading runs...</span>
    </div>

    <div
      v-else-if="runs.length === 0"
      class="flex flex-col items-center justify-center gap-2 px-4 py-8 text-xs text-descriptionForeground"
    >
      <span class="codicon codicon-history text-3xl opacity-50"></span>
      <p class="text-sm text-editor-fg">No runs found</p>
      <p class="text-[11px] opacity-70">Run a pipeline to see history here</p>
    </div>

    <div v-else class="flex-1 overflow-auto">
      <table class="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th class="w-7 border-b border-panel-border sticky top-0 bg-editor-bg"></th>
            <th class="w-[90px] text-left px-2 py-2 font-medium text-descriptionForeground border-b border-panel-border sticky top-0 bg-editor-bg whitespace-nowrap">
              Run ID
            </th>
            <th class="min-w-[80px] text-left px-2 py-2 font-medium text-descriptionForeground border-b border-panel-border sticky top-0 bg-editor-bg whitespace-nowrap">
              Pipeline
            </th>
            <th class="w-[70px] text-left px-2 py-2 font-medium text-descriptionForeground border-b border-panel-border sticky top-0 bg-editor-bg whitespace-nowrap">
              Assets
            </th>
            <th class="min-w-[60px] text-left px-2 py-2 font-medium text-descriptionForeground border-b border-panel-border sticky top-0 bg-editor-bg whitespace-nowrap">
              Flags
            </th>
            <th class="w-[60px] text-left px-2 py-2 font-medium text-descriptionForeground border-b border-panel-border sticky top-0 bg-editor-bg whitespace-nowrap">
              Time
            </th>
            <th class="w-6"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(run, index) in runs" :key="run.runId">
            <tr
              :class="[
                'cursor-pointer border-b border-panel-border transition-colors',
                expandedRun === run.runId
                  ? 'bg-[var(--vscode-list-activeSelectionBackground)]'
                  : [
                       'hover:bg-[var(--vscode-list-activeSelectionBackground)]',
                       index % 2 === 0 ? 'bg-editorWidget-bg' : ''
                    ]
              ]"
              @click="toggleExpand(run)"
            >
              <td class="w-7 px-1">
                <span
                  class="flex items-center justify-center w-[16px] h-[16px] rounded-full"
                  :class="run.status === 'succeeded'
                    ? 'bg-[--vscode-testing-iconPassed] text-editor-bg'
                    : 'bg-[--vscode-testing-iconFailed] text-editor-bg'"
                >
                  <span class="codicon text-[10px]" :class="statusIcon(run.status)"></span>
                </span>
              </td>
              <td class="w-[90px] px-2 py-2">
                <span class="font-mono text-[10px] text-descriptionForeground">{{ run.runId }}</span>
              </td>
              <td class="min-w-[80px] px-2 py-2">
                <span class="font-medium block max-w-[120px] truncate">{{ run.pipeline }}</span>
              </td>
              <td class="w-[70px] px-2 py-2">
                <span class="flex items-center gap-1">
                  <span
                    v-if="run.succeededAssets > 0"
                    class="font-semibold text-[--vscode-testing-iconPassed]"
                  >
                    {{ run.succeededAssets }}
                  </span>
                  <span
                    v-if="run.succeededAssets > 0 && run.failedAssets > 0"
                    class="text-descriptionForeground"
                  >/</span>
                  <span
                    v-if="run.failedAssets > 0"
                    class="font-semibold text-[--vscode-testing-iconFailed]"
                  >
                    {{ run.failedAssets }}
                  </span>
                  <span class="text-descriptionForeground">({{ run.totalAssets }})</span>
                </span>
              </td>
              <td class="min-w-[60px] px-2 py-2">
                <div class="flex flex-wrap gap-1">
                  <vscode-badge
                    v-for="flag in (run.flags || []).slice(0, 2)"
                    :key="flag"
                  >
                    {{ flag }}
                  </vscode-badge>
                  <span
                    v-if="(run.flags || []).length > 2"
                    class="inline-block rounded px-1 py-0.5 text-[9px] bg-badge-background text-badge-foreground"
                    :title="(run.flags || []).slice(2).join(', ')"
                  >
                    +{{ (run.flags || []).length - 2 }}
                  </span>
                </div>
              </td>
              <td class="w-[60px] px-2 py-2">
                <span class="text-descriptionForeground text-[10px]" :title="run.timestamp">
                  {{ formatTime(run.timestamp) }}
                </span>
              </td>
              <td class="w-6 px-1 text-right">
                <span
                  class="codicon text-[12px] text-descriptionForeground"
                  :class="expandedRun === run.runId ? 'codicon-chevron-up' : 'codicon-chevron-down'"
                ></span>
              </td>
            </tr>
            <tr v-if="expandedRun === run.runId" class="expanded-details-row">
              <td colspan="7" class="p-0">
                <div class="mx-2 my-2 rounded border border-panel-border bg-sideBar-bg shadow-sm overflow-hidden">
                  <!-- Header bar -->
                  <div class="flex items-center justify-between px-3 py-1.5 bg-editor-bg border-b border-panel-border">
                    <span class="text-[10px] text-descriptionForeground font-medium uppercase tracking-wide">
                      Assets ({{ sortedAssets.length }})
                    </span>
                    <vscode-button
                      appearance="icon"
                      @click.stop="copyRunCommand(run.filePath)"
                      title="Copy run command"
                    >
                      <span class="codicon codicon-copy"></span>
                    </vscode-button>
                  </div>

                  <!-- Content -->
                  <div class="p-3" v-if="runDetails">
                    <!-- Assets - sorted: failed, succeeded, skipped -->
                    <div class="flex flex-wrap gap-1.5">
                      <div
                        v-for="asset in visibleAssets"
                        :key="asset.name"
                       class="inline-flex items-center gap-1 px-2 py-1 rounded border border-panel-border text-[11px] bg-editor-bg cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] transition-colors"
                        @click.stop="openAssetFile(asset.name)"
                        :title="`Click to open ${asset.name}`"
                      >
                        <span
                          class="codicon text-[12px]"
                          :class="assetStatusIconClass(asset.status)"
                        ></span>
                        <span class="truncate max-w-[150px]">{{ asset.name }}</span>
                      </div>
                    </div>

                    <!-- Show more/less -->
                    <div v-if="sortedAssets.length > ASSETS_LIMIT" class="mt-3">
                      <button
                        class="text-[11px] text-[--vscode-textLink-foreground] hover:underline cursor-pointer bg-transparent border-none p-0"
                        @click.stop="showAllAssets = !showAllAssets"
                      >
                        {{ showAllAssets ? 'Show less' : `Show ${sortedAssets.length - ASSETS_LIMIT} more` }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="py-6 text-center">
                    <span class="codicon codicon-loading animate-spin"></span>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { vscode } from "./utilities/vscode";

const ASSETS_LIMIT = 6;

interface AssetState {
  name: string;
  status: string;
}

interface RunParameters {
  downstream: boolean;
  fullRefresh: boolean;
  force: boolean;
  pushMetadata: boolean;
  tag: string;
  excludeTag: string;
  environment: string;
  startDate: string;
  endDate: string;
  only: string[];
  applyIntervalModifiers: boolean;
}

interface RunDetails {
  state: AssetState[];
  parameters: RunParameters;
  metadata: any;
  timestamp: string;
  run_id: string;
}

interface RunSummary {
  runId: string;
  pipeline: string;
  timestamp: string;
  status: string;
  totalAssets: number;
  succeededAssets: number;
  failedAssets: number;
  environment: string;
  filePath: string;
  flags?: string[];
}

const runs = ref<RunSummary[]>([]);
const pipelines = ref<string[]>([]);
const selectedPipeline = ref("");
const expandedRun = ref<string | null>(null);
const runDetails = ref<RunDetails | null>(null);
const isLoading = ref(false);
const showAllAssets = ref(false);

// Sort assets: failed first, then succeeded, then skipped/other
const sortedAssets = computed(() => {
  if (!runDetails.value) return [];
  const assets = [...runDetails.value.state];
  return assets.sort((a, b) => {
    const order = { failed: 0, succeeded: 1 };
    const aOrder = order[a.status as keyof typeof order] ?? 2;
    const bOrder = order[b.status as keyof typeof order] ?? 2;
    return aOrder - bOrder;
  });
});

const visibleAssets = computed(() => {
  if (showAllAssets.value) return sortedAssets.value;
  return sortedAssets.value.slice(0, ASSETS_LIMIT);
});

const handleMessage = (event: MessageEvent) => {
  const message = event.data;
  switch (message.command) {
    case "runs-loaded":
      runs.value = message.payload.runs || [];
      pipelines.value = message.payload.pipelines || [];
      isLoading.value = false;
      break;
    case "run-details-loaded":
      runDetails.value = message.payload.details;
      break;
    case "new-run": {
      const newRun = message.payload.run;
      const idx = runs.value.findIndex((r) => r.runId === newRun.runId);
      if (idx >= 0) {
        runs.value[idx] = newRun;
      } else {
        runs.value.unshift(newRun);
      }
      break;
    }
  }
};

const refreshRuns = () => {
  isLoading.value = true;
  vscode.postMessage({ command: "bruin.refreshRuns" });
};

const filterByPipeline = () => {
  isLoading.value = true;
  vscode.postMessage({
    command: "bruin.filterByPipeline",
    payload: { pipeline: selectedPipeline.value },
  });
};

const toggleExpand = (run: RunSummary) => {
  if (expandedRun.value === run.runId) {
    expandedRun.value = null;
    runDetails.value = null;
    showAllAssets.value = false;
  } else {
    expandedRun.value = run.runId;
    showAllAssets.value = false;
    vscode.postMessage({
      command: "bruin.getRunDetails",
      payload: { filePath: run.filePath },
    });
  }
};

const openAssetFile = (assetName: string) => {
  const currentRun = runs.value.find((r) => r.runId === expandedRun.value);
  vscode.postMessage({
    command: "bruin.openAssetFile",
    payload: {
      assetName,
      pipeline: currentRun?.pipeline,
      filePath: currentRun?.filePath
    },
  });
};

const copyRunCommand = (filePath: string) => {
  if (!runDetails.value) return;
  vscode.postMessage({
    command: "bruin.copyRunCommand",
    payload: { filePath, parameters: runDetails.value.parameters },
  });
};

const statusIcon = (status: string) => {
  return status === "succeeded" ? "codicon-pass-filled" : "codicon-close";
};

const assetStatusIconClass = (status: string) => {
  if (status === "succeeded") {
    return "codicon-pass text-[--vscode-testing-iconPassed]";
  }
  if (status === "skipped") {
    return "codicon-circle-slash text-[--vscode-testing-iconSkipped]";
  }
  return "codicon-error text-[--vscode-testing-iconFailed]";
};


const formatTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return timestamp;
  }
};

onMounted(() => {
  window.addEventListener("message", handleMessage);
  refreshRuns();
});

onUnmounted(() => {
  window.removeEventListener("message", handleMessage);
});
</script>

<style>
body {
  padding: 0 !important;
  margin: 0 !important;
}
</style>
