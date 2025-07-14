<template>
  <div class="flow">
    <div v-if="isLayouting" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span class="ml-2">Positioning graph...</span>
    </div>
    
    <VueFlow
      v-if="!isLayouting"
      v-model:elements="elements"
      :fit-view-on-init="false"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
      @nodesDragged="onNodesDragged"
      @click="onFlowClick"
      ref="flowRef"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :expanded-nodes="{}"
          :data="nodeProps.data"
          :node-props="nodeProps"
          :label="nodeProps.data.label"
          :show-expand-buttons="false"
          :show-columns="true"
          :hovered-column="hoveredColumn"
          :selected-node-id="null"
          @column-hover="onColumnHover"
          @column-leave="onColumnLeave"
          @columns-toggled="onColumnsToggled"
          :is-column-lineage-mode="true"
        />
      </template>
      
      <!-- Filter Panel -->
      <Panel position="top-right">
        <div class="navigation-controls">
          <vscode-button
            @click="handleViewSwitch"
            appearance="secondary"
            class="view-switch-btn"
          >
            Asset View
          </vscode-button>
        </div>
      </Panel>

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
import { ref, watch, nextTick, computed, defineProps, defineEmits, onUnmounted } from "vue";
import { Panel, PanelPosition, VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";
import type { NodeDragEvent, XYPosition } from "@vue-flow/core";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";

const props = defineProps<{
  graphData: { nodes: any[]; edges: any[] };
}>();

const emit = defineEmits(['change-view']);

const { nodes, edges, setNodes, setEdges, fitView, getViewport } = useVueFlow();
const elements = computed(() => [...nodes.value, ...edges.value]);
const isLayouting = ref(false);
const flowRef = ref(null);
const elk = new ELK();

// Column hover state
const hoveredColumn = ref<{ table: string; column: string } | null>(null);
const hoverTimeout = ref<NodeJS.Timeout | null>(null);

// Column expand/collapse state for each node
const nodeColumnsExpanded = ref<{ [nodeId: string]: boolean }>({});





const handleViewSwitch = () => {
  emit('change-view', 'direct');
};

// Column hover handlers
const onColumnHover = (columnInfo: { table: string; column: string }) => {
  // Clear any pending timeout
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value);
    hoverTimeout.value = null;
  }
  
  hoveredColumn.value = columnInfo;
  updateEdgeHighlighting();
};

const onColumnLeave = () => {
  // Clear timeout if exists
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value);
  }
  
  // Shorter delay for better responsiveness when mouse leaves column
  hoverTimeout.value = setTimeout(() => {
    hoveredColumn.value = null;
    updateEdgeHighlighting();
  }, 50);
};

// Clear hover state when clicking on flow background
const onFlowClick = () => {
  if (hoveredColumn.value) {
    hoveredColumn.value = null;
    updateEdgeHighlighting();
  }
};



const onColumnsToggled = async (nodeId: string, isExpanded: boolean) => {
  nodeColumnsExpanded.value[nodeId] = isExpanded;
  updateEdgeHandles();
};

// Update edge handles based on column expand/collapse state
const updateEdgeHandles = () => {
  const updatedEdges = edges.value.map(edge => {
    if (!edge.data?.isColumnLineage) return edge;
    
    const sourceExpanded = nodeColumnsExpanded.value[edge.source] === true;
    const targetExpanded = nodeColumnsExpanded.value[edge.target] === true;
    
    const newEdge = { ...edge };
    
    if (sourceExpanded && edge.data.sourceColumn) {
      newEdge.sourceHandle = `${edge.source}-${edge.data.sourceColumn}`;
    } else {
      newEdge.sourceHandle = undefined;
    }
    
    if (targetExpanded && edge.data.targetColumn) {
      newEdge.targetHandle = `${edge.target}-${edge.data.targetColumn}`;
    } else {
      newEdge.targetHandle = undefined;
    }
    
    return newEdge;
  });
  
  setEdges(updatedEdges);
};

// Update edge highlighting based on hovered column
const updateEdgeHighlighting = () => {
  const updatedEdges = edges.value.map(edge => {
    if (!hoveredColumn.value || !edge.data?.isColumnLineage) {
      // Reset to default style - keep existing handles
      return {
        ...edge,
        style: {
          stroke: '#ffffff',
          strokeWidth: 2,
          strokeDasharray: '5,5',
          opacity: hoveredColumn.value ? 0.2 : 1
        },
        markerEnd: 'arrowclosed'
      };
    }
    
    // Check if this edge is connected to the hovered column
    const isConnected = isEdgeConnectedToColumn(edge, hoveredColumn.value);
    
    if (isConnected) {
      return {
        ...edge,
        style: {
          stroke: 'var(--vscode-progressBar-background)', // VSCode progress bar color
          strokeWidth: 3,
          strokeDasharray: '5,5',
          opacity: 1
        },
        markerEnd: 'arrowclosed'
      };
    } else {
      return {
        ...edge,
        style: {
          stroke: '#ffffff',
          strokeWidth: 2,
          strokeDasharray: '5,5',
          opacity: 0.2 // Fade non-connected edges
        },
        markerEnd: 'arrowclosed'
      };
    }
  });
  
  setEdges(updatedEdges);
};

// Check if an edge is connected to the hovered column
const isEdgeConnectedToColumn = (edge: any, hoveredColumn: { table: string; column: string }) => {
  if (!edge.data?.isColumnLineage) return false;
  
  const sourceColumn = edge.data.sourceColumn;
  const targetColumn = edge.data.targetColumn;
  const sourceTable = edge.source;
  const targetTable = edge.target;
  
  // Check if either end of the edge matches the hovered column
  const isSourceMatch = sourceTable === hoveredColumn.table && sourceColumn === hoveredColumn.column;
  const isTargetMatch = targetTable === hoveredColumn.table && targetColumn === hoveredColumn.column;
  
  return isSourceMatch || isTargetMatch;
};



const updateGraph = async () => {
  isLayouting.value = true;
  
  try {
    if (props.graphData.nodes.length > 0) {
      setNodes(props.graphData.nodes);
      setEdges(props.graphData.edges);
      
      props.graphData.nodes.forEach(node => {
        const nodeId = node.id;
        if (nodeColumnsExpanded.value[nodeId] === undefined) {
          nodeColumnsExpanded.value[nodeId] = false;
        }
      });
      
      await nextTick();
      updateEdgeHandles();
      
      isLayouting.value = false;
    } else {
      setNodes([]);
      setEdges([]);
      isLayouting.value = false;
    }
  } catch (error) {
    console.error("Error updating graph:", error);
    isLayouting.value = false;
  }
};

const onNodesDragged = (...args: any[]) => {
  const draggedNodes = args[0] as NodeDragEvent[];
  setNodes(
    nodes.value.map((node) => {
      const draggedNode = draggedNodes.find((n) => n.node.id === node.id);
      return draggedNode ? { ...node, position: draggedNode.node.position as XYPosition } : node;
    })
  );
};

watch(() => props.graphData, () => {
  updateGraph();
}, { deep: true, immediate: true });

// Cleanup timeout on unmount
onUnmounted(() => {
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value);
  }
});

</script>

<style scoped>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

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

.loading-overlay, .error-message {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}
</style> 