<template>
  <div class="flow">
    <div v-if="isLoading" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span class="ml-2">Loading lineage data...</span>
    </div>
    <div v-else-if="error" class="error-message">
      <span class="ml-2">{{ error }}</span>
    </div>
    <VueFlow
      v-model:elements="elements"
      :default-viewport="{ x: 50, zoom: 0.8 }"
      :min-zoom="0.2"
      :max-zoom="4"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
      @paneReady="onPaneReady"
      @nodesDragged="onNodesDragged"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :data="nodeProps.data"
          :node-props="nodeProps"
          :label="nodeProps.data.label"
          @addUpstream="onAddUpstream"
          @addDownstream="onAddDownstream"
        />
      </template>

      <Controls />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import type { NodeTypesObject, Node, Edge, NodeDragEvent, XYPosition } from "@vue-flow/core";
import { computed, onMounted, defineProps, watch, ref } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  generateGraphForDownstream,
  generateGraphForUpstream,
  generateGraphFromJSON,
} from "@/utilities/graphGenerator";
import type { AssetDataset } from "@/types";

const props = defineProps<{
  assetDataset?: AssetDataset;
  pipelineData: any;
  isLoading: boolean,  // Pass loading state
  LineageError: string | null,  // Pass error state
}>();

console.log("=====================================\n");

console.log("Lineage Error from webview ", props.LineageError);

const nodeTypes: NodeTypesObject = {
  custom: CustomNode as any,
};

const { nodes, edges, addNodes, addEdges, setNodes, setEdges } = useVueFlow();
const elements = computed(() => [...nodes.value, ...edges.value]);
const onPaneReady = () => {
  updateLayout();
};
const elk = new ELK();

const isLoading = ref(true);
const error = ref<string | null>(props.LineageError);

error.value = !props.assetDataset ? "No Lineage Data Available" : null;



// Function to update node positions based on ELK layout
const updateNodePositions = (layout: any) => {
  const updatedNodes = nodes.value.map((node) => {
    const layoutNode = layout.children.find((child: any) => child.id === node.id);
    if (layoutNode) {
      return {
        ...node,
        position: { x: layoutNode.x, y: layoutNode.y },
        zIndex: 1,
      };
    }
    return node;
  });
  setNodes(updatedNodes);
};

// Function to update the layout using ELK
const updateLayout = async () => {
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "150",
      "elk.spacing.nodeNode": "0.0",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.cycleBreaking.strategy": "DEPTH_FIRST",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.considerModelOrder.strategy": "PREFER_NODES",
      "elk.layered.crossingMinimization.semiInteractive": "true",
      "elk.layered.unnecessaryBendpoints": "true",
    },
    children: nodes.value.map((node) => ({
      id: node.id,
      width: 150,
      height: 70,
      labels: [{ text: node.data.label }],
      position: { x: node.position.x, y: node.position.y },
    })),
    edges: edges.value.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layout = await elk.layout(elkGraph);
    if (layout.children && layout.children.length) {
      updateNodePositions(layout);
    }
  } catch (error) {
    console.error("Failed to apply ELK layout:", error);
  }
};

// Function to process the asset properties and update nodes and edges
const processProperties = () => {
  if (!props.assetDataset || !props.pipelineData) {

    isLoading.value = error.value === null ? true : false;
    return;
  }

  isLoading.value = error.value === null ? true : false;
  error.value = null;

 try {
    const { nodes: generatedNodes, edges: generatedEdges } = generateGraphFromJSON(
      props.assetDataset
    );
    addNodes(generatedNodes);
    addEdges(generatedEdges);

    updateLayout();
  } catch (err) {
    console.error("Error processing properties:", err);
    error.value = "Failed to generate lineage graph. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

// Watch for changes in props and update nodes and edges
watch(
  () => [props.assetDataset, props.pipelineData],
  ([newAssetDataset, newPipelineData]) => {
    if (newAssetDataset && newPipelineData) {
      processProperties();
    }
  },
  { immediate: true }
);

// Event handlers for adding upstream and downstream nodes
const onAddUpstream = async (nodeId: string) => {
  const { nodes: newNodes, edges: newEdges } = generateGraphForUpstream(nodeId, props.pipelineData, props.assetDataset?.id ?? "");
  addNodes(newNodes);
  addEdges(newEdges);
  await updateLayout();
};

const onAddDownstream = async (nodeId: string) => {
  const { nodes: newNodes, edges: newEdges } = generateGraphForDownstream(
    nodeId,
    props.pipelineData
  );
  addNodes(newNodes);
  addEdges(newEdges);
  await updateLayout();  
};

// Handle node dragging
const onNodesDragged = (draggedNodes: NodeDragEvent[]) => {
  const updatedNodes = nodes.value.map((node) => {
    const draggedNode = draggedNodes.find((n) => n.node.id === node.id);
    if (draggedNode) {
      return { ...node, position: draggedNode.node.position as XYPosition };
    }
    return node;
  });
  setNodes(updatedNodes);
};


onMounted(() => {
  processProperties();
});
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.flow {
  display: flex;
  padding: 1rem;
  height: 100vh;
  width: 100%;
}
.loading-overlay,
.error-message {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.error-message {
  flex-direction: column;
}

</style>
