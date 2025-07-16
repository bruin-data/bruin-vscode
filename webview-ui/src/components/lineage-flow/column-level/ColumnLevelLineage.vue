<template>
  <div class="flow">
    <!-- Show error message when no column data is available -->
    <div v-if="error" class="error-message">
      <div class="error-content">
        <h3 class="error-title">No Column Lineage Data Available</h3>
        <p class="error-description">{{ error }}</p>
        <div class="error-actions">
          <vscode-button 
            @click="handleViewSwitch()"
            appearance="primary"
            class="action-btn"
          >
            View Asset Lineage
          </vscode-button>
        </div>
      </div>
    </div>

    <!-- Main VueFlow component - only show when no error -->
    <VueFlow
      v-if="!error"
      :nodes="elements.nodes"
      :edges="elements.edges"
      @nodesInitialized="onNodesInitialized"
      :min-zoom="0.1"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />
      <Panel position="top-right">
        <div class="navigation-controls">
          <vscode-button 
            @click="handleViewSwitch()"
            appearance="secondary"
            class="view-switch-btn"
          >
            Pipeline View
          </vscode-button>
        </div>
      </Panel>
      
      <!-- Custom node template for column display -->
      <template #node-customWithColumn="nodeProps">
        <CustomNodeWithColumn
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
          :selected-node-id="selectedNodeId"
          @node-click="onNodeClick"
          :show-expand-buttons="false"
        />
      </template>
      
      <!-- Fallback to regular custom nodes if needed -->
      <template #node-custom="nodeProps">
        <CustomNode
          :expanded-nodes="expandedNodes"
          @toggle-node-expand="toggleNodeExpand"
          :data="nodeProps.data"
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

    <!-- Column lineage legend removed -->
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
import CustomNodeWithColumn from "@/components/lineage-flow/custom-nodes/CustomNodesWithColumn.vue";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  buildColumnLineage,
  generateColumnGraph,
} from "@/components/lineage-flow/column-level/useColumnLevel";
import { applyLayout } from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
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

const toggleNodeExpand = (nodeId: string) => {
  expandedNodes.value[nodeId] = !expandedNodes.value[nodeId];
};

const emit = defineEmits<{
  (e: 'showPipelineView', data: {
    assetId?: string;
    assetDataset?: AssetDataset | null;
    pipelineData: any;
    LineageError: string | null;
  }): void;
}>();

// Column lineage hover highlighting functions removed

const handleViewSwitch = () => {
  emit('showPipelineView', {
    assetId: props.assetDataset?.id,
    assetDataset: props.assetDataset,
    pipelineData: props.pipelineData,
    LineageError: props.LineageError
  });
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
    
    // Check if we have column lineage data
    const hasColumnData = newPipelineData.column_lineage || 
                         (newPipelineData.assets && newPipelineData.assets.some((asset: any) => 
                           asset.columns?.length > 0 && asset.columns.some((col: any) => 
                             col.upstreams && Array.isArray(col.upstreams) && col.upstreams.length > 0
                           )
                         ));
    
    if (!hasColumnData) {
      console.warn("No column lineage data available. The data may have been parsed without the -c flag.");
      
      // Show empty graph but provide guidance
      elements.value = { nodes: [], edges: [] };
      error.value = "No column lineage data found. To view column-level lineage, ensure the pipeline data includes column information by using the 'parse pipeline -c' command or refresh the lineage data.";
      return;
    }
    
    // Reset error if we have data
    error.value = null;
    
    const lineageData = buildColumnLineage(newPipelineData);
    const { nodes: initialNodes, edges: initialEdges } = generateColumnGraph(
      lineageData,
      props.assetDataset?.name || ""
    );
    
    const { nodes: layoutNodes, edges: layoutEdges } = await applyLayout(initialNodes, initialEdges);
    elements.value = { nodes: layoutNodes, edges: layoutEdges };
  },
  { immediate: true }
);

const onNodesInitialized = () => {
  console.log("Column lineage nodes initialized");
  fitView();
};

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



.navigation-controls {
  @apply flex gap-2;
}

.view-switch-btn {
  @apply text-xs;
}

.loading-overlay {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}

.error-message {
  @apply flex items-center justify-center w-full h-full bg-editor-bg;
}

.error-content {
  @apply text-center p-8 max-w-md;
}

.error-title {
  @apply text-lg font-semibold text-foreground mb-4;
}

.error-description {
  @apply text-sm text-gray-400 mb-6 leading-relaxed;
}

.error-actions {
  @apply flex justify-center gap-3;
}

.action-btn {
  @apply text-xs;
}
</style>
