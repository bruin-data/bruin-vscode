// src/components/lineage-flow/LineageFlow.vue
<template>
  <div class="flow">
    <VueFlow
    v-model:elements="elements"
    :default-viewport="{ x: 150, y: 10, zoom: 1 }"
      :fit-view-on-init="false"
      class="basic-flow"
      :draggable="true"
      :node-draggable="true"
    >
      <Background />

      <template #node-custom="nodeProps">
        <CustomNode
          :label="nodeProps.data.label"
          :data="nodeProps.data"
          :selected-node-id="selectedNodeId"
          :expand-all-downstreams="expandAllDownstreams"
          :expand-all-upstreams="expandAllUpstreams"
          :expanded-nodes="expandedNodes"
          :status="nodeStatus[nodeProps.data.asset?.name]"
          @node-click="handleNodeClick"
        />
      </template>
      <Controls
        showZoom
        showFitView
        showInteractive
        class="custom-controls"
      />
    </VueFlow>
    <button
      v-if="shouldShowCollapseButton"
      @click="collapseAll"
      class="collapse-button"
    >
      Collapse All
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import "@vue-flow/controls/dist/style.css";
import CustomNode from "@/components/lineage-flow/custom-nodes/CustomNodes.vue";
import {
  generateGraphFromJSON,
} from "@/utilities/graphGenerator";
import ELK from "elkjs/lib/elk.bundled.js";

// Import your asset data or use props to receive it
const props = defineProps({
  assetData: {
    type: Object,
    required: true
  },
  pipelineData: {
    type: Object,
    required: true
  }
});

const { nodes, edges, findNode, addNodes, addEdges, setNodes, setEdges, fitView } = useVueFlow();

const selectedNodeId = ref(null);
const expandAllDownstreams = ref(false);
const expandAllUpstreams = ref(false);
const expandedNodes = ref({});
const nodeStatus = ref({});
const elk = new ELK();

const shouldShowCollapseButton = computed(() => {
  return Object.keys(expandedNodes.value).length > 0 || 
         expandAllDownstreams.value || 
         expandAllUpstreams.value;
});

// ELK layout options
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '50',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.edgeRouting': 'ORTHOGONAL'
};

const elements = computed(() => [...nodes.value, ...edges.value]);

// Initialize graph with focus asset
onMounted(async () => {
  const { nodes, edges } = generateGraphFromJSON(props.assetData);
  setNodes(nodes);
  setEdges(edges);
  
  // Apply initial layout
  await applyLayout();
  
  // Set some nodes with status for demonstration
  const initialStatus = {};
  nodes.forEach(node => {
    if (Math.random() > 0.7) {
      initialStatus[node.data.asset.name] = Math.random() > 0.5 ? 'running' : 'failed';
    }
  });
  nodeStatus.value = initialStatus;

  // Fit view after initial render
  setTimeout(() => {
    fitView({ padding: 0.2 });
  }, 50);
});

// Function to apply ELK layout
async function applyLayout() {
  const elkGraph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.value.map(node => ({
      id: node.id,
      width: 224, // Same as node-content width
      height: 80   // Approximate height
    })),
    edges: edges.value.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  try {
    const layoutedGraph = await elk.layout(elkGraph);
    
    // Update node positions
    const  newNodes  = nodes.value.map(node => {
      const elkNode = layoutedGraph?.children?.find(n => n.id === node.id);
      if (elkNode) {
        return {
          ...node,
          position: { x: elkNode.x, y: elkNode.y },
        };
      }
      return node;
    });

    setNodes(newNodes);
  } catch (error) {
    console.error('Error applying ELK layout:', error);
  }
}

function handleNodeClick(nodeId, event) {
  selectedNodeId.value = nodeId === selectedNodeId.value ? null : nodeId;
}

async function collapseAll() {
  const { nodes, edges } = generateGraphFromJSON(props.assetData);
  setNodes(nodes);
  setEdges(edges);
  expandedNodes.value = {};
  expandAllDownstreams.value = false;
  expandAllUpstreams.value = false;
  await applyLayout();
  fitView({ padding: 0.2 });
}

async function expandAllUpstreamNodes() {
  expandAllUpstreams.value = true;
  
  // Logic to expand all upstream nodes recursively
  // This would involve traversing the asset data and generating graphs
  // for all upstream nodes
  
  await applyLayout();
  fitView({ padding: 0.2 });
}



</script>

<style>
@import "@vue-flow/core/dist/style.css";
@import "@vue-flow/core/dist/theme-default.css";

.flow {
  @apply flex h-screen w-full p-0 relative !important;
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

.collapse-button {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  background-color: rgba(55, 65, 81, 0.8);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
}

.collapse-button:hover {
  background-color: rgba(55, 65, 81, 1);
}

.custom-controls .vue-flow__controls-button:hover {
  background-color: #444 !important;
}
</style>