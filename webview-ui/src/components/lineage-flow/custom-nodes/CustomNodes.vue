<template>
  <div class="custom-node-wrapper">
    <div v-if="props.showExpandButtons">
      <div
        v-if="showUpstreamIcon"
        @click.stop="onAddUpstream"
        class="icon-wrapper left-icon bg-commandCenter-border"
        :class="{ invisible: !props.data.hasUpstreamForClicking }"
        title="Show Upstreams"
      >
        <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
      </div>
    </div>

    <div class="node-content" :class="[assetClass, { expanded: isExpanded, 'with-columns': showColumns }]" @click="togglePopup">
      <div
        v-if="data.type === 'asset'"
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
            {{ data.asset?.type }}
          </div>
        </div>

        <div
          class="font-mono py-1 text-left px-1 border border-white/20"
          :class="[selectedStyle.main, status ? '' : 'rounded-tl', showColumns ? 'rounded-none' : 'rounded-b']"
        >
          <div class="relative group">
            <!-- Truncated Text with Expand Option -->
            <div class="dynamic-text" :style="{ fontSize: computedFontSize }" @click.stop="toggleExpand">
              {{ isExpanded ? label : truncatedLabel }}
            </div>
            <!-- Tooltip -->
            <div
              v-if="isTruncated && !isExpanded"
              class="absolute left-0 top-0 w-max font-mono rounded opacity-0 whitespace-nowrap group-hover:opacity-100 transition-opacity duration-200 group-hover:cursor-pointer"
              :class="selectedStyle.main"
              @click.stop="toggleExpand"
            >
              {{ label }}
            </div>
          </div>
        </div>

        <!-- Columns Section -->
        <div v-if="showColumns" class="columns-section border border-white/20 border-t-0 rounded-b bg-editor-bg p-3">
          <div class="text-xs font-semibold text-editor-fg mb-3 opacity-70 flex items-center">
            <span>Columns</span>
            <span v-if="nodeColumns && nodeColumns.length > 0" class="ml-1 text-2xs opacity-50">({{ nodeColumns.length }})</span>
          </div>
          <div v-if="nodeColumns && nodeColumns.length > 0" class="space-y-1.5 max-h-96 overflow-y-auto">
            <div 
              v-for="(column, index) in nodeColumns" 
              :key="index"
              class="flex items-center text-xs py-1.5 px-2 rounded hover:bg-input-background transition-colors"
            >
              <div class="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 shadow-sm" :class="getColumnTypeColor(column.type)"></div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-editor-fg truncate">{{ column.name }}</div>
                <div class="text-2xs text-editor-fg opacity-60 mt-0.5">{{ column.type }}</div>
              </div>
              <div v-if="column.primary_key" class="ml-2 flex-shrink-0">
                <div class="w-3.5 h-3.5 rounded bg-yellow-500 flex items-center justify-center">
                  <span class="text-white text-2xs font-bold">K</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-editor-fg opacity-50 italic px-2">
            No columns defined
          </div>
        </div>
      </div>
    </div>

    <div v-if="props.showExpandButtons">
      <div
        v-if="showDownstreamIcon"
        @click.stop="onAddDownstream"
        class="icon-wrapper right-icon bg-commandCenter-border"
        title="Show Downstreams"
      >
        <PlusIcon class="h-4 w-4 fill-gray-300 text-gray-700/50 hover:text-gray-700" />
      </div>
    </div>
    <AssetProperties
      v-if="!data.asset?.isFocusAsset"
      :show="showPopup"
      :name="props.data.asset?.name || ''"
      :type="props.data.asset?.type || ''"
      :path="props.data.asset?.path || ''"
      @close="closePopup"
      @goToDetails="handleGoToDetails"
    />
  </div>
  <Handle
    v-if="assetHasDownstreams || assetHasUpstreams"
    type="source"
    class="opacity-0"
    :position="Position.Right"
  />
  <Handle
    v-if="assetHasUpstreams || assetHasDownstreams"
    type="target"
    class="opacity-0"
    :position="Position.Left"
  />
</template>

<script lang="ts" setup>
import { computed, defineProps, defineEmits, onMounted, onUnmounted, ref } from "vue";
import { Handle, Position } from "@vue-flow/core";
import { PlusIcon } from "@heroicons/vue/20/solid";
import AssetProperties from "@/components/ui/asset/AssetProperties.vue";
import { vscode } from "@/utilities/vscode";
import {
  defaultStyle,
  statusStyles,
  styles,
} from "@/components/lineage-flow/custom-nodes/CustomNodeStyles";
import type { BruinNodeProps } from "@/types";

const props = defineProps<BruinNodeProps & {
  selectedNodeId: string | null;
  expandAllDownstreams?: boolean;
  expandAllUpstreams?: boolean;
  expandedNodes?: { [key: string]: boolean };
  showExpandButtons: boolean;
  showColumns?: boolean;  // New prop for showing columns
}>();
const emit = defineEmits(["add-upstream", "add-downstream", "node-click", "toggle-node-expand"]);

const selectedStyle = computed(() => styles[props.data?.asset?.type || "default"] || defaultStyle);
const selectedStatusStyle = computed(() => statusStyles[props.status || ""]);
const isAsset = computed(() => props.data.type === "asset");

