<template>
  <div class="flow">
    <VueFlow
      :nodes="elements.nodes"
      :edges="elements.edges"
      @nodesInitialized="onNodesInitialized"
      :min-zoom="0.1"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />
      <Panel position="top-right">
        <div class="navigation-controls">
          <vscode-button 
            @click="handleViewSwitch()"
            appearance="secondary"
            class="view-switch-btn"
          >
            Pipeline View
          </vscode-button>
        </div>
      </Panel>
      
      <!-- Custom node template for column display -->
      <template #node-customWithColumn="nodeProps">
        <CustomNodeWithColumn
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
          :selected-node-id="selectedNodeId"
          @node-click="onNodeClick"
          :show-expand-buttons="false"
        />
      </template>
      
      <!-- Fallback to regular custom nodes if needed -->
      <template #node-custom="nodeProps">
        <CustomNode
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
          :selected-node-id="selectedNodeId"
          @node-click="onNodeClick"
          :show-expand-buttons="false"
        />
      </template>
      
      <MiniMap pannable zoomable />
      <Controls
        :position="PanelPosition.BottomLeft"
        showZoom
        showFitView
        showInteractive
        class="custom-controls"
      />
    </VueFlow>

    <!-- Column lineage legend -->
    <div class="lineage-legend">
      <div class="legend-item">
        <div class="legend-line asset-lineage"></div>
        <span>Asset Dependencies</span>
      </div>
      <div class="legend-item">
        <div class="legend-line column-lineage"></div>
        <span>Column Lineage</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  PanelPosition,
  VueFlow,
  useVueFlow,
  type Edge,
  Panel,
  type NodeMouseEvent,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/controls/dist/style.css";
import { ref, watch, defineEmits } from "vue";
import CustomNodeWithColumn from "@/components/lineage-flow/custom-nodes/CustomNodesWithColumn.vue";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  buildColumnLineage,
  generateColumnGraph,
} from "@/components/lineage-flow/column-level/useColumnLevel";
import { applyLayout } from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import type { AssetDataset } from "@/types";

const props = defineProps<{
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const { fitView, onNodeMouseEnter, onNodeMouseLeave, getNodes, getEdges } = useVueFlow();
const selectedNodeId = ref<string | null>(null);
const expandedNodes = ref<{ [key: string]: boolean }>({});

const toggleNodeExpand = (nodeId: string) => {
  expandedNodes.value[nodeId] = !expandedNodes.value[nodeId];
};

const emit = defineEmits<{
  (e: 'showPipelineView', data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }): void;
}>();

// Enhanced mouse interactions for column lineage
const getUpstreamNodesAndEdges = (nodeId: string, allEdges: Edge[]) => {
  const upstreamNodes = new Set<string>([nodeId]);
  const upstreamEdges = new Set<Edge>();

  // Get only direct upstream connections
  allEdges.forEach((edge) => {
    if (edge.target === nodeId) {
      upstreamNodes.add(edge.source);
      upstreamEdges.add(edge);
    }
  });

  return { upstreamNodes, upstreamEdges };
};

const getDownstreamNodesAndEdges = (nodeId: string, allEdges: Edge[]) => {
  const downstreamNodes = new Set<string>([nodeId]);
  const downstreamEdges = new Set<Edge>();

  // Get only direct downstream connections
  allEdges.forEach((edge) => {
    if (edge.source === nodeId) {
      downstreamNodes.add(edge.target);
      downstreamEdges.add(edge);
    }
  });

  return { downstreamNodes, downstreamEdges };
};

// Enhanced hover highlighting that considers column lineage
onNodeMouseEnter((event: NodeMouseEvent) => {
  /*
  const hoveredNode = event.node;
  const allNodes = getNodes.value;
  const allEdges = getEdges.value;

  const { upstreamNodes, upstreamEdges } = getUpstreamNodesAndEdges(hoveredNode.id, allEdges);
  const { downstreamNodes, downstreamEdges } = getDownstreamNodesAndEdges(hoveredNode.id, allEdges);

  const highlightNodes = new Set([...upstreamNodes, ...downstreamNodes]);
  const highlightEdges = new Set([...upstreamEdges, ...downstreamEdges]);

  allNodes.forEach((node) => {
    if (!highlightNodes.has(node.id)) {
      node.class = `${node.class || ''} faded`.trim();
    }
  });

  allEdges.forEach((edge) => {
    if (!highlightEdges.has(edge)) {
      edge.class = `${edge.class || ''} faded`.trim();
    } else if (edge.data?.type === 'column-lineage') {
      // Highlight column lineage edges more prominently
      edge.class = `${edge.class || ''} column-highlight`.trim();
    }
  });
  */
});

