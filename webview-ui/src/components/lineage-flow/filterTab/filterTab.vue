<template>
  <Panel position="top-right">
    <div
      v-if="!expandPanel"
      @click="expandPanel = !expandPanel"
      class="flex items-center p-2 gap-1 bg-transparent border border-notificationCenter-border rounded cursor-pointer hover:bg-editorWidget-bg transition-colors"
    >
      <FunnelIcon class="w-4 h-4 text-progressBar-bg" />
      <span class="text-[0.65rem] text-editor-fg">{{ filterLabel }}</span>
    </div>
    <div
      v-else
      class="bg-transparent hover:bg-editorWidget-bg border border-notificationCenter-border rounded"
    >
      <div
        class="flex items-center text-[0.65rem] justify-between border-b border-notificationCenter-border"
      >
        <div class="flex items-center gap-1">
          <FunnelIcon class="w-4 h-4 text-progressBar-bg" />
          <span class="text-[0.65rem] text-editor-fg uppercase p-1">view options</span>
        </div>
        <vscode-button appearance="icon" @click="expandPanel = false">
          <XMarkIcon class="w-4 h-4 text-progressBar-bg" />
        </vscode-button>
      </div>

      <!-- View Options -->
      <div class="view-options">
        <vscode-radio-group :value="currentViewType" orientation="vertical" class="radio-group">
          <!-- Full Pipeline option - always show -->
          <vscode-radio 
            value="pipeline" 
            class="radio-item"
            @click="(event) => { event.stopPropagation(); handlePipelineView(); }"
          >
            <span class="radio-label">Full Pipeline</span>
          </vscode-radio>
          
          <!-- Direct Dependencies - available in all views -->
          <vscode-radio value="direct" class="radio-item" @click="handleDirectFilter">
            <span class="radio-label text-editor-fg">Direct Dependencies</span>
          </vscode-radio>

          <!-- All Dependencies - available in all views -->
          <vscode-radio value="all" class="radio-item" @click="handleAllFilter">
            <div class="all-options">
              <span class="radio-label text-editor-fg">All Dependencies</span>
              <div class="toggle-buttons">
                <button
                  class="toggle-btn"
                  :class="{ active: expandAllUpstreams }"
                  @click.stop="toggleUpstream"
                >
                  U
                </button>
                <button
                  class="toggle-btn"
                  :class="{ active: expandAllDownstreams }"
                  @click.stop="toggleDownstream"
                >
                  D
                </button>
              </div>
            </div>
          </vscode-radio>

          <!-- Column Level option - always show -->
          <vscode-radio 
            value="column" 
            class="radio-item"
            @click="(event) => { event.stopPropagation(); handleColumnLevelLineage(); }"
          >
            <span class="radio-label text-editor-fg">Column Level Lineage</span>
          </vscode-radio>
        </vscode-radio-group>
      </div>
      
      <div class="flex justify-end px-2 pb-1">
        <vscode-link
          @click="handleReset"
          class="text-xs text-editor-fg hover:text-progressBar-bg transition-colorseset-link"
        >
          Reset
        </vscode-link>
      </div>
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { Panel } from "@vue-flow/core";
import { computed, ref } from "vue";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import { FunnelIcon } from "@heroicons/vue/24/outline";

// Props
const props = defineProps<{
  filterType: "direct" | "all";
  expandAllUpstreams: boolean;
  expandAllDownstreams: boolean;
  showPipelineView: boolean;
  showColumnView: boolean;
}>();

// Emits
const emit = defineEmits<{
  "update:filterType": [value: "direct" | "all"];
  "update:expandAllUpstreams": [value: boolean];
  "update:expandAllDownstreams": [value: boolean];
  "pipeline-view": [];
  "column-view": [];
  "asset-view": [];
  "reset": [];
}>();

// Local state
const expandPanel = ref(false);

// Computed
const filterLabel = computed(() => {
  if (props.showPipelineView) return "Pipeline View";
  if (props.showColumnView) return "Column Level Lineage";
  if (props.filterType === "direct") return "Direct Dependencies";
  if (props.expandAllUpstreams && props.expandAllDownstreams) return "All Dependencies";
  if (props.expandAllDownstreams) return "All Downstreams";
  return "All Upstreams";
});

const currentViewType = computed(() => {
  if (props.showPipelineView) return "pipeline";
  if (props.showColumnView) return "column";
  return props.filterType;
});

// Methods
const toggleUpstream = (event: Event) => {
  event.stopPropagation();
  if (props.filterType === "all") {
    emit("update:expandAllUpstreams", !props.expandAllUpstreams);
  }
};

const toggleDownstream = (event: Event) => {
  event.stopPropagation();
  if (props.filterType === "all") {
    emit("update:expandAllDownstreams", !props.expandAllDownstreams);
  }
};

const handleDirectFilter = (event: Event) => {
  event.stopPropagation();
  
  // If we're in Pipeline or Column view, navigate to Asset view first
  if (props.showPipelineView || props.showColumnView) {
    emit("asset-view");
  }
  
  emit("update:filterType", "direct");
  emit("update:expandAllUpstreams", false);
  emit("update:expandAllDownstreams", false);
};

const handleAllFilter = (event: Event) => {
  event.stopPropagation();
  
  // If we're in Pipeline or Column view, navigate to Asset view first
  if (props.showPipelineView || props.showColumnView) {
    emit("asset-view");
  }
  
  emit("update:filterType", "all");
  emit("update:expandAllUpstreams", true);
  emit("update:expandAllDownstreams", true);
};

const handleReset = (event: Event) => {
  event.stopPropagation();
  emit("reset");
};

const handlePipelineView = () => {
  emit("pipeline-view");
};

const handleColumnLevelLineage = () => {
  emit("column-view");
};
</script>

<style scoped>
/* Radio group styling */
.radio-group {
  @apply px-1;
}

.radio-label {
  @apply text-[0.65rem] font-normal;
}

/* Toggle buttons */
.all-options {
  @apply flex items-center justify-center w-full gap-2;
}

.toggle-buttons {
  @apply flex gap-1;
}

.toggle-btn {
  @apply w-5 h-5 text-center rounded-full border-2 border-notificationCenter-border bg-transparent 
         text-[0.5rem] font-medium flex items-center justify-center cursor-pointer
         transition-all duration-200;
}

.toggle-btn.active {
  @apply bg-progressBar-bg border-progressBar-bg text-editor-fg;
}
</style>
