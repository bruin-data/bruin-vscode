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
      :default-viewport="{ x: 250, y: 100, zoom: 0.7 }"
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
          @node-click="onNodeClick"
          :selected-node-id="selectedNodeId"
        />
      </template>
      <Panel position="top-left" class="flex flex-col bg-editor-bg border border-commandCenter-border px-2 text-editor-fg">
          <vscode-checkbox v-model="expandAllUpstreams" @change=""> Show All Upstreams </vscode-checkbox>
          <vscode-checkbox v-model="expandAllDownstreams" @change="handleExpandAllDownstreams"> Show All Downstreams </vscode-checkbox>
      </Panel>
      <Controls :position="controlsPosition" />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { PanelPosition, VueFlow, useVueFlow, Panel } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";
import type { NodeDragEvent, XYPosition } from "@vue-flow/core";
import { computed, onMounted, defineProps, watch, ref, nextTick } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  generateGraphForDownstream,
  generateGraphForUpstream,
  generateGraphFromJSON,
} from "@/utilities/graphGenerator";
import type { AssetDataset } from "@/types";
import { getAssetDataset } from "./useAssetLineage";

const props = defineProps<{
  assetDataset?: AssetDataset | null; // Change this to accept null
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const selectedNodeId = ref<string | null>(null);
const controlsPosition = PanelPosition.TopRight;
const onNodeClick = (nodeId: string, event: MouseEvent) => {
  console.log("Node clicked:", nodeId);
  if (selectedNodeId.value === nodeId) {
    // If clicking the same node, close the popup
    selectedNodeId.value = null;
  } else {
    // If clicking a different node, open its popup
    selectedNodeId.value = nodeId;
  }
};

const { nodes, edges, addNodes, addEdges, setNodes, setEdges, fitView } = useVueFlow();
const elements = computed(() => [...nodes.value, ...edges.value]);
const onPaneReady = () => {
  updateLayout();
};
const elk = new ELK();

const isLoading = ref(true);
const error = ref<string | null>(props.LineageError);
const expandAllDownstreams = ref(false);
const expandAllUpstreams = ref(false);
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
  const { nodes: newNodes, edges: newEdges } = generateGraphForUpstream(
    nodeId,
    props.pipelineData,
    props.assetDataset?.id ?? ""
  );
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

const handleExpandAllDownstreams = async () => {
  console.log("Expanding downstream nodes", expandAllDownstreams.value);
  expandAllDownstreams.value = !expandAllDownstreams.value;

  if (expandAllDownstreams.value) {
    // Recursively fetch all downstream assets
    const fetchAllDownstreams = (assetName: string, downstreamAssets: any[] = []): any[] => {
      const currentAsset = props.pipelineData.assets.find((asset: any) => asset.name === assetName);
      if (!currentAsset) return downstreamAssets;

      const asset = getAssetDataset(props.pipelineData, currentAsset.id);
      downstreamAssets.push(asset);

      asset?.downstream?.forEach((downstreamAsset) => {
        fetchAllDownstreams(downstreamAsset.name, downstreamAssets);
      });

      return downstreamAssets;
    };

    // Start with the current asset's downstream
    const allDownstreams = props.assetDataset?.downstream?.reduce((acc: any[], downstream: any) => {
      return acc.concat(fetchAllDownstreams(downstream.name));
    }, []);

    // Add all downstream nodes and edges to the graph
    allDownstreams?.forEach((downstream) => {
      const { nodes: newNodes, edges: newEdges } = generateGraphForDownstream(
        downstream.name,
        props.pipelineData
      );
      addNodes(newNodes);
      addEdges(newEdges);
    });

    await updateLayout();
  } else {
    // Collapse downstream nodes to only show direct downstreams
    const directDownstreams = props.assetDataset?.downstream || [];
    const { nodes: newNodes, edges: newEdges } = generateGraphFromJSON({
      ...props.assetDataset,
      downstream: directDownstreams,
    });
    setNodes(newNodes);
    setEdges(newEdges);
    await updateLayout();
  }
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
  @apply flex h-screen w-full p-0 !important;
}

.vue-flow__controls {
  background-color: var(--vscode-editorWidget-background) !important;
  color: var(--vscode-editor-background) !important;
}
.vue-flow__controls-button {
  background-color: var(--vscode-editor-foreground) !important;
  color: var(--vscode-editor-background) !important;
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
