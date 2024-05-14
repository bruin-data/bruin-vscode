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
import { ref, onMounted, onBeforeUnmount, reactive, nextTick, watchEffect, watch } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";

const lineageSuccess = ref(null);
const lineageError = ref(null);

const nodeTypes: NodeTypesObject = {
  custom: CustomNode as any,
};

onMounted(async () => {
  window.addEventListener("message", receiveMessage);
  await updateLayout();
});

onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
});

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

const nodes = ref([
  {
    id: "1",
    type: "custom",
    isFocusAsset: false,
    data: {
      type: "asset",
      asset: { name: "asset 2", type: "bq.sql", hasDownstreams: true },
      label: "Node 1",
      hasUpstreamForClicking: true,
    },
    position: { x: 0, y: 0 },
  },
  {
    id: "2",
    type: "custom",
    data: {
      type: "asset",
      asset: { name: "asset 1", type: "python", hasUpstreams: true },
      label: "Node 2",
    },
    hasUpstreamForClicking: true,
    position: { x: 0, y: 0 },
  },
  {
    id: "3",
    type: "custom",
    isFocusAsset: false,
    data: {
      type: "asset",
      asset: { name: "asset 3", type: "pg.sql", hasUpstreams: true, hasDownstreams: true },
      label: "Node 3",
    },
    position: { x: 0, y: 0 },
  },
  {
    id: "4",
    type: "custom",
    data: {
      type: "asset",

      asset: { name: "asset 1", type: "ingestr", hasUpstreams: true },
      label: "Node 4",
    },
    position: { x: 0, y: 0 },
  },
  {
    id: "5",
    type: "custom",
    data: {
      type: "asset",

      asset: { name: "asset 5", type: "python" },
      label: "Node 5",
    },
    position: { x: 0, y: 0 },
  },
  {
    id: "6",
    type: "custom",
    data: {
      type: "asset",

      asset: { name: "asset 6", type: "python"},
      label: "Node 6",
    },
    position: { x: 0, y: 0 },
  },
  {
    id: "7",
    type: "custom",
    data: {
      type: "asset",

      asset: { name: "asset 6", type: "python"},
      label: "Node 7",
    },
    position: { x: 0, y: 0 },
  },
]);

const edges = ref([
  { id: "e1-3", source: "1", target: "3" },
  //{ id: "e3-5", source: "3", target: "5" },
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-4", source: "1", target: "4" },
]);

const elk = new ELK();
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

const updateLayout = async () => {
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.spacing.nodeNodeBetweenLayers": "150",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.direction": "RIGHT",
      "elk.spacing.componentComponent": "200", // Increase component spacing
      "elk.layered.unnecessaryBendpoints": "true", // Reduce bend points for cleaner layout
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

watch(
  nodes,
  () => {
    console.log("Nodes updated", nodes.value);
  },
  { deep: true }
);
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
