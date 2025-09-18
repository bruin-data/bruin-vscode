<template>
  <div class="flow">
    <div v-if="shouldShowLoading" class="loading-overlay">
      <vscode-progress-ring></vscode-progress-ring>
      <span class="ml-2">{{ isLayouting ? 'Positioning graph...' : 'Loading lineage data...' }}</span>
    </div>
    <div v-else-if="shouldShowError" class="error-message">
      <span class="ml-2">{{ error }}</span>
    </div>
    
    <!-- Asset View -->
    <VueFlow
      v-if="shouldShowAssetView"
      v-model:elements="elements"
      :fit-view-on-init="false"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
      @nodesDragged="onNodesDragged"
      @nodesInitialized="onAssetNodesInitialized"
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
          :show-expand-buttons="filterType === 'direct'"
        />
      </template>
      
      <!-- Filter Panel -->
      <FilterTab
        id="asset-filter-tab"
        :key="assetFilterTabKey"
        :filter-type="filterType"
        :expand-all-upstreams="expandAllUpstreams"
        :expand-all-downstreams="expandAllDownstreams"
        :show-pipeline-view="showPipelineView"
        :show-column-view="showColumnView"
        @update:filter-type="(value) => { filterType = value; if (value === 'direct') expandedNodes = {}; }"
        @update:expand-all-upstreams="expandAllUpstreams = $event"
        @update:expand-all-downstreams="expandAllDownstreams = $event"
        @pipeline-view="handlePipelineView"
        @column-view="handleColumnLevelLineage"
        @asset-view="(filterState) => { if (filterState) handleAssetView({ assetId: props.assetDataset?.id, assetDataset: props.assetDataset, pipelineData: props.pipelineData, LineageError: props.LineageError, filterState }); }"
        @reset="handleReset"
      />
      
      <Controls
        :position="PanelPosition.BottomLeft"
        showZoom
        showFitView
        showInteractive
        class="custom-controls"
      />
    </VueFlow>

    <!-- Pipeline View (no special filter controls; use Asset behavior) -->
    <VueFlow
      v-if="showPipelineView"
      :nodes="pipelineElements.nodes"
      :edges="pipelineElements.edges"
      @nodesInitialized="onPipelineNodesInitialized"
      :min-zoom="0.1"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />

      <!-- Use the same FilterTab behavior/label as Asset view -->
      <FilterTab
        :filter-type="filterType"
        :expand-all-upstreams="expandAllUpstreams"
        :expand-all-downstreams="expandAllDownstreams"
        :show-pipeline-view="true"
        :show-column-view="false"
        @update:filter-type="(value) => { filterType = value; if (value === 'direct') expandedNodes = {}; }"
        @update:expand-all-upstreams="expandAllUpstreams = $event"
        @update:expand-all-downstreams="expandAllDownstreams = $event"
        @pipeline-view="handlePipelineView"
        @column-view="handleColumnLevelLineage"
        @asset-view="(filterState) => { if (filterState) handleAssetView({ assetId: props.assetDataset?.id, assetDataset: props.assetDataset, pipelineData: props.pipelineData, LineageError: props.LineageError, filterState }); }"
        @reset="handleReset"
      />

      <template #node-custom="nodeProps">
        <CustomNode
          :expanded-nodes="pipelineExpandedNodes"
          @toggle-node-expand="togglePipelineNodeExpand"
          :data="nodeProps.data"
          :label="nodeProps.data.label"
          :selected-node-id="pipelineSelectedNodeId"
          @node-click="onPipelineNodeClick"
          :show-expand-buttons="false"
        />
      </template>
      <MiniMap pannable zoomable class="minimap-bottom-right" />
      <Controls
        :position="PanelPosition.BottomLeft"
        showZoom
        showFitView
        showInteractive
        class="custom-controls"
      />
    </VueFlow>

    <!-- Column Level View -->
    <VueFlow
      v-if="showColumnView"
      :nodes="columnElements.nodes"
      :edges="columnElements.edges"
      @nodesInitialized="onColumnNodesInitialized"
      :min-zoom="0.1"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />
      <FilterTab
        :filterType="columnFilterType"
        :expandAllUpstreams="columnExpandAllUpstreams"
        :expandAllDownstreams="columnExpandAllDownstreams"
        :showPipelineView="false"
        :showColumnView="true"
        @update:filterType="() => {}"
        @update:expandAllUpstreams="() => {}"
        @update:expandAllDownstreams="() => {}"
        @pipeline-view="handlePipelineView"
        @column-view="handleColumnLevelLineage"
        @asset-view="handleAssetViewWithFilter"
        @reset="handleReset"
      />
    
      <template #node-customWithColumn="nodeProps">
        <CustomNodeWithColumn
          :expanded-nodes="columnExpandedNodes"
          @toggle-node-expand="toggleColumnNodeExpand"
          :data="nodeProps.data"
          :selected-node-id="columnSelectedNodeId"
          @node-click="onColumnNodeClick"
          :show-expand-buttons="false"
          @column-hover="handleColumnHover"
          @column-leave="handleColumnLeave"
        />
      </template>
      
      <template #node-custom="nodeProps">
        <CustomNode
          :expanded-nodes="columnExpandedNodes"
          @toggle-node-expand="toggleColumnNodeExpand"
          :data="nodeProps.data"
          :selected-node-id="columnSelectedNodeId"
          @node-click="onColumnNodeClick"
          :show-expand-buttons="false"
          :label="nodeProps.data?.asset?.name || nodeProps.data?.label || ''"
        />
      </template>
      <MiniMap pannable zoomable class="minimap-bottom-right" />
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
import {
  PanelPosition,
  VueFlow,
  useVueFlow,
  type NodeDragEvent,
  type XYPosition,
  type NodeMouseEvent,
  type Edge,
  type GraphNode
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/controls/dist/style.css";
import { computed, onMounted, defineProps, watch, ref, nextTick } from "vue";
import ELK from "elkjs/lib/elk.bundled.js";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import CustomNodeWithColumn from "@/components/lineage-flow/custom-nodes/CustomNodesWithColumn.vue";
import FilterTab from "@/components/lineage-flow/filterTab/filterTab.vue";
import {
  generateGraphFromJSON,
  generateGraphForDownstream,
  generateGraphForUpstream,
  generateColumnGraph
} from "@/utilities/graphGenerator";
import { buildPipelineLineage, applyLayout as applyPipelineLayout } from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import { buildColumnLineage } from "@/components/lineage-flow/column-level/useColumnLevel";
import type { AssetDataset } from "@/types";

const props = defineProps<{
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

// Shared UI state
const error = ref<string | null>(props.LineageError);
const showPipelineView = ref(false);
const showColumnView = ref(false);

// Debug computed properties
const shouldShowLoading = computed(() => {
  const result = (props.isLoading || isLoadingLocal.value) || isLayouting.value;
  console.log('🔍 [Lineage] shouldShowLoading:', result, { 
    propsIsLoading: props.isLoading,
    isLoadingLocal: isLoadingLocal.value, 
    isLayouting: isLayouting.value 
  });
  return result;
});

const shouldShowError = computed(() => {
  const result = !!error.value;
  console.log('🔍 [Lineage] shouldShowError:', result, error.value);
  return result;
});

const shouldShowAssetView = computed(() => {
  const result = !showPipelineView.value && !showColumnView.value && !shouldShowLoading.value && !shouldShowError.value;
  console.log('🔍 [Lineage] shouldShowAssetView:', result, {
    showPipelineView: showPipelineView.value,
    showColumnView: showColumnView.value,
    shouldShowLoading: shouldShowLoading.value,
    shouldShowError: shouldShowError.value
  });
  return result;
});

// ===== Asset View State =====
const flowRef = ref(null);
const { nodes, edges, addNodes, addEdges, setNodes, setEdges, fitView, onNodeMouseEnter, onNodeMouseLeave, getNodes, getEdges } = useVueFlow();
const elements = computed(() => [...nodes.value, ...edges.value]);
const selectedNodeId = ref<string | null>(null);
const isLoadingLocal = ref(true);
const isLayouting = ref(false);
const filterType = ref<"direct" | "all">("direct");
const expandAllDownstreams = ref(false);
const expandAllUpstreams = ref(false);
const expandedNodes = ref<{ [key: string]: boolean }>({});
const elk = new ELK();
// Track asset graph version to avoid reusing cached layout after interactive changes
const assetGraphVersion = ref(0);
// Use instant fit on first render after switching back to asset view
const nextFitInstant = ref(false);
// Key to reset asset FilterTab (collapse panel) when switching back
const assetFilterTabKey = ref(0);

// Debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 180) {
  let timerId: number | undefined;
  return (...args: Parameters<T>) => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    timerId = window.setTimeout(() => fn(...args), wait);
  };
}

