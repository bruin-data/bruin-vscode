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
      <Panel position="top-right">
      <div class="navigation-controls">
        <vscode-button 
          @click="handleViewSwitch()"
          appearance="secondary"
          class="view-switch-btn"
        >
          <ArrowLeftIcon class="w-4 h-4 mr-1" />
          Asset View
        </vscode-button>
      </div>
    </Panel>
      <template #node-custom="nodeProps">
        <CustomNode
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
import { PanelPosition, VueFlow, useVueFlow, type Edge, Panel } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/controls/dist/style.css";
import { ref, watch, defineEmits } from "vue";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
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

const { fitView } = useVueFlow();
const selectedNodeId = ref<string | null>(null);
const emit = defineEmits<{
  showAssetView}>();

const handleViewSwitch = () => {
  emit('showAssetView');
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
