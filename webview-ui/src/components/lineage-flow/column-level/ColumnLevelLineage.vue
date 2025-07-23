<template>
  <div class="flow">
    <!-- Show error message when no column data is available -->
    <div v-if="error" class="error-message">
      <div class="error-content">
        <h3 class="error-title">No Column Lineage Data Available</h3>
        <p class="error-description">{{ error }}</p>
        <div class="error-actions">
          <vscode-button 
            @click="handleViewSwitch"
            appearance="primary"
            class="action-btn"
          >
            View Asset Lineage
          </vscode-button>
        </div>
      </div>
    </div>

    <!-- Main VueFlow component - only show when no error -->
    <VueFlow
      v-if="!error"
      :nodes="elements.nodes"
      :edges="elements.edges"
      @nodesInitialized="onNodesInitialized"
      :min-zoom="0.1"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />
      <FilterTab
        :filterType="filterType"
        :expandAllUpstreams="expandAllUpstreams"
        :expandAllDownstreams="expandAllDownstreams"
        :showPipelineView="false"
        :showColumnView="true"
        @update:filterType="filterType = $event"
        @update:expandAllUpstreams="expandAllUpstreams = $event"
        @update:expandAllDownstreams="expandAllDownstreams = $event"
        @pipeline-view="handleViewSwitch"
        @column-view="handleAssetViewSwitch"
        @asset-view="handleAssetViewSwitch"
        @reset="handleReset"
      />
     
      
      <!-- Custom node template for column display -->
      <template #node-customWithColumn="nodeProps">
        <CustomNodeWithColumn
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
          :selected-node-id="selectedNodeId"
          @node-click="onNodeClick"
          :show-expand-buttons="false"
          @column-hover="handleColumnHover"
          @column-leave="handleColumnLeave"
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
          :label="nodeProps.data?.asset?.name || nodeProps.data?.label || ''"
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
  </div>
</template>

<script setup lang="ts">
import {
  PanelPosition,
  VueFlow,
  useVueFlow,
  Panel,
  type GraphNode
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/controls/dist/style.css";
import { ref, watch, defineEmits } from "vue";
import CustomNodeWithColumn from "@/components/lineage-flow/custom-nodes/CustomNodesWithColumn.vue";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import FilterTab from "@/components/lineage-flow/filterTab/filterTab.vue";
import { buildColumnLineage } from "@/components/lineage-flow/column-level/useColumnLevel";
import { generateColumnGraph } from "@/utilities/graphGenerator";
import { applyLayout } from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import type { AssetDataset } from "@/types";

interface NodePosition {
  x: number;
  y: number;
}

interface NodePositions {
  [key: string]: NodePosition;
}

interface GraphElements {
  nodes: any[];
  edges: any[];
}

interface HoveredColumn {
  assetName: string;
  columnName: string;
}

const props = defineProps<{
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const { fitView, getNodes, setNodes, getEdges, setEdges } = useVueFlow();
const selectedNodeId = ref<string | null>(null);
const expandedNodes = ref<{ [key: string]: boolean }>({});
const savedNodePositions = ref<NodePositions>({});
const originalNodePositions = ref<NodePositions>({});
const isRestoringPositions = ref(false);
const error = ref<string | null>(props.LineageError);
const elements = ref<GraphElements>({ nodes: [], edges: [] });
const hoveredColumn = ref<HoveredColumn | null>(null);

// Filter state
const filterType = ref<"direct" | "all">("all");
const expandAllUpstreams = ref(true);
const expandAllDownstreams = ref(true);

const emit = defineEmits<{
  showPipelineView: [data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }];
  showAssetView: [data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }];
}>();

const toggleNodeExpand = (nodeId: string, type?: string): void => {
  const currentNodes = getNodes.value;
  const expandedNode = currentNodes.find(node => node.id === nodeId);
  
  // Prevent focus assets from being collapsed
  if (expandedNode?.data?.asset?.isFocusAsset) {
    return;
  }
  
  const wasExpanded = expandedNodes.value[nodeId];
  expandedNodes.value[nodeId] = !wasExpanded;
  
  // Only perform spacing algorithm when columns are toggled
  if (type === "columns") {
    recalculateAllPositions();
  }
};