// Memoization for layouted graphs (asset view)
type LayoutedGraph = { nodes: any[]; edges: any[] };
const layoutCache = ref<Map<string, LayoutedGraph>>(new Map());
const clearLayoutCache = () => layoutCache.value.clear();
const computeCacheKey = (): string => {
  const assetId = props.assetDataset?.id ?? "";
  return JSON.stringify({
    assetId,
    filterType: filterType.value,
    expandAllUpstreams: expandAllUpstreams.value,
    expandAllDownstreams: expandAllDownstreams.value,
    version: assetGraphVersion.value,
  });
};

const baseGraphData = computed(() => {
  if (!props.assetDataset) return { nodes: [], edges: [] };
  return generateGraphFromJSON(props.assetDataset);
});

const allDownstreamAssets = computed(() => {
  if (!props.assetDataset?.downstream || !expandAllDownstreams.value) return [];
  return props.assetDataset.downstream.reduce((acc: any[], downstream: any) => {
    return acc.concat(fetchAllDownstreams(downstream.name));
  }, []);
});

const allUpstreamAssets = computed(() => {
  if (!props.assetDataset?.upstreams || !expandAllUpstreams.value) return [];
  return props.assetDataset.upstreams.reduce((acc: any[], upstream: any) => {
    return acc.concat(fetchAllUpstreams(upstream.name));
  }, []);
});

