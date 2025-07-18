<template>
  <div class="custom-node-wrapper">
    <div v-if="showExpandButtons">
      <div
        v-if="showUpstreamIcon"
        @click.stop="onAddUpstream"
        class="icon-wrapper left-icon bg-commandCenter-border"
        :class="{ invisible: !data?.hasUpstreamForClicking }"
        title="Show Upstreams"
      >
        <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
      </div>
    </div>

    <div class="node-content" :class="[assetClass, { expanded: showColumns }]" @click="onNodeClick">
      <div
        v-if="data.type === 'asset' || data?.asset"
        :class="assetHighlightClass"
      >
        <div class="flex justify-between" :class="selectedStatusStyle">
          <div class="flex items-center px-2 font-mono text-sm font-semibold space-x-1">
            <div
              v-if="status === 'running'"
              class="flex-none rounded-full p-0.5 animate-pulse bg-yellow-400"
            >
              <div class="h-1 w-1 rounded-full bg-yellow-500" />
            </div>
            <div v-else-if="status === 'failed'" class="flex-none rounded-full p-0.5 bg-red-500">
              <div class="h-1 w-1 rounded-full bg-red-600" />
            </div>
            <div>
              <p class="">{{ status || '' }}</p>
            </div>
          </div>
          <div
            class="text-center rounded-t px-2 font-mono text-sm truncate border-t border-white/20"
            :class="selectedStyle.label"
          >
            {{ data?.asset?.type || data.type || 'unknown' }}
          </div>
        </div>

        <div
          class="rounded-b font-mono py-1 text-left px-1 border border-white/20 cursor-pointer relative"
          :class="[selectedStyle.main, status ? '' : 'rounded-tl']"
          @click="handleNodeClick"
        >
          <div class="relative group flex items-center justify-between">
            <!-- Node Name with Expand Option -->
            <div class="dynamic-text flex-1" :style="{ fontSize: computedFontSize }" @click.stop="toggleExpand">
              {{ isExpanded ? label : truncatedLabel }}
            </div>
            
            <!-- Columns Toggle Button -->
            <button 
              v-if="hasColumns && !data?.asset?.isFocusAsset"
              @click.stop="toggleColumnsExpanded"
              class="columns-toggle-btn ml-2 text-xs opacity-60 hover:opacity-100 flex-shrink-0"
              :class="{ 'expanded': showColumns }"
              title="Toggle Columns"
            >
              <ChevronDownIcon class="w-3 h-3" />
            </button>
            
          </div>

          <!-- Handle positioning at header level -->
          <Handle
            v-if="assetHasDownstreams || assetHasUpstreams"
            type="source"
            class="opacity-0"
            :position="Position.Right"
            :style="{ top: '12px', right: '-6px' }"
          />
          <Handle
            v-if="assetHasUpstreams || assetHasDownstreams"
            type="target"
            class="opacity-0"
            :position="Position.Left"
            :style="{ top: '12px', left: '-6px' }"
          />

          <!-- Columns Section -->
          <div v-if="hasColumns && showColumns" class="mt-1 border-t border-white/20 pt-1">
            <div class="columns-list text-xs">
              <div 
                v-for="(column, index) in columns" 
                :key="column.name"
                class="column-item flex items-center justify-between py-0 px-0.5 rounded text-xs relative"
              >
                <div class="column-info flex items-center justify-between flex-1">
                  <span class="column-name font-medium" style="font-size: 8px;">{{ column.name }}</span>
                  <span class="column-type opacity-60" style="font-size: 9px;">{{ column.type }}</span>
                </div>
                
                <!-- Upstream handle (target) -->
                <Handle
                  :id="`${data?.asset?.name}-${column.name}-upstream`"
                  type="target"
                  class="column-handle upstream"
                  :position="Position.Left"
                  :style="{ 
                    top: '50%', 
                    left: '-6px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    background: '#10b981',
                    border: '1px solid #fff'
                  }"
                />
                
                <!-- Downstream handle (source) -->
                <Handle
                  :id="`${data?.asset?.name}-${column.name}-downstream`"
                  type="source"
                  class="column-handle downstream"
                  :position="Position.Right"
                  :style="{ 
                    top: '50%', 
                    right: '-6px',
                    transform: 'translateY(-50%)',
                    width: '8px',
                    height: '8px',
                    background: '#f59e0b',
                    border: '1px solid #fff'
                  }"
                />

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showExpandButtons">
      <div
        v-if="showDownstreamIcon"
        @click.stop="onAddDownstream"
        class="icon-wrapper right-icon bg-commandCenter-border"
        title="Show Downstreams"
      >
        <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, defineEmits } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { PlusIcon, ChevronDownIcon } from "@heroicons/vue/24/outline";
import type { BruinNodeProps, ColumnInfo } from "@/types";
import {
  defaultStyle,
  statusStyles,
  styles,
} from "@/components/lineage-flow/custom-nodes/CustomNodeStyles";

