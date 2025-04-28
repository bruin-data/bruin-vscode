<template>
  <div class="flow">
    <div v-if="isLoading || isUpdating" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span class="ml-2">{{ isLoading ? 'Loading lineage data...' : 'Updating layout...' }}</span>
    </div>
    <div v-else-if="error" class="error-message">
      <span class="ml-2">{{ error }}</span>
    </div>
    
    <!-- Asset View -->
    <VueFlow
      v-if="!showPipelineView"
      v-model:elements="elements"
      :default-viewport="{ x: 150, y: 10, zoom: 1 }"
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
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
          :node-props="nodeProps"
          :label="nodeProps.data.label"
          :expand-all-downstreams="expandAllDownstreams"
          :expand-all-upstreams="expandAllUpstreams"
          @addUpstream="onAddUpstream"
          @addDownstream="onAddDownstream"
          @node-click="onNodeClick"
          :selected-node-id="selectedNodeId"
          :show-expand-buttons="true"
        />
      </template>
      
      <!-- Filter Panel -->
      <Panel position="top-right">
        <div
          v-if="!expandPanel"
          @click="expandPanel = !expandPanel"
          class="flex items-center p-2 gap-1 bg-transparent border border-notificationCenter-border rounded cursor-pointer hover:bg-editorWidget-bg transition-colors"
        >
          <FunnelIcon class="w-4 h-4 text-progressBar-bg" />
          <span class="text-[0.65rem] text-editor-fg">{{ showPipelineView ? 'Pipeline View' : filterLabel }}</span>
        </div>
        <div
          v-else
          class="bg-transparent hover:bg-editorWidget-bg border border-notificationCenter-border rounded"
        >
          <div
            class="flex items-center text-[0.65rem] justify-between border-b border-notificationCenter-border"
          >
            <div class="flex items-center gap-1">
              <FunnelIcon class="w-4 h-4 text-progressBar-bg" />
              <span class="text-[0.65rem] text-editor-fg uppercase p-1">view options</span>
            </div>
            <vscode-button appearance="icon" @click="expandPanel = false">
              <XMarkIcon class="w-4 h-4 text-progressBar-bg" />
            </vscode-button>
          </div>

          <!-- Filter Options (only shown for Asset View) -->
          <div v-if="!showPipelineView" class="mt-2 pt-2 border-t border-notificationCenter-border">
            <div class="text-[0.65rem] text-editor-fg uppercase px-2 mb-1">dependency filter</div>
            <vscode-radio-group :value="filterType" orientation="vertical" class="radio-group">
              <vscode-radio value="pipeline" class="radio-item" @click="handlePipelineView">
              <span class="radio-label">Pipeline View</span>
            </vscode-radio>
              <vscode-radio value="direct" class="radio-item" @click="handleDirectFilter">
                <span class="radio-label text-editor-fg">Direct only</span>
              </vscode-radio>

              <vscode-radio value="all" class="radio-item" @click="handleAllFilter">
                <div class="all-options">
                  <span class="radio-label text-editor-fg">All</span>
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
          </div>
          
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
    
    <!-- Pipeline View - Using the separate PipelineLineage component -->
    <PipelineLineage
      v-if="showPipelineView"
      :assetDataset="props.assetDataset"
      :pipelineData="props.pipelineData"
      :isLoading="isLoading"
      :LineageError="props.LineageError"
      @showAssetView="handleAssetView"
    />
  </div>
</template>

<script setup lang="ts">
import { PanelPosition, VueFlow, useVueFlow, Panel } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";
import type { NodeDragEvent, XYPosition } from "@vue-flow/core";
import { computed, onMounted, defineProps, watch, ref, nextTick, onUnmounted } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import PipelineLineage from "@/components/lineage-flow/pipeline-lineage/PipelineLineage.vue";
import {
  generateGraphForDownstream,
  generateGraphForUpstream,
  generateGraphFromJSON,
} from "@/utilities/graphGenerator";
import type { AssetDataset } from "@/types";
import { getAssetDataset } from "./useAssetLineage";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import { FunnelIcon } from "@heroicons/vue/24/outline";
import { updateValue } from "@/utilities/helper";