const recalculateAllPositions = (): void => {
  const currentNodes = getNodes.value;
  
  // Reset all nodes to their original positions
  const nodesWithOriginalPositions = currentNodes.map(node => {
    const originalPosition = originalNodePositions.value[node.id];
    if (originalPosition) {
      return {
        ...node,
        position: { x: originalPosition.x, y: originalPosition.y }
      };
    }
    return node;
  });
  
  // Identify focus asset and categorize nodes
  const focusNode = nodesWithOriginalPositions.find(node => node.data?.asset?.isFocusAsset);
  if (!focusNode) {
    applyCumulativeSpacing(nodesWithOriginalPositions);
    return;
  }
  
  const upstreamNodes: GraphNode[] = [];
  const downstreamNodes: GraphNode[] = [];
  const focusNodes: GraphNode[] = [];
  
  nodesWithOriginalPositions.forEach(node => {
    if (node.data?.asset?.isFocusAsset) {
      focusNodes.push(node);
    } else if (node.position.x < focusNode.position.x) {
      upstreamNodes.push(node);
    } else {
      downstreamNodes.push(node);
    }
  });
  
  // Apply spacing independently for upstream and downstream nodes
  const spacedUpstreamNodes = applyDirectionalSpacing(upstreamNodes, 'upstream');
  const spacedDownstreamNodes = applyDirectionalSpacing(downstreamNodes, 'downstream');
  
  // Combine all nodes with their new positions
  const finalNodes = [
    ...spacedUpstreamNodes,
    ...focusNodes, // Focus nodes keep their original positions
    ...spacedDownstreamNodes
  ];
  
  setNodes(finalNodes);
  
  // Save the new positions
  saveNodePositions();
};

const applyDirectionalSpacing = (nodes: GraphNode[], direction: 'upstream' | 'downstream'): GraphNode[] => {
  if (nodes.length === 0) return [];
  
  // Sort nodes by Y position to apply spacing from top to bottom
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  
  let cumulativeOffset = 0;
  return sortedNodes.map(node => {
    const isExpanded = expandedNodes.value[node.id];
    const hasColumns = node.data?.columns?.length > 0;
    const isFocusAsset = node.data?.asset?.isFocusAsset;
    
    // Calculate the vertical space this node needs
    let nodeOffset = 0;
    if (isExpanded && hasColumns && !isFocusAsset) {
      const columnCount = node.data.columns.length;
      nodeOffset = columnCount * 18; // 18px per column
    }
    
    // Apply the cumulative offset to this node
    const newPosition = {
      x: node.position.x,
      y: node.position.y + cumulativeOffset
    };
    
    // Add this node's offset to the cumulative total
    cumulativeOffset += nodeOffset;
    
    return {
      ...node,
      position: newPosition
    };
  });
};

const applyCumulativeSpacing = (nodes: GraphNode[]): void => {
  const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
  
  let cumulativeOffset = 0;
  const finalNodes = sortedNodes.map(node => {
    const isExpanded = expandedNodes.value[node.id];
    const hasColumns = node.data?.columns?.length > 0;
    const isFocusAsset = node.data?.asset?.isFocusAsset;
    
    let nodeOffset = 0;
    if (isExpanded && hasColumns && !isFocusAsset) {
      const columnCount = node.data.columns.length;
      nodeOffset = columnCount * 18; // 18px per column
    }
    
    const newPosition = {
      x: node.position.x,
      y: node.position.y + cumulativeOffset
    };
    
    cumulativeOffset += nodeOffset;
    
    return {
      ...node,
      position: newPosition
    };
  });
  
  setNodes(finalNodes);
};