const props = defineProps<{
  data: BruinNodeProps["data"];
  selectedNodeId?: string | null;
  expandedNodes?: { [key: string]: boolean };
  showExpandButtons?: boolean;
  status?: string;
}>();

const emit = defineEmits<{
  (e: 'node-click', nodeId: string): void;
  (e: 'add-upstream', nodeId: string): void;
  (e: 'add-downstream', nodeId: string): void;
  (e: 'toggle-node-expand', nodeId: string, type?: string): void;
}>();

// Column display state
const showColumns = ref(false);
const showAllColumns = ref(false);
const maxVisibleColumns = 5;

// Auto-expand columns for focus assets
if (props.data?.asset?.isFocusAsset) {
  showColumns.value = true;
}

// Computed properties
const columns = computed(() => props.data?.columns || props.data?.asset?.columns || []);
// Column lineage computed property removed
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

// Style-related computed properties (matching CustomNodes.vue)
const selectedStyle = computed(() => styles[props.data?.asset?.type || "default"] || defaultStyle);
const selectedStatusStyle = computed(() => statusStyles[props.status || ""]);
const isAsset = computed(() => props.data.type === "asset" || props.data?.asset);

const assetHasUpstreams = computed(() => isAsset.value && props.data?.asset?.hasUpstreams !== undefined);
const assetHasDownstreams = computed(() => isAsset.value && props.data?.asset?.hasDownstreams);

const assetClass = computed(() => `rounded w-56 ${props.status ? selectedStatusStyle.value : ''}`);

const assetHighlightClass = computed(() => {
  return props.data?.asset?.isFocusAsset
    ? 'ring-2 ring-offset-4 ring-indigo-300 outline-2 outline-dashed outline-offset-8 outline-indigo-300 rounded'
    : '';
});

// Label and expansion properties
const label = computed(() => props.data?.asset?.name || props.data?.label || '');
const isExpanded = computed(() => props.expandedNodes?.[props.data?.asset?.name || ''] || false);

const isTruncated = computed(() => label.value.length > 26);
const truncatedLabel = computed(() => {
  const maxLength = 26;
  const name = label.value;
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
});

const computedFontSize = computed(() => {
  const baseSize = 12; // px
  const maxLength = 24;
  const length = label.value?.length || 0;

  if (length > maxLength) {
    const scale = Math.max(0.85, 1 - (length - maxLength) * 0.015);
    return `${baseSize * scale}px`;
  }
  return `${baseSize}px`;
});

// Methods
const handleNodeClick = () => {
  // Toggle columns if the node has columns and is not a focus asset (focus assets are always expanded)
  if (hasColumns.value && !props.data?.asset?.isFocusAsset) {
    showColumns.value = !showColumns.value;
    // Emit node expand event to trigger position restoration in column lineage
    emit("toggle-node-expand", props.data?.asset?.name, "columns");
  }
  
  // Also emit the node click event for other functionality
  emit("node-click", props.data?.asset?.name || props.data?.id);
};

const toggleColumnsExpanded = () => {
  showColumns.value = !showColumns.value;
  // Emit node expand event to trigger position restoration in column lineage
  emit("toggle-node-expand", props.data?.asset?.name, "columns");
};

const toggleShowAllColumns = () => {
  showAllColumns.value = !showAllColumns.value;
  // Emit node expand event to trigger position restoration in column lineage
  emit("toggle-node-expand", props.data?.asset?.name, "columns");
};

const toggleExpand = () => {
  emit("toggle-node-expand", props.data?.asset?.name, "node");
};

// Column lineage detection functions removed

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
.custom-node-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.dynamic-text {
  white-space: pre-wrap; /* Allow text to wrap */
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  transition: font-size 0.2s ease;
  cursor: pointer;
}

.node-content {
  width: 224px; /* Consistent width */
  transition: height 0.3s ease;
}

.node-content.expanded {
  height: auto; /* Allow height to adjust based on content */
}

.icon-wrapper {
  position: absolute;
  top: 72%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(55, 65, 81, 0.3);
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
}

.icon-wrapper:hover {
  border-color: rgba(55, 65, 81, 0.5);
}

.left-icon {
  left: -28px;
}

.right-icon {
  right: -28px;
}

.columns-toggle-btn {
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.columns-toggle-btn.expanded {
  transform: rotate(180deg);
}

.columns-list {
  /* No max-height or overflow to show all columns when expanded */
}

.column-item.has-lineage {
  border-left: 2px solid rgba(99, 102, 241, 0.5);
}

.column-item.highlight-column {
  background-color: rgba(234, 179, 8, 0.1);
  border-left: 2px solid rgb(234, 179, 8);
}

.column-lineage-indicator {
  color: rgb(99, 102, 241);
}

.column-handle {
  background-color: rgb(99, 102, 241);
  border: 2px solid rgb(255, 255, 255);
  border-radius: 50%;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.column-handle:hover {
  opacity: 1;
}
</style>