const props = defineProps<{
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const flowRef = ref(null);
const { nodes, edges, addNodes, addEdges, setNodes, setEdges, fitView } = useVueFlow();
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
const showPipelineView = ref(false);
const filterLabel = computed(() => {
  if (filterType.value === "direct") {
    return "Direct only";
  }
  if (expandAllUpstreams.value && expandAllDownstreams.value) {
    return "All Dependencies";
  }
  if (expandAllDownstreams.value) {
    return "All Downstreams";
  }
  return "All Upstreams";
});
const elk = new ELK();

const isLoading = ref(true);
const error = ref<string | null>(props.LineageError);
const expandAllDownstreams = ref(false);
const expandAllUpstreams = ref(false);
const isUpdating = ref(false);
const graphInitialized = ref(false);
const initialLayoutComplete = ref(false);
let fitViewTimeout: ReturnType<typeof setTimeout>;
const { viewport, setViewport } = useVueFlow();

// State to track expanded nodes
const expandedNodes = ref<{ [key: string]: boolean }>({});

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


// Reset filter state when new data is loaded
const resetFilterState = () => {
  filterType.value = "direct";
  expandAllUpstreams.value = false;
  expandAllDownstreams.value = false;
  expandedUpstreamNodes.value = [];
  expandedUpstreamEdges.value = [];
  expandedDownstreamNodes.value = [];
  expandedDownstreamEdges.value = [];
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
  if (nodes.value.length === 0) {
    return;
  }
  
  isUpdating.value = true;
  
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
      
      // Wait for node positions to be applied before fit view
      await nextTick();
      
      // Manual fit view with proper padding
      fitViewTimeout = setTimeout(() => {
        fitView({ padding: 0.2, duration: 200 });
      }, 300);
      
      // Mark layout as complete and graph as initialized
      initialLayoutComplete.value = true;
      graphInitialized.value = true;
      
      // Allow a short delay before removing the loading state
      setTimeout(() => {
        isUpdating.value = false;
      }, 100);
    }
  } catch (error) {
    console.error("Failed to apply ELK layout:", error);
    isUpdating.value = false;
  }
};

