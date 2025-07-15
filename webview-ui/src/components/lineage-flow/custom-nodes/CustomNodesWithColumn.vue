<template>
  <div
    class="custom-node-with-column"
    :class="{ 'focus-asset': data?.asset?.isFocusAsset }"
    @click="onNodeClick"
  >
    <!-- Node Header -->
    <div class="node-header">
      <div class="node-info">
        <div class="node-name">{{ data.label }}</div>
        <div class="node-type">{{ data?.asset?.type || 'unknown' }}</div>
      </div>
      
      <!-- Expand/Collapse Button for Columns -->
      <button 
        v-if="hasColumns"
        @click.stop="toggleColumnsExpanded"
        class="columns-toggle-btn"
        :class="{ 'expanded': showColumns }"
      >
        <ChevronDownIcon class="w-4 h-4" />
      </button>
    </div>

    <!-- Columns Section -->
    <div v-if="showColumns && hasColumns" class="columns-section">
      <div class="columns-header">
        <span class="columns-title">Columns ({{ columns.length }})</span>
      </div>
      
      <div class="columns-list">
        <div 
          v-for="column in visibleColumns" 
          :key="column.name"
          class="column-item"
          :class="{ 
            'has-lineage': hasColumnLineage(column.name),
            'highlight-column': highlightedColumns.includes(column.name)
          }"
        >
          <div class="column-info">
            <span class="column-name">{{ column.name }}</span>
            <span class="column-type">{{ column.type }}</span>
          </div>
          
          <!-- Column lineage indicator -->
          <div v-if="hasColumnLineage(column.name)" class="column-lineage-indicator">
            <ArrowRightIcon class="w-3 h-3" />
          </div>
        </div>
      </div>
      
      <!-- Show more/less for large column lists -->
      <div v-if="columns.length > maxVisibleColumns" class="columns-pagination">
        <button 
          @click.stop="toggleShowAllColumns"
          class="show-more-btn"
        >
          {{ showAllColumns ? 'Show Less' : `Show All (${columns.length})` }}
        </button>
      </div>
    </div>

    <!-- Asset Connection Handles -->
    <Handle
      id="upstream"
      type="target"
      :position="Position.Left"
      class="handle-upstream opacity-0"
    />
    
    <Handle
      id="downstream"
      type="source"
      :position="Position.Right"
      class="handle-downstream opacity-0"
    />

    <!-- Upstream/Downstream Expand Buttons -->
    <div
      v-if="showUpstreamIcon"
      class="expand-icon upstream-icon"
      @click.stop="onAddUpstream"
    >
      <PlusIcon class="w-4 h-4" />
    </div>

    <div
      v-if="showDownstreamIcon"
      class="expand-icon downstream-icon"
      @click.stop="onAddDownstream"
    >
      <PlusIcon class="w-4 h-4" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, defineEmits } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { PlusIcon, ChevronDownIcon, ArrowRightIcon } from "@heroicons/vue/24/outline";
import type { BruinNodeProps, ColumnInfo, ColumnLineage } from "@/types";

const props = defineProps<{
  data: BruinNodeProps["data"];
  selectedNodeId?: string | null;
  expandedNodes?: { [key: string]: boolean };
  showExpandButtons?: boolean;
}>();

const emit = defineEmits<{
  (e: 'node-click', nodeId: string): void;
  (e: 'add-upstream', nodeId: string): void;
  (e: 'add-downstream', nodeId: string): void;
  (e: 'toggle-node-expand', nodeId: string): void;
}>();

// Column display state
const showColumns = ref(false);
const showAllColumns = ref(false);
const maxVisibleColumns = 5;
const highlightedColumns = ref<string[]>([]);

// Computed properties
const columns = computed(() => props.data?.columns || props.data?.asset?.columns || []);
const columnLineage = computed(() => props.data?.columnLineage || props.data?.asset?.columnLineage || []);
const hasColumns = computed(() => columns.value.length > 0);

const visibleColumns = computed(() => {
  if (showAllColumns.value || columns.value.length <= maxVisibleColumns) {
    return columns.value;
  }
  return columns.value.slice(0, maxVisibleColumns);
});

const showUpstreamIcon = computed(() => {
  return props.showExpandButtons && props.data?.hasUpstreamForClicking;
});

const showDownstreamIcon = computed(() => {
  return props.showExpandButtons && props.data?.hasDownstreamForClicking;
});

// Methods
const toggleColumnsExpanded = () => {
  showColumns.value = !showColumns.value;
};

const toggleShowAllColumns = () => {
  showAllColumns.value = !showAllColumns.value;
};

const hasColumnLineage = (columnName: string): boolean => {
  return columnLineage.value.some((lineage: ColumnLineage) => lineage.column === columnName);
};

const onNodeClick = () => {
  if (props.data?.asset?.name) {
    emit('node-click', props.data.asset.name);
  }
};

const onAddUpstream = () => {
  if (props.data?.asset?.name) {
    emit('add-upstream', props.data.asset.name);
  }
};

const onAddDownstream = () => {
  if (props.data?.asset?.name) {
    emit('add-downstream', props.data.asset.name);
  }
};
</script>

<style scoped>
.custom-node-with-column {
  @apply relative bg-editor-bg border border-notificationCenter-border rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-w-56 max-w-80;
}

.custom-node-with-column.focus-asset {
  @apply border-accent ring-2 ring-accent/20;
}

.node-header {
  @apply flex items-center justify-between p-3 border-b border-notificationCenter-border;
}

.node-info {
  @apply flex-1;
}

.node-name {
  @apply text-sm font-medium text-editor-fg truncate;
}

.node-type {
  @apply text-xs text-foreground opacity-70 mt-1;
}

.columns-toggle-btn {
  @apply p-1 rounded hover:bg-editor-button-hover-bg transition-colors text-foreground;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.columns-toggle-btn.expanded {
  transform: rotate(180deg);
}

.columns-section {
  @apply border-t border-notificationCenter-border;
}

.columns-header {
  @apply px-3 py-2 bg-editor-bg border-b border-notificationCenter-border;
}

.columns-title {
  @apply text-xs font-medium text-foreground uppercase tracking-wide;
}

.columns-list {
  @apply max-h-48 overflow-y-auto;
}

.column-item {
  @apply flex items-center justify-between px-3 py-2 hover:bg-editor-button-hover-bg transition-colors;
}

.column-item.has-lineage {
  @apply bg-accent/5 border-l-2 border-accent;
}

.column-item.highlight-column {
  @apply bg-yellow-500/10 border-l-2 border-yellow-500;
}

.column-info {
  @apply flex flex-col flex-1;
}

.column-name {
  @apply text-sm text-editor-fg font-medium;
}

.column-type {
  @apply text-xs text-foreground opacity-70;
}

.column-lineage-indicator {
  @apply text-accent;
}

.columns-pagination {
  @apply px-3 py-2 border-t border-notificationCenter-border;
}

.show-more-btn {
  @apply text-xs text-accent hover:text-accent/80 transition-colors font-medium;
}

.expand-icon {
  @apply absolute bg-accent text-white rounded-full p-1 cursor-pointer hover:bg-accent/80 transition-colors shadow-md;
}

.upstream-icon {
  @apply -left-3 top-1/2 transform -translate-y-1/2;
}

.downstream-icon {
  @apply -right-3 top-1/2 transform -translate-y-1/2;
}

.handle-upstream,
.handle-downstream {
  @apply w-3 h-3 border-2 border-editor-bg;
}
</style>