const assetHasUpstreams = computed(() => isAsset.value && props.data.asset?.hasUpstreams !== undefined);
const assetHasDownstreams = computed(() => isAsset.value && props.data.asset?.hasDownstreams);

const showUpstreamIcon = computed(() => 
  isAsset.value && 
  props.data?.hasUpstreamForClicking && 
  !props.expandAllUpstreams && 
  props.showExpandButtons &&
  !isNodeUpstreamExpanded.value
);
const showDownstreamIcon = computed(() => 
  isAsset.value && 
  props.data?.hasDownstreamForClicking && 
  !props.expandAllDownstreams && 
  props.showExpandButtons &&
  !isNodeDownstreamExpanded.value
);

// Check if this specific node's dependencies are already expanded
const isNodeUpstreamExpanded = computed(() => {
  const nodeName = props.data.asset?.name;
  return nodeName ? props.expandedNodes?.[`${nodeName}_upstream`] : false;
});

const isNodeDownstreamExpanded = computed(() => {
  const nodeName = props.data.asset?.name;
  return nodeName ? props.expandedNodes?.[`${nodeName}_downstream`] : false;
});

const assetClass = computed(() => `rounded ${props.status ? selectedStatusStyle.value : ''} ${showColumns.value ? 'w-80' : 'w-56'}`);

const assetHighlightClass = computed(() => {
  return props.data.asset?.isFocusAsset
    ? 'ring-2 ring-offset-4 ring-indigo-300 outline-2 outline-dashed outline-offset-8 outline-indigo-300 rounded'
    : '';
});

const showColumns = computed(() => props.showColumns && isAsset.value);

const nodeColumns = computed(() => {
  if (!showColumns.value || !props.data.asset?.columns) {
    return [];
  }
  return props.data.asset.columns;
});



const getColumnTypeColor = (type: string) => {
  // Node tipine göre uyumlu renkler kullan - daha koyu tonlar için 600/700 seviyesi
  const assetType = props.data.asset?.type || 'default';
  
  // Node label rengine uyumlu column renkleri (daha parlak ve görünür)
  const assetTypeColors: { [key: string]: string } = {
    'bq.sql': 'bg-sky-600',
    'external': 'bg-rose-600', 
    'sf.sql': 'bg-orange-600',
    'pg.sql': 'bg-cyan-600',
    'rs.sql': 'bg-fuchsia-600',
    'ms.sql': 'bg-violet-600',
    'synapse.sql': 'bg-purple-600',
    'ingestr': 'bg-amber-600',
    'duckdb.seed': 'bg-rose-600',
    'emr_serverless.spark': 'bg-lime-600',
    'emr_serverless.pyspark': 'bg-lime-600', 
    'bq.seed': 'bg-blue-600',
    'athena.seed': 'bg-teal-600',
    'clickhouse.seed': 'bg-pink-600',
    'databricks.seed': 'bg-red-600',
    'ms.seed': 'bg-violet-600',
    'pg.seed': 'bg-cyan-600',
    'rs.seed': 'bg-fuchsia-600',
    'sf.seed': 'bg-orange-600',
    'synapse.seed': 'bg-purple-600',
    'python': 'bg-green-600',
    'python.beta': 'bg-green-600',
    'default': 'bg-gray-600'
  };
  
  return assetTypeColors[assetType] || assetTypeColors['default'];
};

const onAddUpstream = () => emit("add-upstream", props.data.asset?.name);
const onAddDownstream = () => emit("add-downstream", props.data.asset?.name);

const showPopup = computed(() => props.selectedNodeId === props.data.asset?.name && !props.data.asset?.isFocusAsset);
const togglePopup = (event) => {
  event.stopPropagation();
  emit("node-click", props.data.asset?.name, event);
};

const closePopup = () => emit("node-click", null, new MouseEvent('click'));

const handleGoToDetails = (asset) => {
  vscode.postMessage({ command: "bruin.openAssetDetails", payload: asset.path });
  closePopup();
};

const label = computed(() => props.data.asset?.name || '');
const isExpanded = computed(() => props.expandedNodes?.[props.data.asset?.name || ''] || false);

const isTruncated = computed(() => label.value.length > 26);
const truncatedLabel = computed(() => {
  const maxLength = 26;
  const name = label.value;
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
});

const toggleExpand = () => {
  emit("toggle-node-expand", props.data.asset?.name);
};

const handleClickOutside = (event) => {
  if (showPopup.value) closePopup();
};

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

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
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
  transition: all 0.3s ease;
}

.node-content.with-columns {
  width: 320px; /* Wider when showing columns */
}

.node-content.expanded {
  height: auto; /* Allow height to adjust based on content */
}



.columns-section {
  @apply transition-all duration-200 ease-in-out;
  min-width: 280px;
  max-width: 100%;
}

.columns-section::-webkit-scrollbar {
  width: 4px;
}

.columns-section::-webkit-scrollbar-track {
  background: transparent;
}

.columns-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.columns-section::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
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

.text-2xs {
  font-size: 0.625rem;
  line-height: 0.75rem;
}
</style>