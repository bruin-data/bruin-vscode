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
      :default-viewport="{ x: 150, y: 10 }"
      showFitView
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
          :expand-all-downstreams="expandAllDownstreams"
          :expand-all-upstreams="expandAllUpstreams"
          @addUpstream="onAddUpstream"
          @addDownstream="onAddDownstream"
          @node-click="onNodeClick"
          :selected-node-id="selectedNodeId"
        />
      </template>
      <Panel position="top-right">
        <div
          v-if="!expandPanel"
          @click="expandPanel = !expandPanel"
          class="flex items-center p-2 gap-1 bg-editorWidget-bg border border-notificationCenter-border rounded cursor-pointer hover:bg-editorWidget-bg transition-colors"
        >
          <FunnelIcon class="w-4 h-4 text-progressBar-bg" />
          <span class="text-[0.65rem]">{{ filterLabel }}</span>
        </div>
        <div v-else class="bg-editorWidget-bg border border-notificationCenter-border rounded">
          <div
            class="flex items-center text-[0.65rem] justify-between border-b border-notificationCenter-border"
          >
            <div class="flex items-center gap-1">
              <FunnelIcon class="w-4 h-4 text-progressBar-bg" />
              <span class="text-[0.65rem] uppercase p-1">dependencies filter</span>
            </div>
            <vscode-button appearance="icon" @click="expandPanel = false">
              <XMarkIcon class="w-4 h-4 text-progressBar-bg" />
            </vscode-button>
          </div>

          <vscode-radio-group :value="filterType" orientation="vertical" class="radio-group">
            <vscode-radio value="direct" class="radio-item" @click="handleDirectFilter">
              <span class="radio-label">Direct only</span>
            </vscode-radio>

            <vscode-radio value="all" class="radio-item" @click="handleAllFilter">
              <div class="all-options">
                <span class="radio-label">All</span>
                <div class="toggle-buttons">
                  <button
                    class="toggle-btn"
                    :class="{ active: expandAllUpstreams }"
                    @click.stop="toggleUpstream"
                  >
                    U
                  </button>
                  <button
                    class="toggle-btn"
                    :class="{ active: expandAllDownstreams }"
                    @click.stop="toggleDownstream"
                  >
                    D
                  </button>
                </div>
              </div>
            </vscode-radio>
          </vscode-radio-group>
          <div class="flex justify-end px-2 pb-1">
            <vscode-link
              @click="handleReset"
              class="text-xs text-editor-fg hover:text-progressBar-bg transition-colorseset-link"
            >
              Reset
            </vscode-link>
          </div>
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
import { PanelPosition, VueFlow, useVueFlow, Panel } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";
import type { NodeDragEvent, XYPosition } from "@vue-flow/core";
import { computed, onMounted, defineProps, watch, ref } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  generateGraphForDownstream,
  generateGraphForUpstream,
  generateGraphFromJSON,
} from "@/utilities/graphGenerator";
import type { AssetDataset } from "@/types";
import { getAssetDataset } from "./useAssetLineage";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import { FunnelIcon } from "@heroicons/vue/24/outline";
import { vscode } from "@/utilities/vscode";

const props = defineProps<{
  assetDataset?: AssetDataset | null; // Change this to accept null
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const { nodes, edges, addNodes, addEdges, setNodes, setEdges } = useVueFlow();
const baseNodes = ref<any[]>([]);
const baseEdges = ref<any[]>([]);
const elements = computed(() => [...nodes.value, ...edges.value]);
const expandPanel = ref(false);
const expandedDownstreamNodes = ref<any[]>([]);
const expandedDownstreamEdges = ref<any[]>([]);
const expandedUpstreamNodes = ref<any[]>([]);
const expandedUpstreamEdges = ref<any[]>([]);
const selectedNodeId = ref<string | null>(null);
const filterType = ref<"direct" | "all">("direct");
const filterLabel = computed(() =>
  filterType.value === "direct" ? "Direct only" : "All Dependencies"
);
const elk = new ELK();

const isLoading = ref(true);
const error = ref<string | null>(props.LineageError);
const expandAllDownstreams = ref(false);
const expandAllUpstreams = ref(false);
error.value = !props.assetDataset ? "No Lineage Data Available" : null;

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

const onPaneReady = () => {
  updateLayout();
};

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
    console.log("Base Nodes:", generatedNodes);
    console.log("Base Edges:", generatedEdges);

    baseNodes.value = generatedNodes;
    baseEdges.value = generatedEdges;
    updateGraph();
    updateLayout();
  } catch (err) {
    console.error("Error processing properties:", err);
    error.value = "Failed to generate lineage graph. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

const updateGraph = () => {
  const allNodes = [
    ...baseNodes.value,
    ...expandedDownstreamNodes.value,
    ...expandedUpstreamNodes.value,
  ];

  const allEdges = [
    ...baseEdges.value,
    ...expandedDownstreamEdges.value,
    ...expandedUpstreamEdges.value,
  ];

  console.log("All Nodes:", allNodes);
  console.log("All Edges:", allEdges);

  // Remove duplicates
  const uniqueNodes = allNodes.filter(
    (node, index, self) => index === self.findIndex((n) => n.id === node.id)
  );

  const uniqueEdges = allEdges.filter(
    (edge, index, self) => index === self.findIndex((e) => e.id === edge.id)
  );

  console.log("Unique Nodes:", uniqueNodes);
  console.log("Unique Edges:", uniqueEdges);

  setNodes(uniqueNodes);
  setEdges(uniqueEdges);
};


// Update handler methods
const handleDirectFilter = async (event: Event) => {
  event.stopPropagation();
  filterType.value = "direct";
  expandAllUpstreams.value = false;
  expandAllDownstreams.value = false;

  // Clear expanded nodes
  expandedUpstreamNodes.value = [];
  expandedUpstreamEdges.value = [];
  expandedDownstreamNodes.value = [];
  expandedDownstreamEdges.value = [];

  await updateGraph();
  await updateLayout();
};

const handleAllFilter = async (event: Event) => {
  event.stopPropagation();
  filterType.value = "all";
  await updateGraph();
  await updateLayout();
};

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
    const { nodes: downstreamNodes, edges: downstreamEdges } = allDownstreams?.reduce(
      (acc, asset) => {
        const result = generateGraphForDownstream(asset.name, props.pipelineData);
        return {
          nodes: [...acc.nodes, ...result.nodes],
          edges: [...acc.edges, ...result.edges],
        };
      },
      { nodes: [], edges: [] }
    );

    expandedDownstreamNodes.value = downstreamNodes;
    expandedDownstreamEdges.value = downstreamEdges;
  } else {
    // Collapse downstream nodes to only show direct downstreams
    expandedDownstreamNodes.value = [];
    expandedDownstreamEdges.value = [];
  }

  updateGraph();
  await updateLayout();
};