onNodeMouseLeave(() => {
  /*
  getNodes.value.forEach((node) => {
    if (node.class && typeof node.class === 'string') {
      node.class = node.class.replace(/faded/g, '').trim();
    }
  });
  getEdges.value.forEach((edge) => {
    if (edge.class && typeof edge.class === 'string') {
      edge.class = edge.class.replace(/faded|column-highlight/g, '').trim();
    }
  });
  */
});

const handleViewSwitch = () => {
  emit('showPipelineView', {
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError
  });
};

const error = ref<string | null>(props.LineageError);
const elements = ref<any>({ nodes: [], edges: [] });

watch(
  () => props.pipelineData,
  async (newPipelineData) => {
    if (!newPipelineData) {
      elements.value = { nodes: [], edges: [] };
      return;
    }
    
    // Check if we have column lineage data
    const hasColumnData = newPipelineData.column_lineage || 
                         (newPipelineData.assets && newPipelineData.assets.some((asset: any) => asset.columns?.length > 0));
    
    if (!hasColumnData) {
      console.warn("No column lineage data available. Consider using 'parse pipeline -c' command.");
      // Still show the graph but without column information
    }
    
    const lineageData = buildColumnLineage(newPipelineData);
    const { nodes: initialNodes, edges: initialEdges } = generateColumnGraph(
      lineageData,
      props.assetDataset?.name || ""
    );
    
    const { nodes: layoutNodes, edges: layoutEdges } = await applyLayout(initialNodes, initialEdges);
    elements.value = { nodes: layoutNodes, edges: layoutEdges };
  },
  { immediate: true }
);

const onNodesInitialized = () => {
  console.log("Column lineage nodes initialized");
  fitView();
};

const onNodeClick = (nodeId: string) => {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId;
};
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.vue-flow__node.faded,
.vue-flow__edge.faded {
  opacity: 0.3;
  transition: opacity 0.2s ease-in-out;
}

.vue-flow__edge.column-highlight {
  stroke-width: 3px !important;
  opacity: 1 !important;
  animation: pulse-column 1.5s ease-in-out infinite;
}

@keyframes pulse-column {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.flow {
  @apply flex h-screen w-full p-0 !important;
}

.vue-flow__controls {
  bottom: 1rem !important;
  left: 1rem !important;
  top: auto !important;
  right: auto !important;
  background-color: transparent !important;
  display: flex !important;
  flex-direction: row !important;
  gap: 0.3rem;
}

.vue-flow__controls-button {
  @apply flex justify-center items-center p-0 border-solid border-notificationCenter-border bg-transparent rounded-md w-6 h-6 cursor-pointer hover:bg-editor-bg  !important;
}

.vue-flow__controls-button svg {
  @apply fill-current text-editor-fg !important;
}

.custom-controls .vue-flow__controls-button:hover {
  background-color: #444 !important;
}

.lineage-legend {
  @apply absolute top-4 left-4 bg-editor-bg border border-notificationCenter-border rounded-lg p-3 shadow-lg z-10;
}

.legend-item {
  @apply flex items-center gap-2 mb-2 last:mb-0;
}

.legend-line {
  @apply w-8 h-0.5 rounded;
}

.legend-line.asset-lineage {
  @apply bg-gray-400;
}

.legend-line.column-lineage {
  @apply bg-purple-500;
  background: repeating-linear-gradient(
    90deg,
    #8b5cf6,
    #8b5cf6 4px,
    transparent 4px,
    transparent 8px
  );
}

.legend-item span {
  @apply text-xs text-foreground;
}

.navigation-controls {
  @apply flex gap-2;
}

.view-switch-btn {
  @apply text-xs;
}

.loading-overlay {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}

.error-message {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}
</style>