const currentGraphData = computed(() => {
  if (filterType.value === "direct") {
    return baseGraphData.value;
  }
  if (filterType.value === "all") {
    let allNodes: any[] = [...baseGraphData.value.nodes];
    let allEdges: any[] = [...baseGraphData.value.edges];
    allDownstreamAssets.value.forEach((asset) => {
      const result = generateGraphForDownstream(asset.name, props.pipelineData);
      allNodes = [...allNodes, ...result.nodes];
      allEdges = [...allEdges, ...result.edges];
    });
    allUpstreamAssets.value.forEach((asset) => {
      const result = generateGraphForUpstream(
        asset.name,
        props.pipelineData,
        props.assetDataset?.id ?? ""
      );
      allNodes = [...allNodes, ...result.nodes];
      allEdges = [...allEdges, ...result.edges];
    });
    const nodeMap = new Map(allNodes.map(node => [node.id, node]));
    const edgeMap = new Map(allEdges.map(edge => [edge.id, edge]));
    return {
      nodes: Array.from(nodeMap.values()),
      edges: Array.from(edgeMap.values())
    };
  }
  return { nodes: [], edges: [] };
});

const fetchAllDownstreams = (assetName: string, downstreamAssets: any[] = []): any[] => {
  const currentAsset = props.pipelineData.assets.find((asset: any) => asset.name === assetName);
  if (!currentAsset) return downstreamAssets;
  downstreamAssets.push(currentAsset);
  currentAsset?.downstream?.forEach((d: any) => {
    fetchAllDownstreams(d.name, downstreamAssets);
  });
  return downstreamAssets;
};