// Function to process the asset properties and update nodes and edges
const processProperties = async () => {
  if (!props.assetDataset || !props.pipelineData) {
    isLoading.value = error.value === null ? true : false;
    return;
  }

  // Keep isLoading true while processing
  isLoading.value = true;
  error.value = null;
  
  // Reset layout completion flags
  initialLayoutComplete.value = false;
  graphInitialized.value = false;

  try {
    resetFilterState();
    
    // Clear any existing nodes/edges
    setNodes([]);
    setEdges([]);
    
    const { nodes: generatedNodes, edges: generatedEdges } = generateGraphFromJSON(
      props.assetDataset
    );

    baseNodes.value = generatedNodes;
    baseEdges.value = generatedEdges;
    
    // Update the graph data but don't render yet (still in loading state)
    await updateGraph();
  
    
    // Only now apply layout (still in loading state)
    await updateLayout();
    
    // Loading is complete after layout is done
    isLoading.value = false;
  } catch (err) {
    console.error("Error processing properties:", err);
    error.value = "Failed to generate lineage graph. Please try again.";
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

  // Remove duplicates
  const uniqueNodes = allNodes.filter(
    (node, index, self) => index === self.findIndex((n) => n.id === node.id)
  );

  const uniqueEdges = allEdges.filter(
    (edge, index, self) => index === self.findIndex((e) => e.id === edge.id)
  );

  // Update nodes and edges atomically
  setNodes(uniqueNodes);
  setEdges(uniqueEdges);
   // Reset layout completion when graph changes
   initialLayoutComplete.value = false;
};

// Event handlers for adding upstream and downstream nodes
const onAddUpstream = async (nodeId: string) => {
  isUpdating.value = true;
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
  isUpdating.value = true;
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

const debouncedUpdateGraph = debounce(async () => {
  isUpdating.value = true; // Show loading state
  const currentViewport = viewport.value; // Store current viewport
  await updateGraph();
  await updateLayout();
  setViewport(currentViewport); // Restore viewport
  isUpdating.value = false; // Hide loading state
}, 100);

const toggleUpstream = async (event: Event) => {
  event.stopPropagation();
  if (filterType.value === "all") {
    expandAllUpstreams.value = !expandAllUpstreams.value;
    await handleExpandAllUpstreams();
    debouncedUpdateGraph(); // Use debounced update
  }
};

const toggleDownstream = async (event: Event) => {
  event.stopPropagation();
  if (filterType.value === "all") {
    expandAllDownstreams.value = !expandAllDownstreams.value;
    await handleExpandAllDownstreams();
    debouncedUpdateGraph(); // Use debounced update
  }
};

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

  debouncedUpdateGraph(); // Use debounced update
};

const handleAllFilter = async (event: Event) => {
  event.stopPropagation();
  expandAllUpstreams.value = true;
  expandAllDownstreams.value = true;
  await handleExpandAllUpstreams();
  await handleExpandAllDownstreams();
  filterType.value = "all";
  debouncedUpdateGraph(); // Use debounced update
};

// View switching handlers
const handleAssetView = async (event?: Event) => {
  if (event) event.stopPropagation();
  showPipelineView.value = false;
};

const handlePipelineView = async (event?: Event) => {
  if (event) event.stopPropagation();
  showPipelineView.value = true;
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
  expandedNodes.value = {};
  
  // Reset to asset view
  showPipelineView.value = false;
  
  await updateGraph();
  await updateLayout();
};

// Update the onMounted hook
onMounted(() => {
  processProperties();
  
  try {
    const savedState = localStorage.getItem("graphFilterState");
    if (savedState) {
      const { filterType: savedFilter, upstream, downstream, viewType: savedViewType } = JSON.parse(savedState);
      filterType.value = savedFilter;
      expandAllUpstreams.value = upstream;
      expandAllDownstreams.value = downstream;
      showPipelineView.value = savedViewType === 'pipeline';
      
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
    if (newAssetDataset && newPipelineData && !showPipelineView.value) {
      processProperties();
    }
  },
  { immediate: true }
);

watch([filterType, expandAllUpstreams, expandAllDownstreams, showPipelineView], () => {
  localStorage.setItem(
    "graphFilterState",
    JSON.stringify({
      filterType: filterType.value,
      upstream: expandAllUpstreams.value,
      downstream: expandAllDownstreams.value,
      viewType: showPipelineView.value ? 'pipeline' : 'asset',
    })
  );
  
  if (!showPipelineView.value) {
    debouncedUpdateGraph(); // Use debounced update for asset view
  }
});

onUnmounted(() => {
  clearTimeout(fitViewTimeout);
});

// Method to toggle the expanded state of a node
const toggleNodeExpand = (nodeId: string) => {
  if (expandedNodes.value[nodeId]) {
    expandedNodes.value[nodeId] = false;
  } else {
    expandedNodes.value[nodeId] = true;
  }
};
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
  @apply flex items-center justify-center w-full gap-2;
}

.toggle-buttons {
  @apply flex gap-1;
}

.toggle-btn {
  @apply w-5 h-5 text-center rounded-full border-2 border-notificationCenter-border bg-transparent 
         text-[0.5rem] font-medium flex items-center justify-center cursor-pointer
         transition-all duration-200;
}

.toggle-btn.active {
  @apply bg-progressBar-bg border-progressBar-bg text-editor-fg;
}

vscode-checkbox {
  @apply text-xs;
}

.loading-overlay {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}

.error-message {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}
</style>