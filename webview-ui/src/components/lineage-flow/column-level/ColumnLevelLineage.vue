<template>
  <div class="flow">
    <!-- Show error message when no column data is available -->
    <div v-if="error" class="error-message">
      <div class="error-content">
        <h3 class="error-title">No Column Lineage Data Available</h3>
        <p class="error-description">{{ error }}</p>
        <div class="error-actions">
          <vscode-button 
            @click="handleViewSwitch()"
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

    <!-- Column lineage legend removed -->
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

const { fitView, onNodeMouseEnter, onNodeMouseLeave, getNodes, getEdges, setNodes } = useVueFlow();
const selectedNodeId = ref<string | null>(null);
const expandedNodes = ref<{ [key: string]: boolean }>({});

// Add position storage for consistent layout
const savedNodePositions = ref<{ [key: string]: { x: number; y: number } }>({});
const originalNodePositions = ref<{ [key: string]: { x: number; y: number } }>({});
const isRestoringPositions = ref(false);

const toggleNodeExpand = (nodeId: string, type?: string) => {
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

// Recalculate all positions based on which nodes are expanded
const recalculateAllPositions = () => {
  const currentNodes = getNodes.value;
  
  // Step 1: Reset all nodes to their original positions
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
  
  // Step 2: Identify focus asset and categorize nodes
  const focusNode = nodesWithOriginalPositions.find(node => node.data?.asset?.isFocusAsset);
  if (!focusNode) {
    // Fallback to old behavior if no focus asset found
    applyCumulativeSpacing(nodesWithOriginalPositions);
    return;
  }
  
  const upstreamNodes = [];
  const downstreamNodes = [];
  const focusNodes = [];
  
  nodesWithOriginalPositions.forEach(node => {
    if (node.data?.asset?.isFocusAsset) {
      focusNodes.push(node);
    } else if (node.position.x < focusNode.position.x) {
      upstreamNodes.push(node);
    } else {
      downstreamNodes.push(node);
    }
  });
  
  // Step 3: Apply spacing independently for upstream and downstream nodes
  const spacedUpstreamNodes = applyDirectionalSpacing(upstreamNodes, 'upstream');
  const spacedDownstreamNodes = applyDirectionalSpacing(downstreamNodes, 'downstream');
  
  // Step 4: Combine all nodes with their new positions
  const finalNodes = [
    ...spacedUpstreamNodes,
    ...focusNodes, // Focus nodes keep their original positions
    ...spacedDownstreamNodes
  ];
  
  // Update nodes with new positions
  setNodes(finalNodes);
  
  // Save the new positions
  setTimeout(() => {
    saveNodePositions();
  }, 100);
};

// Apply spacing logic for nodes in a specific direction (upstream or downstream)
const applyDirectionalSpacing = (nodes, direction) => {
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

// Fallback function for cumulative spacing (old behavior)
const applyCumulativeSpacing = (nodes) => {
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

// Save original positions of all nodes (only once when first initialized)
const saveOriginalPositions = () => {
  // Only save original positions if they haven't been saved yet
  if (Object.keys(originalNodePositions.value).length > 0) {
    return;
  }
  
  const currentNodes = getNodes.value;
  const positions: { [key: string]: { x: number; y: number } } = {};
  
  currentNodes.forEach(node => {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  });
  
  originalNodePositions.value = positions;
  console.log("Saved original node positions for column lineage:", positions);
};

// Save current positions of all nodes
const saveNodePositions = () => {
  // Don't save positions while we're restoring them
  if (isRestoringPositions.value) {
    return;
  }
  
  const currentNodes = getNodes.value;
  const positions: { [key: string]: { x: number; y: number } } = {};
  
  currentNodes.forEach(node => {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  });
  
  savedNodePositions.value = positions;
  console.log("Saved node positions for column lineage:", positions);
};

// Restore nodes to their saved positions
const restoreNodePositions = () => {
  if (Object.keys(savedNodePositions.value).length === 0) {
    console.log("No saved positions to restore");
    return;
  }
  
  isRestoringPositions.value = true;
  
  const currentNodes = getNodes.value;
  const updatedNodes = currentNodes.map(node => {
    const savedPosition = savedNodePositions.value[node.id];
    if (savedPosition) {
      return {
        ...node,
        position: { x: savedPosition.x, y: savedPosition.y }
      };
    }
    return node;
  });
  
  setNodes(updatedNodes);
  console.log("Restored node positions for column lineage");
  
  // Reset the flag after restoration is complete
  setTimeout(() => {
    isRestoringPositions.value = false;
  }, 100);
};

const emit = defineEmits<{
  (e: 'showPipelineView', data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }): void;
}>();

// Column lineage hover highlighting functions removed

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
      // Clear saved positions when data is cleared
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
      
      // Show empty graph but provide guidance
      elements.value = { nodes: [], edges: [] };
      // Clear saved positions when no data
      savedNodePositions.value = {};
      originalNodePositions.value = {};
      error.value = "No column lineage data found. To view column-level lineage, ensure the pipeline data includes column information by using the 'parse pipeline -c' command or refresh the lineage data.";
      return;
    }
    
    // Reset error if we have data
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

const onNodesInitialized = () => {
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
  // Use a small delay to ensure layout has been applied
  setTimeout(() => {
    saveOriginalPositions();
    saveNodePositions();
    // Apply initial spacing for focus assets that are auto-expanded
    recalculateAllPositions();
  }, 100);
};

// Also save positions whenever the elements change (e.g., when layout is applied)
watch(
  () => elements.value.nodes,
  (newNodes) => {
    if (newNodes && newNodes.length > 0 && !isRestoringPositions.value) {
      // Wait for Vue to update the DOM and then save positions
      // This ensures we capture the final positioned nodes
      setTimeout(() => {
        saveNodePositions();
      }, 200);
    }
  },
  { deep: true }
);

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
