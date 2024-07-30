// src/utils/graphGenerator.js

import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";

export function generateGraphFromJSON(asset) {
  const localNodes = new Map();
  const localEdges: any[] = [];

  function getNode(assetData) {
    if (!localNodes.has(assetData.name)) {
      const newNode = {
        id: assetData.name,
        type: "custom",
        data: {
          type: "asset",
          asset: {
            name: assetData.name,
            type: assetData.type || "unknown",
            hasDownstreams: (assetData.downstream && assetData.downstream.length > 0) || false,
            hasUpstreams: (assetData.upstreams && assetData.upstreams.length > 0) || false,
            isFocusAsset: assetData.isFocusAsset || false,
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
  }

  function processAsset(assetData, isFocusAsset = false) {
    const node = getNode(assetData);
    node.data.asset.isFocusAsset = isFocusAsset;

    if (assetData.downstream) {
      assetData.downstream.forEach((downstreamAsset) => {
        const childNode = getNode(downstreamAsset);
        childNode.data.asset.hasUpstreams = true;
        localEdges.push({
          id: `${node.id}-${childNode.id}`,
          source: node.id,
          target: childNode.id,
        });
      });
    }

    const allUpstreams = [...(assetData.upstreams || []), ...(assetData.upstream || [])];
    if (allUpstreams.length > 0) {
      allUpstreams.forEach((upstreamAsset) => {
        const parentNode = getNode(upstreamAsset);
        parentNode.data.asset.hasDownstreams = true;
        localEdges.push({
          id: `${parentNode.id}-${node.id}`,
          source: parentNode.id,
          target: node.id,
        });
      });
    }
  }

  processAsset(asset, asset.isFocusAsset);

  return { nodes: Array.from(localNodes.values()), edges: localEdges };
}

export function generateGraphForUpstream(nodeName: string, pipelineData: any) {
  const upstreamAsset = pipelineData.assets.filter((asset: any) => asset.name === nodeName)[0];
  if (!upstreamAsset) return { nodes: [], edges: [] };

  const upstream = getAssetDataset(pipelineData, upstreamAsset.id);

  return generateGraphFromJSON({
    ...upstream,
    isFocusAsset: false,
    hasUpstreamForClicking: upstreamAsset.upstreams && upstreamAsset.upstreams.length > 0,
    hasDownstreamForClicking: false,
  });
}

export function generateGraphForDownstream(nodeName: string, pipelineData: any) {
  const downstreamAsset = pipelineData.assets.filter((asset: any) => asset.name === nodeName)[0];
  if (!downstreamAsset) return { nodes: [], edges: [] };

  const downstream = getAssetDataset(pipelineData, downstreamAsset.id);

  return generateGraphFromJSON({
    ...downstream,
    isFocusAsset: false,
    hasUpstreamForClicking: false,
    hasDownstreamForClicking: downstreamAsset.downstream && downstreamAsset.downstream.length > 0,
  });
}