const handleExpandAllUpstreams = async () => {
  if (expandAllUpstreams.value) {
    // Recursively fetch all upstream assets
    const fetchAllUpstreams = (assetName: string, upstreamAssets: any[] = []): any[] => {
      const currentAsset = props.pipelineData.assets.find((asset: any) => asset.name === assetName);
      if (!currentAsset) return upstreamAssets;

      const asset = getAssetDataset(props.pipelineData, currentAsset.id);
      upstreamAssets.push(asset);

      asset?.upstreams?.forEach((upstreamAsset) => {
        fetchAllUpstreams(upstreamAsset.name, upstreamAssets);
      });

      return upstreamAssets;
    };

    // Start with the current asset's upstream
    const allUpstreams = props.assetDataset?.upstreams?.reduce((acc: any[], upstream: any) => {
      return acc.concat(fetchAllUpstreams(upstream.name));
    }, []);

    // Add all upstream nodes and edges to the graph
    const { nodes: upstreamNodes, edges: upstreamEdges } = allUpstreams?.reduce(
      (acc, asset) => {
        const result = generateGraphForUpstream(
          asset.name,
          props.pipelineData,
          props.assetDataset?.id ?? ""
        );
        return {
          nodes: [...acc.nodes, ...result.nodes],
          edges: [...acc.edges, ...result.edges],
        };
      },
      { nodes: [], edges: [] }
    );
    expandedUpstreamNodes.value = upstreamNodes;
    expandedUpstreamEdges.value = upstreamEdges;
  } else {
    // Collapse upstream nodes to only show direct upstreams
    expandedUpstreamNodes.value = [];
    expandedUpstreamEdges.value = [];
  }
  updateGraph();
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

watch(
  () => [props.assetDataset, props.pipelineData],
  ([newAssetDataset, newPipelineData]) => {
    if (newAssetDataset && newPipelineData) {
      processProperties();
    }
  },
  { immediate: true }
);
/**
 * Debounce function to limit the rate at which a function can fire.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to wait before calling the function.
 * @returns {Function} - A debounced version of the function.
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const toggleUpstream = async (event: Event) => {
  event.stopPropagation();
  if (filterType.value === "all") {
    console.log("Toggling upstreams");
    expandAllUpstreams.value = !expandAllUpstreams.value;
    await handleExpandAllUpstreams();
  }
};

const toggleDownstream = async (event: Event) => {
  event.stopPropagation();
  if (filterType.value === "all") {
    console.log("Toggling downstreams");
    expandAllDownstreams.value = !expandAllDownstreams.value;
     await handleExpandAllDownstreams();
  }
};

const handleReset = async (event: Event) => {
  event.stopPropagation();
  filterType.value = "direct";
  expandAllUpstreams.value = false;
  expandAllDownstreams.value = false;
  expandedUpstreamNodes.value = [];
  expandedUpstreamEdges.value = [];
  expandedDownstreamNodes.value = [];
  expandedDownstreamEdges.value = [];
  await updateGraph();
  await updateLayout();
};

// Update the onMounted hook
onMounted(() => {
  processProperties();
  try {
    const savedState = localStorage.getItem("graphFilterState");
    if (savedState) {
      const { filterType: savedFilter, upstream, downstream } = JSON.parse(savedState);
      filterType.value = savedFilter;
      expandAllUpstreams.value = upstream;
      expandAllDownstreams.value = downstream;
      // If we have expanded states, trigger the appropriate updates
      if (upstream) {
        handleExpandAllUpstreams();
      }
      if (downstream) {
        handleExpandAllDownstreams();
      }
    }
  } catch (error) {
    console.error("Error loading saved state:", error);
  }
});
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
watch([filterType, expandAllUpstreams, expandAllDownstreams], () => {
  localStorage.setItem(
    "graphFilterState",
    JSON.stringify({
      filterType: filterType.value,
      upstream: expandAllUpstreams.value,
      downstream: expandAllDownstreams.value,
    })
  );
});
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.flow {
  @apply flex h-screen w-full p-0 !important;
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

.error-message {
  flex-direction: column;
}

/* Radio group styling */
.radio-group {
  @apply px-1;
}

.radio-label {
  @apply text-[0.65rem] font-normal;
}

/* Toggle buttons */
.all-options {
  @apply flex items-center justify-center w-full gap-1;
}

.toggle-buttons {
  @apply flex gap-2;
}

.toggle-btn {
  @apply w-6 h-6 rounded-full border-2 border-notificationCenter-border bg-transparent 
         text-xs font-medium flex items-center justify-center cursor-pointer
         transition-all duration-200 active:bg-rose-400;
}

vscode-checkbox {
  @apply text-xs;
}
</style>
