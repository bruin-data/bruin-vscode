<template>
  <div v-if="isOpen" class="mt-2 flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <span class="codicon codicon-history text-xs text-editor-fg opacity-70"></span>
        <span class="text-xs text-editor-fg opacity-70">Backfill</span>
      </div>
      <button @click="$emit('close')" class="text-editor-fg opacity-50 hover:opacity-100" title="Close">
        <span class="codicon codicon-close text-xs"></span>
      </button>
    </div>

    <div class="border border-commandCenter-border rounded bg-sideBar-bg p-2 flex flex-col gap-2">
      <!-- Controls row: granularity + stop-on-failure -->
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-1.5">
          <span class="text-2xs text-editor-fg opacity-70">Chunk by</span>
          <vscode-dropdown v-model="granularity" class="min-w-[90px]">
            <vscode-option v-for="g in granularities" :key="g" :value="g">{{ g }}</vscode-option>
          </vscode-dropdown>
        </div>
        <vscode-checkbox :checked="stopOnFailure" @change="stopOnFailure = ($event.target as any).checked"
          class="text-2xs">
          Stop on first failure
        </vscode-checkbox>
      </div>

      <!-- Summary line -->
      <div class="text-2xs text-editor-fg opacity-70">
        <template v-if="chunks.length > 0">
          <span class="font-mono text-editor-fg opacity-100">{{ chunks.length }}</span>
          run{{ chunks.length === 1 ? "" : "s" }} from
          <span class="font-mono">{{ formatBoundary(chunks[0].start) }}</span>
          to
          <span class="font-mono">{{ formatBoundary(chunks[chunks.length - 1].end) }}</span>
        </template>
        <template v-else>
          <span class="text-errorForeground">No chunks — check that End Date is after Start Date.</span>
        </template>
      </div>

      <!-- Truncation warning -->
      <div v-if="truncated" class="text-2xs text-notificationsWarningIcon-fg flex items-start gap-1">
        <span class="codicon codicon-warning text-2xs mt-0.5"></span>
        <span>Range is large — limited to the first {{ chunks.length }} chunks. Narrow the range or use a
          coarser granularity to cover it all.</span>
      </div>

      <!-- create+replace warning: backfill would just overwrite the table -->
      <div v-if="isOverwriteStrategy"
        class="text-2xs text-notificationsWarningIcon-fg flex items-start gap-1">
        <span class="codicon codicon-warning text-2xs mt-0.5"></span>
        <span>This asset uses <span class="font-mono">create+replace</span> — each chunk overwrites the whole
          table, so only the last window would survive. Backfill suits incremental strategies
          (<span class="font-mono">merge</span> / <span class="font-mono">delete+insert</span> /
          <span class="font-mono">time_interval</span>).</span>
      </div>

      <!-- Informational notes about flags backfill adjusts -->
      <ul v-if="notes.length > 0" class="text-2xs text-editor-fg opacity-60 flex flex-col gap-0.5 list-none m-0 p-0">
        <li v-for="(note, i) in notes" :key="i" class="flex items-start gap-1">
          <span class="codicon codicon-info text-2xs mt-0.5"></span>
          <span>{{ note }}</span>
        </li>
      </ul>

      <!-- Chunk preview -->
      <div v-if="chunks.length > 0"
        class="border border-commandCenter-border rounded bg-editor-bg max-h-36 overflow-y-auto">
        <div v-for="(chunk, index) in previewChunks" :key="index"
          class="flex items-center gap-2 px-2 py-1 text-2xs border-b border-commandCenter-border last:border-b-0">
          <span class="text-editor-fg opacity-40 w-6 flex-shrink-0 text-right">{{ index + 1 }}</span>
          <span class="font-mono text-editor-fg">{{ formatBoundary(chunk.start) }}</span>
          <span class="codicon codicon-arrow-right text-2xs opacity-50"></span>
          <span class="font-mono text-editor-fg">{{ formatBoundary(chunk.end) }}</span>
        </div>
        <div v-if="chunks.length > previewLimit"
          class="px-2 py-1 text-2xs text-editor-fg opacity-50 italic">
          +{{ chunks.length - previewLimit }} more
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 pt-1">
        <button @click="$emit('close')"
          class="text-2xs px-2 py-1 rounded text-editor-fg opacity-70 hover:opacity-100 hover:bg-list-hoverBackground">
          Cancel
        </button>
        <button @click="run" :disabled="chunks.length === 0"
          class="text-2xs px-2 py-1 rounded bg-editor-button-bg text-editor-button-fg hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
          <span class="codicon codicon-play text-2xs"></span>
          Run backfill ({{ chunks.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { DateTime } from "luxon";
import {
  buildBackfillChunks,
  type BackfillGranularity,
  type BackfillChunk,
} from "@/utilities/helper";

const props = defineProps<{
  isOpen: boolean;
  startDate: string;
  endDate: string;
  schedule?: string;
  fullRefreshChecked?: boolean;
  sensorModeActive?: boolean;
  materializationStrategy?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "run", payload: { chunks: BackfillChunk[]; stopOnFailure: boolean }): void;
}>();

const granularities: BackfillGranularity[] = ["hourly", "daily", "weekly", "monthly"];
const previewLimit = 50;

// Default the granularity to the asset's schedule when it maps cleanly.
const defaultGranularity = (): BackfillGranularity => {
  const s = (props.schedule || "").toLowerCase();
  if (s === "hourly") return "hourly";
  if (s === "weekly") return "weekly";
  if (s === "monthly") return "monthly";
  return "daily";
};

const granularity = ref<BackfillGranularity>(defaultGranularity());
const stopOnFailure = ref(true);

// Re-seed granularity whenever the dialog is (re)opened.
watch(
  () => props.isOpen,
  (open) => {
    if (open) granularity.value = defaultGranularity();
  }
);

const result = computed(() =>
  buildBackfillChunks(props.startDate, props.endDate, granularity.value)
);
const chunks = computed(() => result.value.chunks);
const truncated = computed(() => result.value.truncated);
const previewChunks = computed(() => chunks.value.slice(0, previewLimit));

const normalizedStrategy = computed(() =>
  (props.materializationStrategy || "").toLowerCase().replace(/[\s_]/g, "")
);
const isOverwriteStrategy = computed(() => normalizedStrategy.value === "create+replace");
const isAppendStrategy = computed(() => normalizedStrategy.value === "append");

// Notes explaining the flag adjustments backfill makes (full-refresh dropped,
// sensors skipped, append duplicates on re-run).
const notes = computed<string[]>(() => {
  const out: string[] = [];
  if (props.fullRefreshChecked) {
    out.push("Full-refresh is ignored for backfill — each chunk runs its own window.");
  }
  if (props.sensorModeActive) {
    out.push("Sensors are skipped for backfill (--sensor-mode skip).");
  }
  if (isAppendStrategy.value) {
    out.push("append accumulates rows — re-running an already-loaded window will duplicate it.");
  }
  return out;
});

const formatBoundary = (iso: string): string => {
  const dt = DateTime.fromISO(iso, { zone: "utc" });
  return dt.isValid ? dt.toFormat("yyyy-MM-dd HH:mm") : iso;
};

const run = () => {
  if (chunks.value.length === 0) return;
  emit("run", { chunks: chunks.value, stopOnFailure: stopOnFailure.value });
};
</script>
