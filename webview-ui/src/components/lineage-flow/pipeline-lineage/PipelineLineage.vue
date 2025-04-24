<template>
  <div class="flow">
    <div v-if="isLoading || isUpdating" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span class="ml-2">{{ isLoading ? "Loading lineage data..." : "Updating layout..." }}</span>
    </div>
    <div v-else-if="error" class="error-message">
      <span class="ml-2">{{ error }}</span>
    </div>
    <VueFlow
      v-else
      v-model:elements="elements"
      :default-viewport="{ x: 150, y: 10, zoom: 1 }"
      :fit-view-on-init="false"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
      @paneReady="onPaneReady"
      ref="flowRef"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :data="nodeProps.data"
          :label="nodeProps.data.label"
          :selected-node-id="selectedNodeId"
          @node-click="onNodeClick"
          :show-expand-buttons="false"
        />
      </template>
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
import { PanelPosition, VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";
import { computed, onMounted, ref, watch, nextTick } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  buildPipelineLineage,
  generateGraph,
} from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import type { AssetDataset } from "@/types";
import type { Node, Edge } from "@vue-flow/core";

const props = defineProps<{
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const flowRef = ref(null);
const { nodes, edges, setNodes, setEdges, fitView } = useVueFlow();
const elements = computed(() => [...nodes.value, ...edges.value]);
const selectedNodeId = ref<string | null>(null);
const elk = new ELK();

const isUpdating = ref(false);
const initialLayoutComplete = ref(false);
const error = ref<string | null>(props.LineageError);

// Watch for changes in pipelineData
watch(
  () => props.pipelineData,
  (newVal) => {
    if (newVal) {
      initializeGraph();
    }
  },
  { immediate: true }
);

// Initialize graph with focus asset
const initializeGraph = async () => {
  if (!props.pipelineData) return;
  // Build complete lineage data with calculated downstream relationships
  const lineageData = buildPipelineLineage(props.pipelineData);

  // Generate initial graph focused on the specified asset
  const { nodes: initialNodes, edges: initialEdges } = generateGraph(
    lineageData,
    props.assetDataset?.name || ""
  );

  setNodes(initialNodes);
  setEdges(initialEdges);

  // Apply initial layout
  await applyLayout();

  // Fit view after initial render
  setTimeout(() => {
    fitView({ padding: 0.2 });
  }, 50);
};

// Function to apply ELK layout
async function applyLayout() {
  if (nodes.value.length === 0) return;

  isUpdating.value = true;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "5",
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
      width: 224, // Same as node-content width
      height: 80, // Approximate height
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

      // Mark layout as complete
      initialLayoutComplete.value = true;
      isUpdating.value = false;
    }
  } catch (error) {
    console.error("Error applying ELK layout:", error);
    isUpdating.value = false;
  }
}

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

const onNodeClick = (nodeId: string) => {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId;
};

const onPaneReady = () => {
  if (!initialLayoutComplete.value && nodes.value.length > 0) {
    applyLayout();
  }
};

onMounted(() => {
  initializeGraph();
});
</script>

<style>
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
  /* Force horizontal layout of buttons */
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

.loading-overlay {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}

.error-message {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}
</style>
