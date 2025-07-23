<template>
  <div class="flow">
    <VueFlow
      :nodes="elements.nodes"
      :edges="elements.edges"
      @nodesInitialized="onNodesInitialized"
      :min-zoom="0.1"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />
      <FilterTab
        :filterType="filterType"
        :expandAllUpstreams="expandAllUpstreams"
        :expandAllDownstreams="expandAllDownstreams"
        :showPipelineView="true"
        :showColumnView="false"
        @update:filterType="filterType = $event"
        @update:expandAllUpstreams="expandAllUpstreams = $event"
        @update:expandAllDownstreams="expandAllDownstreams = $event"
        @pipeline-view="handleViewSwitch"
        @column-view="handleColumnViewSwitch"
        @asset-view="handleViewSwitch"
        @reset="handleReset"
      />
    
      <template #node-custom="nodeProps">
        <CustomNode
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
          :label="nodeProps.data.label"
          :selected-node-id="selectedNodeId"
          @node-click="onNodeClick"
          :show-expand-buttons="false"
        />
      </template>
      <MiniMap pannable zoomable />
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
  type Edge,
  Panel,
  type NodeMouseEvent,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/controls/dist/style.css";
import { ref, watch, defineEmits } from "vue";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import FilterTab from "@/components/lineage-flow/filterTab/filterTab.vue";
import {
  applyLayout,
  buildPipelineLineage,
  generateGraph,
} from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import type { AssetDataset } from "@/types";
const props = defineProps<{
  assetDataset?: AssetDataset | null;
  pipelineData: any;
  isLoading: boolean;
  LineageError: string | null;
}>();

const { fitView, onNodeMouseEnter, onNodeMouseLeave, getNodes, getEdges } = useVueFlow();
const selectedNodeId = ref<string | null>(null);
const expandedNodes = ref<{ [key: string]: boolean }>({});

// Filter state
const filterType = ref<"direct" | "all">("all");
const expandAllUpstreams = ref(true);
const expandAllDownstreams = ref(true);

const toggleNodeExpand = (nodeId: string) => {
  expandedNodes.value[nodeId] = !expandedNodes.value[nodeId];
};

const emit = defineEmits<{
  (e: 'showAssetView', data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }): void;
  (e: 'showColumnView', data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }): void;
}>();

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

onNodeMouseEnter((event: NodeMouseEvent) => {
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

const handleViewSwitch = () => {
  emit('showAssetView', {
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError
  });
};

const handleColumnViewSwitch = () => {
  emit('showColumnView', {
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError
  });
};

// Handle filter reset
const handleReset = (): void => {
  filterType.value = "all";
  expandAllUpstreams.value = true;
  expandAllDownstreams.value = true;
};
const error = ref<string | null>(props.LineageError);
const elements = ref<any>({ nodes: [], edges: [] });

watch(
  () => props.pipelineData,
  async (newPipelineData) => {
    if (!newPipelineData) {
      elements.value = { nodes: [], edges: [] };
      return;
    }
    const lineageData = buildPipelineLineage(newPipelineData);
    const { nodes: initialNodes, edges: initialEdges } = generateGraph(
      lineageData,
      props.assetDataset?.name || ""
    );
    const { nodes: layoutNodes, edges: layoutEdges } = await applyLayout(initialNodes, initialEdges);
    elements.value = { nodes: layoutNodes, edges: layoutEdges};
    //fitView();
  },
  { immediate: true }
);

const onNodesInitialized = () => {
  // instance is the same as the return of `useVueFlow`
  console.log("onInit is called")
  fitView()
}
const onNodeClick = (nodeId: string) => {
  selectedNodeId.value = selectedNodeId.value === nodeId ? null : nodeId;
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
