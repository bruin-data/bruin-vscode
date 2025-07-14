// src/utils/graphGenerator.js

import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";

export function generateGraphFromJSON(asset) {
  const localNodes = new Map();
  const localEdges: any[] = [];

  const getNode = (assetData) => {
    if (!localNodes.has(assetData.name)) {
      const newNode = {
        id: assetData.name,
        type: "custom",
        data: {
          type: "asset",
          asset: {
            name: assetData.name,
            type: assetData.type || "unknown",
            pipeline: assetData.pipeline || "unknown",
            path: assetData.path || "unknown",
            hasDownstreams: assetData.downstream?.length > 0,
            hasUpstreams: assetData.upstreams?.length > 0,
          },
          hasUpstreamForClicking: assetData.hasUpstreamForClicking,
          hasDownstreamForClicking: assetData.hasDownstreamForClicking,
          label: assetData.name,
        },
        position: { x: 0, y: 0 },
      };
      localNodes.set(assetData.name, newNode);
    }
    return localNodes.get(assetData.name);
  };

  const processAsset = (assetData, isFocusAsset = false) => {
    const node = getNode(assetData);
    node.data.asset.isFocusAsset = isFocusAsset;

    assetData.downstream?.forEach((downstreamAsset) => {
      const childNode = getNode(downstreamAsset);
      childNode.data.asset.hasUpstreams = true;
      localEdges.push({ id: `${node.id}-${childNode.id}`, source: node.id, target: childNode.id });
    });

    const allUpstreams = [...(assetData.upstreams || []), ...(assetData.upstream || [])];
    allUpstreams.forEach((upstreamAsset) => {
      const parentNode = getNode(upstreamAsset);
      parentNode.data.asset.hasDownstreams = true;
      localEdges.push({ id: `${parentNode.id}-${node.id}`, source: parentNode.id, target: node.id });
    });
  };

  processAsset(asset, asset.isFocusAsset);
  return { nodes: Array.from(localNodes.values()), edges: localEdges };
}

export function generateGraphForUpstream(nodeName: string, pipelineData: any, focusAssetId: string) {
  const upstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!upstreamAsset) return { nodes: [], edges: [] };

  const upstream = getAssetDataset(pipelineData, upstreamAsset.id);
  const focusAssetUpstreams = pipelineData.assets.find((asset: any) => asset.id === focusAssetId)?.upstreams.map((upstream: any) => upstream.value) || [];

  return generateGraphFromJSON({
    ...upstream,
    downstream: [],
    isFocusAsset: false,
  });
}

export function generateGraphForDownstream(nodeName: string, pipelineData: any) {
  const downstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!downstreamAsset) return { nodes: [], edges: [] };

  const downstream = getAssetDataset(pipelineData, downstreamAsset.id);
  return generateGraphFromJSON({
    ...downstream,
    upstreams: [],
    isFocusAsset: false,
  });
}


export const generateGraphWithColumnData = (columnData: any) => {
  // Create nodes with column information from the column lineage data
  const asset = columnData.asset;
  const nodes: any[] = [];
  const edges: any[] = [];
  
  // Create main asset node with columns - using same structure as generateGraphFromJSON
  const mainNode = {
    id: asset.name,
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      label: asset.name,
      type: 'asset',
      asset: {
        name: asset.name,
        type: asset.type || "unknown",
        pipeline: asset.pipeline || "unknown",
        path: asset.definition_file?.path || asset.path || "unknown",
        columns: asset.columns || [],
        isFocusAsset: true,
        hasUpstreams: asset.upstreams?.length > 0,
        hasDownstreams: false
      },
      hasUpstreamForClicking: false,
      hasDownstreamForClicking: false
    }
  };
  nodes.push(mainNode);
  
  // Create upstream nodes with their columns - using same structure
  if (asset.upstreams) {
    asset.upstreams.forEach((upstream: any, index: number) => {
      const upstreamNode = {
        id: upstream.value,
        type: 'custom',
        position: { x: -300, y: index * 150 },
        data: {
          label: upstream.value,
          type: 'asset',
          asset: {
            name: upstream.value,
            type: upstream.type || "asset",
            pipeline: asset.pipeline || "unknown",
            path: "unknown",
            columns: upstream.columns || [],
            isFocusAsset: false,
            hasUpstreams: false,
            hasDownstreams: true
          },
          hasUpstreamForClicking: false,
          hasDownstreamForClicking: false
        }
      };
      nodes.push(upstreamNode);
      
      // Create edge
      const edge = {
        id: `${upstream.value}-${asset.name}`,
        source: upstream.value,
        target: asset.name,
        type: 'default'
      };
      edges.push(edge);
    });
  }
  
  return { nodes, edges };
};
