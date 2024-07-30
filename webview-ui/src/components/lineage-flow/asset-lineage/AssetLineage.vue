<template>
  <div class="flow">
    <VueFlow
      :default-viewport="{ zoom: 0.8 }"
      :min-zoom="0.2"
      :max-zoom="4"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
      @nodesDragged="onNodesDragged"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :data="nodeProps.data"
          :node-props="nodeProps"
          :label="nodeProps.data.label"
          @add-upstream="onAddUpstream"
          @add-downstream="onAddDownstream"
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
import { ref, onMounted, defineProps, watch } from "vue";
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
}>();
const nodeTypes: NodeTypesObject = {
  custom: CustomNode as any,
};

const { nodes, edges, addNodes, addEdges, setNodes, setEdges } = useVueFlow();

const elk = new ELK();

// Function to update node positions based on ELK layout
const updateNodePositions = (layout: any) => {
  const updatedNodes = nodes.value.map((node) => {
    const layoutNode = layout.children.find((child: any) => child.id === node.id);
    if (layoutNode) {
      return {
        ...node,
        position: { x: layoutNode.x, y: layoutNode.y },
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
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.spacing.nodeNodeBetweenLayers": "150",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "0.0",
      "elk.layered.unnecessaryBendpoints": "true",
    },
    children: nodes.value.map((node) => ({
      id: node.id,
      width: 150,
      height: 70,
      labels: [{ text: node.data.label }],
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
  if (!props) return;
  // on node click update the props and re-render the graph
  const { nodes: generatedNodes, edges: generatedEdges } = generateGraphFromJSON(
    props.assetDataset,
  );
  addNodes(generatedNodes);
  addEdges(generatedEdges);

  updateLayout();
};

// Watch for changes in props and update nodes and edges
watch(
  () => props,
  (newValue) => {
    if (newValue) {
      processProperties();
    }
  },
  { immediate: true }
);

// Event handlers for adding upstream and downstream nodes
const onAddUpstream = (nodeId: string) => {
  const { nodes: newNodes, edges: newEdges } = generateGraphForUpstream(nodeId, props.pipelineData);
  addNodes(newNodes);
  addEdges(newEdges);
  updateLayout();
};

const onAddDownstream = (nodeId: string) => {
  const { nodes: newNodes, edges: newEdges } = generateGraphForDownstream(
    nodeId,
    props.pipelineData
  );
  addNodes(newNodes);
  addEdges(newEdges);
  updateLayout();
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
</style>