const saveOriginalPositions = (): void => {
  if (Object.keys(originalNodePositions.value).length > 0) {
    return;
  }
  
  const currentNodes = getNodes.value;
  const positions: NodePositions = {};
  
  currentNodes.forEach(node => {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  });
  
  originalNodePositions.value = positions;
  console.log("Saved original node positions for column lineage:", positions);
};

const saveNodePositions = (): void => {
  if (isRestoringPositions.value) {
    return;
  }
  
  const currentNodes = getNodes.value;
  const positions: NodePositions = {};
  
  currentNodes.forEach(node => {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  });
  
  savedNodePositions.value = positions;
  console.log("Saved node positions for column lineage:", positions);
};

const handleViewSwitch = (): void => {
  emit('showPipelineView', {
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError
  });
};

const handleAssetViewSwitch = (): void => {
  emit('showAssetView', {
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError
  });
};

const onNodeClick = (nodeId: string): void => {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId;
};

const onNodesInitialized = (): void => {
  console.log("Column lineage nodes initialized");
  fitView();
  
  // Auto-expand focus asset nodes
  const currentNodes = getNodes.value;
  currentNodes.forEach(node => {
    if (node.data?.asset?.isFocusAsset) {
      expandedNodes.value[node.id] = true;
    }
  });
  
  // Save both original and current positions after nodes are initialized and layout is applied
  saveOriginalPositions();
  saveNodePositions();
  recalculateAllPositions();
};

// Handle column hover events
const handleColumnHover = (assetName: string, columnName: string): void => {
  hoveredColumn.value = { assetName, columnName };
  highlightColumnAndEdges(assetName, columnName);
};

const handleColumnLeave = (): void => {
  hoveredColumn.value = null;
  resetEdgeStyles();
};

// Handle filter reset
const handleReset = (): void => {
  filterType.value = "all";
  expandAllUpstreams.value = true;
  expandAllDownstreams.value = true;
};

// Highlight column and its connected edges recursively
const highlightColumnAndEdges = (assetName: string, columnName: string): void => {
  const currentEdges = getEdges.value;
  
  console.log('Hovering over column:', { assetName, columnName });
  
  // Find all connected edges recursively
  const allConnectedEdges = findAllConnectedEdges(assetName, columnName, currentEdges);
  
  console.log('All connected edges found:', allConnectedEdges.length, allConnectedEdges.map(e => e.id));
  
  // Update edge styles
  const updatedEdges = currentEdges.map(edge => {
    const isConnected = allConnectedEdges.some(connectedEdge => connectedEdge.id === edge.id);
    const currentStyle = typeof edge.style === 'object' ? edge.style : {};
    
    return {
      ...edge,
      style: {
        ...currentStyle,
        stroke: isConnected ? '#3B82F6' : (currentStyle.stroke || '#6b7280'),
        strokeWidth: isConnected ? 2 : (currentStyle.strokeWidth || 1),
        transition: 'stroke 0.2s ease, stroke-width 0.2s ease'
      }
    };
  });
  
  setEdges(updatedEdges);
};

