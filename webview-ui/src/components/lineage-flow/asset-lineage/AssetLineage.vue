<template>
  <div class="flow">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :default-viewport="{ zoom: 0.8 }"
      :min-zoom="0.2"
      :max-zoom="4"
      class="basic-flow"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :is-focus-asset="true"
          :data="nodeProps.data"
          :node-props="nodeProps"
          :label="nodeProps.data.label"
        />
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { VueFlow, type NodeTypesObject } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { ref, onMounted, onBeforeUnmount, defineProps, watch } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import { generateGraphFromJSON } from "@/utilities/graphGenerator";
import type { AssetDataset } from "@/types";

const props = defineProps<AssetDataset>();

const nodeTypes: NodeTypesObject = {
  custom: CustomNode as any,
};

const nodes = ref<any[]>([]);
const edges = ref<any[]>([]);

const elk = new ELK();

// Function to update node positions based on ELK layout
const updateNodePositions = (layout) => {
  const updatedNodes = nodes.value.map((node) => {
    const layoutChild = layout.children.find((child) => child.id === node.id);
    if (layoutChild) {
      return { ...node, position: { x: layoutChild.x, y: layoutChild.y } };
    }
    return node;
  });
  nodes.value = updatedNodes;
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

  const { nodes: generatedNodes, edges: generatedEdges } = generateGraphFromJSON(props);
  nodes.value = generatedNodes;
  edges.value = generatedEdges;

  updateLayout();
};

// Watch for changes in props.properties and update nodes and edges
watch(
  () => props,
  (newValue) => {
    if (newValue) {
      processProperties();
    }
  },
  { immediate: true }
);

watch(nodes, () => {
  updateLayout();
});
// Event listener for messages
function receiveMessage(event) {
  if (!event) return;
  const envelope = event.data;
  switch (envelope.command) {
    case "pipeline":
      console.log("Pipeline Lineage, received");
      break;
    case "lineage-message":
      console.log("Lineage Message, received", envelope);
      break;
  }
}

onMounted(() => {
  window.addEventListener("message", receiveMessage);
  processProperties();
});

onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
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
