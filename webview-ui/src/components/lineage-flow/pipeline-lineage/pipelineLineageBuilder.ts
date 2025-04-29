import type { Asset } from '@/types';
import type { Node, Edge } from "@vue-flow/core";
import ELK from "elkjs/lib/elk.bundled.js";

/**
 * Process pipeline data to generate a complete lineage graph
 * @param {Object} pipelineData - The raw pipeline data from the backend
 * @returns {Object} - Processed lineage data with both upstream and downstream relationships
 */
function buildPipelineLineage(pipelineData: { assets: Asset[] }): { assets: Asset[], assetMap: { [key: string]: Asset } } {
  // Extract assets and create lookup map
  const assets = pipelineData.assets || [];
  const assetMap: { [key: string]: Asset } = {};

  // First pass: Create asset map and initialize downstream arrays
  assets.forEach(asset => {
    assetMap[asset.name] = {
      ...asset,
      hasUpstreams: Array.isArray(asset.upstreams) && asset.upstreams.length > 0,
      hasDownstreams: false, // This will be calculated in the second pass
      upstreams: asset.upstreams || [],
      downstreams: [] // Initialize empty downstreams array
    };
  });

  // Second pass: Calculate downstream relationships
  assets.forEach(asset => {
    if (Array.isArray(asset.upstreams)) {
      asset.upstreams.forEach(upstream => {
        // Only process asset type upstreams
        if (upstream.type === 'asset' && upstream.value) {
          const upstreamAsset = assetMap[upstream.value];
          if (upstreamAsset) {
            // Add current asset as downstream to the upstream asset
            if (!upstreamAsset.downstreams) {
              upstreamAsset.downstreams = [];
            }

            upstreamAsset.downstreams.push({
              type: 'asset',
              value: asset.name,
            });

            // Mark upstream as having downstreams
            upstreamAsset.hasDownstreams = true;
          }
        }
      });
    }
  });

  return {
    assets: Object.values(assetMap),
    assetMap
  };
}

/**
 * Generate a graph representation for the Vue Flow component
 * @param {Object} lineageData - The processed lineage data
 * @param {string} focusAssetName - The name of the asset to focus on
 * @returns {Object} - Graph data containing nodes and edges
 */
function generateGraph(lineageData: { assets: Asset[], assetMap: { [key: string]: Asset } }, focusAssetName: string): { nodes: Node[], edges: Edge[] } {
  const { assetMap } = lineageData;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const processedAssets = new Set<string>();

  // Create nodes and edges for all assets
  lineageData.assets.forEach(asset => {
    const node = createNode(asset, asset.name === focusAssetName);
    nodes.push(node);
    processedAssets.add(asset.name);

    // Add upstream edges
    if (asset.upstreams && asset.upstreams.length > 0) {
      asset.upstreams.forEach(upstream => {
        if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
          edges.push({
            id: `edge-${upstream.value}-to-${asset.name}`,
            source: upstream.value,
            target: asset.name
          });
        }
      });
    }

    // Add downstream edges
    if (asset.downstreams && asset.downstreams.length > 0) {
      asset.downstreams.forEach(downstream => {
        if (downstream.type === 'asset' && downstream.value && assetMap[downstream.value]) {
          edges.push({
            id: `edge-${asset.name}-to-${downstream.value}`,
            source: asset.name,
            target: downstream.value
          });
        }
      });
    }
  });

  return { nodes, edges };
}

function createNode(asset: Asset, isFocusAsset: boolean = false): Node {
  return {
    id: asset.name,
    type: 'custom',
    position: { x: 0, y: 0 }, // Initial position to be adjusted by layout
    data: {
      label: asset.name,
      type: 'asset',
      asset: {
        ...asset,
        isFocusAsset,
        hasUpstreams: Array.isArray(asset.upstreams) && asset.upstreams.length > 0,
        hasDownstreams: Array.isArray(asset.downstreams) && asset.downstreams.length > 0
      },
      hasUpstreamForClicking: asset.hasUpstreams,
      hasDownstreamForClicking: asset.hasDownstreams
    }
  };
}
// simplify this from o2, use a dictionary instead of two loops
function updateNodePositions(layout: any, nodes: Node[]) {
  const updatedNodes = nodes.map((node) => {
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
  return updatedNodes;
};
// Function to apply ELK layout
async function applyLayout(nodes: Node[], edges: Edge[]) : Promise<{ nodes: Node[], edges: Edge[] }> {
  const elk = new ELK();

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
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
    children: nodes.map((node) => ({
      id: node.id,
      width: 224, // Same as node-content width
      height: 80, // Approximate height
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  try {
    const layout = await elk.layout(elkGraph);
    if (layout.children && layout.children.length) {
      const updatedNodes = updateNodePositions(layout, nodes);
      return { nodes: updatedNodes, edges };
    }
  } catch (error) {
    console.error("Error applying ELK layout:", error);
  }
  return { nodes, edges };
}
// Export the utility functions
export {
  buildPipelineLineage,
  generateGraph,
  applyLayout,
};