// Find all edges connected to a column recursively (both upstream and downstream)
const findAllConnectedEdges = (assetName: string, columnName: string, allEdges: any[], visited = new Set<string>()): any[] => {
  const connectedEdges: any[] = [];
  const currentKey = `${assetName.toLowerCase()}.${columnName.toLowerCase()}`;
  
  // Avoid infinite loops
  if (visited.has(currentKey)) {
    return connectedEdges;
  }
  visited.add(currentKey);
  
  // Find direct edges connected to this column
  const directEdges = allEdges.filter(edge => {
    if (edge.data?.type !== 'column-lineage') return false;
    
    const sourceAssetMatch = edge.data.sourceAsset?.toLowerCase() === assetName.toLowerCase();
    const sourceColumnMatch = edge.data.sourceColumn?.toLowerCase() === columnName.toLowerCase();
    const targetAssetMatch = edge.data.targetAsset?.toLowerCase() === assetName.toLowerCase();
    const targetColumnMatch = edge.data.targetColumn?.toLowerCase() === columnName.toLowerCase();
    
    return (sourceAssetMatch && sourceColumnMatch) || (targetAssetMatch && targetColumnMatch);
  });
  
  // Add direct edges
  connectedEdges.push(...directEdges);
  
  // Recursively find edges for connected columns
  directEdges.forEach(edge => {
    // If this column is the source, follow downstream
    if (edge.data.sourceAsset?.toLowerCase() === assetName.toLowerCase() && 
        edge.data.sourceColumn?.toLowerCase() === columnName.toLowerCase()) {
      const downstreamEdges = findAllConnectedEdges(
        edge.data.targetAsset,
        edge.data.targetColumn,
        allEdges,
        visited
      );
      connectedEdges.push(...downstreamEdges);
    }
    
    // If this column is the target, follow upstream
    if (edge.data.targetAsset?.toLowerCase() === assetName.toLowerCase() && 
        edge.data.targetColumn?.toLowerCase() === columnName.toLowerCase()) {
      const upstreamEdges = findAllConnectedEdges(
        edge.data.sourceAsset,
        edge.data.sourceColumn,
        allEdges,
        visited
      );
      connectedEdges.push(...upstreamEdges);
    }
  });
  
  // Remove duplicates
  const uniqueEdges = connectedEdges.filter((edge, index, self) => 
    index === self.findIndex(e => e.id === edge.id)
  );
  
  return uniqueEdges;
};

// Reset all edge styles to original
const resetEdgeStyles = (): void => {
  const currentEdges = getEdges.value;
  
  const resetEdges = currentEdges.map(edge => {
    const currentStyle = typeof edge.style === 'object' ? edge.style : {};
    
    return {
      ...edge,
      style: {
        ...currentStyle,
        stroke: edge.data?.type === 'column-lineage' ? '#6b7280' : '#6b7280',
        strokeWidth: edge.data?.type === 'column-lineage' ? 0.3 : 1,
        transition: 'stroke 0.2s ease, stroke-width 0.2s ease'
      }
    };
  });
  
  setEdges(resetEdges);
};

// Watch for pipeline data changes
watch(
  () => props.pipelineData,
  async (newPipelineData) => {
    if (!newPipelineData) {
      elements.value = { nodes: [], edges: [] };
      savedNodePositions.value = {};
      originalNodePositions.value = {};
      return;
    }
    
    // Check if we have column lineage data
    const hasColumnData = newPipelineData.column_lineage || 
                         (newPipelineData.assets && newPipelineData.assets.some((asset: any) => 
                           asset.columns?.length > 0 && asset.columns.some((col: any) => 
                             col.upstreams && Array.isArray(col.upstreams) && col.upstreams.length > 0
                           )
                         ));
    
    if (!hasColumnData) {
      console.warn("No column lineage data available. The data may have been parsed without the -c flag.");
      
      elements.value = { nodes: [], edges: [] };
      savedNodePositions.value = {};
      originalNodePositions.value = {};
      error.value = "No column lineage data found. To view column-level lineage, ensure the pipeline data includes column information by using the 'parse pipeline -c' command or refresh the lineage data.";
      return;
    }
    
    error.value = null;
    
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

// Watch for elements changes to save positions
watch(
  () => elements.value.nodes,
  (newNodes) => {
    if (newNodes && newNodes.length > 0 && !isRestoringPositions.value) {
      saveNodePositions();
    }
  },
  { deep: true }
);
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.vue-flow__node.faded,
.vue-flow__edge.faded {
  opacity: 0.3;
  transition: opacity 0.2s ease-in-out;
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

.error-content {
  @apply text-center p-8 max-w-md;
}

.error-title {
  @apply text-lg font-semibold text-foreground mb-4;
}

.error-description {
  @apply text-sm text-gray-400 mb-6 leading-relaxed;
}

.error-actions {
  @apply flex justify-center gap-3;
}

.action-btn {
  @apply text-xs;
}
</style>
