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
import { ref, watch, nextTick, computed, defineProps, defineEmits } from "vue";
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

const { nodes, edges, setNodes, setEdges, fitView } = useVueFlow();
const elements = computed(() => [...nodes.value, ...edges.value]);
const isLayouting = ref(false);
const flowRef = ref(null);
const elk = new ELK();

const handleViewSwitch = () => {
  emit('change-view', 'direct');
};

const applyLayout = async (inputNodes?: any[], inputEdges?: any[]) => {
  const nodesToLayout = inputNodes || nodes.value;
  const edgesToLayout = inputEdges || edges.value;
  
  if (nodesToLayout.length === 0) return { nodes: [], edges: [] };
  
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "150",
      "elk.spacing.nodeNode": "50",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "PREFER_NODES",
      "elk.layered.crossingMinimization.semiInteractive": "true",
      "elk.layered.unnecessaryBendpoints": "true",
    },
    children: nodesToLayout.map((node) => {
      const columns = node.data.asset.columns || [];
      const baseHeight = 70; 
      const heightPerColumn = 15;
      const newHeight = baseHeight + columns.length * heightPerColumn;

      return {
        id: node.id,
        width: 150,
        height: newHeight,
        labels: [{ text: node.data.label }],
      };
    }),
    edges: edgesToLayout.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layout = await elk.layout(elkGraph);
    
    if (layout.children && layout.children.length) {
      const layoutedNodes = nodesToLayout.map((node) => {
        const layoutNode = layout.children?.find((child: any) => child.id === node.id);
        return layoutNode
          ? {
              ...node,
              position: {
                x: layoutNode.x ?? 0,
                y: layoutNode.y ?? 0,
              },
              zIndex: 1,
            }
          : node;
      });
      
      return { nodes: layoutedNodes, edges: edgesToLayout };
    }
  } catch (error) {
    console.error("Failed to apply ELK layout:", error);
  }
  
  return { nodes: nodesToLayout, edges: edgesToLayout };
};

const updateGraph = async () => {
  isLayouting.value = true;
  
  try {
    if (props.graphData.nodes.length > 0) {
      const layoutedGraphData = await applyLayout(props.graphData.nodes, props.graphData.edges);
      
      setNodes(layoutedGraphData.nodes);
      setEdges(layoutedGraphData.edges);
      
      await nextTick();
      isLayouting.value = false;
      
      await nextTick();
      fitView({ padding: 0.2, duration: 300 });
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

const onNodesDragged = (draggedNodes: NodeDragEvent[]) => {
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