const fetchAllUpstreams = (assetName: string, upstreamAssets: any[] = []): any[] => {
  const currentAsset = props.pipelineData.assets.find((asset: any) => asset.name === assetName);
  if (!currentAsset) return upstreamAssets;
  upstreamAssets.push(currentAsset);
  currentAsset?.upstreams?.forEach((u: any) => {
    fetchAllUpstreams(u.name, upstreamAssets);
  });
  return upstreamAssets;
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
    children: nodesToLayout.map((node: any) => ({
      id: node.id,
      width: 150,
      height: 70,
      labels: [{ text: node.data.label }],
    })),
    edges: edgesToLayout.map((edge: any) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
  try {
    const layout = await elk.layout(elkGraph as any);
    if (layout.children && layout.children.length) {
      const layoutedNodes = nodesToLayout.map((node: any) => {
        const layoutNode = (layout.children as any)?.find((child: any) => child.id === node.id);
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

const getUpstreamNodesAndEdges = (nodeId: string, allEdges: Edge[]) => {
  const upstreamNodes = new Set<string>([nodeId]);
  const upstreamEdges = new Set<Edge>();
  const queue = [nodeId];
  const visited = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const incomingEdges = allEdges.filter((edge) => edge.target === currentNodeId);
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        upstreamNodes.add(edge.source);
        queue.push(edge.source);
      }
      upstreamEdges.add(edge);
    }
  }
  return { upstreamNodes, upstreamEdges };
};

const getDownstreamNodesAndEdges = (nodeId: string, allEdges: Edge[]) => {
  const downstreamNodes = new Set<string>([nodeId]);
  const downstreamEdges = new Set<Edge>();
  const queue = [nodeId];
  const visited = new Set<string>([nodeId]);
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const outgoingEdges = allEdges.filter((edge) => edge.source === currentNodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        downstreamNodes.add(edge.target);
        queue.push(edge.target);
      }
      downstreamEdges.add(edge);
    }
  }
  return { downstreamNodes, downstreamEdges };
};

const onNodeClick = (nodeId: string) => {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId;
};

const onNodesDragged = (draggedNodes: NodeDragEvent[]) => {
  setNodes(
    nodes.value.map((node) => {
      const draggedNode = draggedNodes.find((n) => n.node.id === node.id);
      return draggedNode ? { ...node, position: draggedNode.node.position as XYPosition } : node;
    })
  );
};

// Fit view helper to mirror control behavior
const fitViewSmooth = async () => {
  await nextTick();
  const duration = nextFitInstant.value ? 0 : 300;
  nextFitInstant.value = false;
  try {
    fitView({ padding: 0.2, duration });
  } catch (e) {
    await nextTick();
    fitView({ padding: 0.2, duration });
  }
};

const _updateGraph = async () => {
  if (!showPipelineView.value && !showColumnView.value) {
    isLayouting.value = true;
    try {
      const graphData = currentGraphData.value;
      if (graphData.nodes.length > 0) {
        const key = computeCacheKey();
        let layoutedGraphData = layoutCache.value.get(key);
        if (!layoutedGraphData) {
          layoutedGraphData = await applyLayout(graphData.nodes, graphData.edges);
          layoutCache.value.set(key, layoutedGraphData);
        }
        setNodes(layoutedGraphData.nodes);
        setEdges(layoutedGraphData.edges);
        await nextTick();
        isLayouting.value = false;
        await fitViewSmooth();
      } else {
        setNodes([]);
        setEdges([]);
        isLayouting.value = false;
      }
    } catch (error) {
      console.error("Error updating graph:", error);
      isLayouting.value = false;
    }
  }
};

const updateGraph = debounce(_updateGraph, 180);

const processProperties = async () => {
  console.log('🔄 [Lineage] processProperties called');
  console.log('🔄 [Lineage] Has assetDataset:', !!props.assetDataset);
  console.log('🔄 [Lineage] Has pipelineData:', !!props.pipelineData);
  
  if (!props.assetDataset || !props.pipelineData) {
    isLoadingLocal.value = error.value === null;
    console.log('🔄 [Lineage] Missing data, isLoadingLocal set to:', isLoadingLocal.value);
    return;
  }
  isLoadingLocal.value = true;
  isLayouting.value = false;
  error.value = null;
  console.log('🔄 [Lineage] Starting graph update');
  try {
    await updateGraph();
    isLoadingLocal.value = false;
    console.log('✅ [Lineage] Graph updated successfully');
  } catch (err) {
    console.error("Error processing properties:", err);
    error.value = "Failed to generate lineage graph. Please try again.";
    isLoadingLocal.value = false;
    isLayouting.value = false;
  }
};

const toggleNodeExpand = (nodeId: string) => {
  expandedNodes.value[nodeId] = !expandedNodes.value[nodeId];
};

const onAddUpstream = async (nodeId: string) => {
  isLayouting.value = true;
  const { nodes: newNodes, edges: newEdges } = generateGraphForUpstream(
    nodeId,
    props.pipelineData,
    props.assetDataset?.id ?? ""
  );
  const existingNodeIds = new Set(nodes.value.map(n => n.id));
  const filteredNodes = newNodes.filter(node => !existingNodeIds.has(node.id));
  const filteredEdges = newEdges.filter(edge => {
    const existingEdgeIds = new Set(edges.value.map(e => e.id));
    return !existingEdgeIds.has(edge.id);
  });
  if (filteredNodes.length > 0) {
    addNodes(filteredNodes);
  }
  if (filteredEdges.length > 0) {
    addEdges(filteredEdges);
  }
  expandedNodes.value[`${nodeId}_upstream`] = true;
  const layoutedData = await applyLayout();
  setNodes(layoutedData.nodes);
  setEdges(layoutedData.edges);
  await nextTick();
  isLayouting.value = false;
  await fitViewSmooth();
  // Bump version so the next full recompute reflows with correct left/right ordering
  assetGraphVersion.value++;
};

const onAddDownstream = async (nodeId: string) => {
  isLayouting.value = true;
  const { nodes: newNodes, edges: newEdges } = generateGraphForDownstream(
    nodeId,
    props.pipelineData
  );
  const existingNodeIds = new Set(nodes.value.map(n => n.id));
  const filteredNodes = newNodes.filter(node => !existingNodeIds.has(node.id));
  const filteredEdges = newEdges.filter(edge => {
    const existingEdgeIds = new Set(edges.value.map(e => e.id));
    return !existingEdgeIds.has(edge.id);
  });
  if (filteredNodes.length > 0) {
    addNodes(filteredNodes);
  }
  if (filteredEdges.length > 0) {
    addEdges(filteredEdges);
  }
  expandedNodes.value[`${nodeId}_downstream`] = true;
  const layoutedData = await applyLayout();
  setNodes(layoutedData.nodes);
  setEdges(layoutedData.edges);
  await nextTick();
  isLayouting.value = false;
  await fitViewSmooth();
  assetGraphVersion.value++;
};

const resetFilterState = () => {
  filterType.value = "direct";
  expandAllUpstreams.value = false;
  expandAllDownstreams.value = false;
};

const handleReset = async () => {
  resetFilterState();
  expandedNodes.value = {};
  showPipelineView.value = false;
  showColumnView.value = false;
  await updateGraph();
};

const handleAssetView = async (emittedData: {
  assetId?: string;
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  LineageError: string | null;
  filterState?: { filterType: "direct" | "all"; expandAllUpstreams: boolean; expandAllDownstreams: boolean };
}) => {
  showPipelineView.value = false;
  showColumnView.value = false;
  if (emittedData.filterState) {
    filterType.value = emittedData.filterState.filterType;
    expandAllUpstreams.value = emittedData.filterState.expandAllUpstreams;
    expandAllDownstreams.value = emittedData.filterState.expandAllDownstreams;
    if (emittedData.filterState.filterType === 'direct') {
      expandedNodes.value = {};
    }
  }
  // Make the first fit instantaneous to avoid visible movement
  nextFitInstant.value = true;
  // Force FilterTab remount in asset view to close the panel
  assetFilterTabKey.value++;
  await _updateGraph();
};

const handlePipelineView = async () => {
  showPipelineView.value = true;
  showColumnView.value = false;
  await buildPipelineElements();
};

const handleColumnLevelLineage = async () => {
  showColumnView.value = true;
  showPipelineView.value = false;
  await buildColumnElements();
};

onMounted(() => {
  console.log('🚀 [Lineage] Lineage component mounted');
  console.log('🚀 [Lineage] Props:', { 
    hasAssetDataset: !!props.assetDataset, 
    hasPipelineData: !!props.pipelineData, 
    isLoading: props.isLoading,
    LineageError: props.LineageError 
  });
  processProperties();
});

watch(
  () => [filterType.value, expandAllUpstreams.value, expandAllDownstreams.value],
  () => {
    if (props.assetDataset && props.pipelineData && !showPipelineView.value && !showColumnView.value) {
      updateGraph();
    }
  },
  { immediate: false }
);

watch(
  () => [props.assetDataset, props.pipelineData],
  ([newAssetDataset, newPipelineData]) => {
    if (newAssetDataset && newPipelineData && !showPipelineView.value && !showColumnView.value) {
      processProperties();
    }
  },
  { immediate: false }
);

onNodeMouseEnter((event: NodeMouseEvent) => {
  if (showPipelineView.value || showColumnView.value) return;
  const hoveredNode = event.node;
  const allNodes = getNodes.value;
  const allEdges = getEdges.value;
  const { upstreamNodes, upstreamEdges } = getUpstreamNodesAndEdges(hoveredNode.id, allEdges);
  const { downstreamNodes, downstreamEdges } = getDownstreamNodesAndEdges(hoveredNode.id, allEdges);
  const highlightNodes = new Set([...upstreamNodes, ...downstreamNodes]);
  const highlightEdges = new Set([...upstreamEdges, ...downstreamEdges]);
  allNodes.forEach((node) => {
    if (!highlightNodes.has(node.id)) {
      node.class = `${node.class || ''} faded`.trim();
    }
  });
  allEdges.forEach((edge) => {
    if (!highlightEdges.has(edge)) {
      edge.class = `${edge.class || ''} faded`.trim();
    }
  });
});

onNodeMouseLeave(() => {
  if (showPipelineView.value || showColumnView.value) return;
  getNodes.value.forEach((node) => {
    if (node.class && typeof node.class === 'string') {
      node.class = node.class.replace(/faded/g, '').trim();
    }
  });
  getEdges.value.forEach((edge) => {
    if (edge.class && typeof edge.class === 'string') {
      edge.class = edge.class.replace(/faded/g, '').trim();
    }
  });
});

// ===== Pipeline View State and Logic =====
const pipelineSelectedNodeId = ref<string | null>(null);
const pipelineExpandedNodes = ref<{ [key: string]: boolean }>({});
const pipelineFilterType = ref<"direct" | "all">("all");
const pipelineExpandAllUpstreams = ref(true);
const pipelineExpandAllDownstreams = ref(true);
const pipelineElements = ref<any>({ nodes: [], edges: [] });

const togglePipelineNodeExpand = (nodeId: string) => {
  pipelineExpandedNodes.value[nodeId] = !pipelineExpandedNodes.value[nodeId];
};

const onPipelineNodeClick = (nodeId: string) => {
  pipelineSelectedNodeId.value = pipelineSelectedNodeId.value === nodeId ? null : nodeId;
};

const buildPipelineElements = async () => {
  if (!props.pipelineData) {
    pipelineElements.value = { nodes: [], edges: [] };
    return;
  }
  const lineageData = buildPipelineLineage(props.pipelineData);
  const { nodes: initialNodes, edges: initialEdges } = (await import("@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder")).generateGraph(
    lineageData,
    props.assetDataset?.name || ""
  );
  const { nodes: layoutNodes, edges: layoutEdges } = await applyPipelineLayout(initialNodes, initialEdges);
  pipelineElements.value = { nodes: layoutNodes, edges: layoutEdges };
};

const onPipelineNodesInitialized = async () => {
  await fitViewSmooth();
};

const handleAssetViewWithFilter = (filterState?: { filterType: "direct" | "all"; expandAllUpstreams: boolean; expandAllDownstreams: boolean }) => {
  handleAssetView({
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError,
    filterState
  });
};

// ===== Column View State and Logic =====
const columnSelectedNodeId = ref<string | null>(null);
const columnExpandedNodes = ref<{ [key: string]: boolean }>({});
const columnFilterType = ref<"direct" | "all">("all");
const columnExpandAllUpstreams = ref(true);
const columnExpandAllDownstreams = ref(true);
const columnElements = ref<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
const hoveredColumn = ref<{ assetName: string; columnName: string } | null>(null);

const toggleColumnNodeExpand = (nodeId: string) => {
  columnExpandedNodes.value[nodeId] = !columnExpandedNodes.value[nodeId];
};

const onColumnNodeClick = (nodeId: string) => {
  columnSelectedNodeId.value = columnSelectedNodeId.value === nodeId ? null : nodeId;
};

const buildColumnElements = async () => {
  const newPipelineData = props.pipelineData;
  if (!newPipelineData) {
    columnElements.value = { nodes: [], edges: [] };
    return;
  }
  const hasColumnData = newPipelineData.column_lineage || 
    (newPipelineData.assets && newPipelineData.assets.some((asset: any) => 
      asset.columns?.length > 0 && asset.columns.some((col: any) => 
        col.upstreams && Array.isArray(col.upstreams) && col.upstreams.length > 0
      )
    ));
  if (!hasColumnData) {
    console.warn("No column lineage data available. The data may have been parsed without the -c flag.");
    columnElements.value = { nodes: [], edges: [] };
    error.value = "No column lineage data found. To view column-level lineage, ensure the pipeline data includes column information by using the 'parse pipeline -c' command or refresh the lineage data.";
    return;
  }
  error.value = null;
  const lineageData = buildColumnLineage(newPipelineData);
  const { nodes: initialNodes, edges: initialEdges } = generateColumnGraph(
    lineageData,
    props.assetDataset?.name || ""
  );
  const { nodes: layoutNodes, edges: layoutEdges } = await applyPipelineLayout(initialNodes, initialEdges);
  columnElements.value = { nodes: layoutNodes, edges: layoutEdges };
};

const onColumnNodesInitialized = async () => {
  await fitViewSmooth();
};

const onAssetNodesInitialized = async () => {
  await fitViewSmooth();
};

const handleColumnHover = (assetName: string, columnName: string): void => {
  hoveredColumn.value = { assetName, columnName };
  // Edge highlight could be added if needed by manipulating columnElements
};

const handleColumnLeave = (): void => {
  hoveredColumn.value = null;
};
</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.vue-flow__node.faded,
.vue-flow__edge.faded {
  opacity: 0.3;
  transition: opacity 0.2s ease-in-out;
}

.flow {
  @apply relative flex h-screen w-full p-0 !important;
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

.minimap-bottom-right {
  position: absolute !important;
  right: 0.75rem !important;
  bottom: 0.75rem !important;
  left: auto !important;
  top: auto !important;
  z-index: 10; /* above canvas */
  pointer-events: auto;
}

.error-message {
  flex-direction: column;
}

vscode-checkbox {
  @apply text-xs;
}

.loading-overlay {
  @apply absolute top-0 left-0 z-10 flex items-center justify-center w-full h-full bg-editor-bg;
}

.error-message {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}
</style>
