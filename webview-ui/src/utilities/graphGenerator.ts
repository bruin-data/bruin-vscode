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
  const focusAssetUpstreavms = pipelineData.assets.find((asset: any) => asset.id === focusAssetId)?.upstreams.map((upstream: any) => upstream.value) || [];

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

// Column-level lineage specific functions
export function generateColumnGraphFromJSON(asset, columnLineageMap = {}) {
  const localNodes = new Map();
  const localEdges: any[] = [];

  const getColumnNode = (assetData) => {
    if (!localNodes.has(assetData.name)) {
      const assetColumnLineage = columnLineageMap[assetData.name] || [];
      const newNode = {
        id: assetData.name,
        type: "customWithColumn", // Use custom column node type
        data: {
          type: "asset",
          asset: {
            name: assetData.name,
            type: assetData.type || "unknown",
            pipeline: assetData.pipeline || "unknown",
            path: assetData.path || "unknown",
            hasDownstreams: assetData.downstream?.length > 0,
            hasUpstreams: assetData.upstreams?.length > 0,
            columns: assetData.columns || [],
            columnLineage: assetColumnLineage,
          },
          hasUpstreamForClicking: assetData.hasUpstreamForClicking,
          hasDownstreamForClicking: assetData.hasDownstreamForClicking,
          label: assetData.name,
          columns: assetData.columns || [],
          columnLineage: assetColumnLineage,
        },
        position: { x: 0, y: 0 },
      };
      localNodes.set(assetData.name, newNode);
    }
    return localNodes.get(assetData.name);
  };

  const processAssetWithColumns = (assetData, isFocusAsset = false) => {
    const node = getColumnNode(assetData);
    node.data.asset.isFocusAsset = isFocusAsset;

    // Add regular asset edges
    assetData.downstream?.forEach((downstreamAsset) => {
      const childNode = getColumnNode(downstreamAsset);
      childNode.data.asset.hasUpstreams = true;
      localEdges.push({ 
        id: `asset-${node.id}-${childNode.id}`, 
        source: node.id, 
        target: childNode.id,
        data: { type: 'asset-lineage' },
        style: { stroke: '#6b7280', strokeWidth: 1 }
      });
    });

    const allUpstreams = [...(assetData.upstreams || []), ...(assetData.upstream || [])];
    allUpstreams.forEach((upstreamAsset) => {
      const parentNode = getColumnNode(upstreamAsset);
      parentNode.data.asset.hasDownstreams = true;
      localEdges.push({ 
        id: `asset-${parentNode.id}-${node.id}`, 
        source: parentNode.id, 
        target: node.id,
        data: { type: 'asset-lineage' },
        style: { stroke: '#6b7280', strokeWidth: 1 }
      });
    });

    // Add column lineage edges
    const assetColumnLineage = columnLineageMap[assetData.name] || [];
    assetColumnLineage.forEach(columnLineage => {
      columnLineage.source_columns.forEach(sourceCol => {
        const sourceNodeExists = localNodes.has(sourceCol.asset);
        if (sourceNodeExists) {
          const edgeId = `column-${sourceCol.asset}-${sourceCol.column}-to-${assetData.name}-${columnLineage.column}`;
          localEdges.push({
            id: edgeId,
            source: sourceCol.asset,
            target: assetData.name,
            data: {
              sourceColumn: sourceCol.column,
              targetColumn: columnLineage.column,
              type: 'column-lineage'
            },
            style: {
              stroke: '#8b5cf6', // Purple color for column lineage
              strokeWidth: 2,
              strokeDasharray: '5,5'
            }
          });
        }
      });
    });
  };

  processAssetWithColumns(asset, asset.isFocusAsset);
  return { nodes: Array.from(localNodes.values()), edges: localEdges };
}

export function generateColumnGraphForUpstream(nodeName: string, pipelineData: any, focusAssetId: string) {
  const upstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!upstreamAsset) return { nodes: [], edges: [] };

  const upstream = getAssetDataset(pipelineData, upstreamAsset.id);
  const columnLineageMap = pipelineData.column_lineage || {};

  return generateColumnGraphFromJSON({
    ...upstream,
    downstream: [],
    isFocusAsset: false,
    columns: upstreamAsset.columns || [],
  }, columnLineageMap);
}

export function generateColumnGraphForDownstream(nodeName: string, pipelineData: any) {
  const downstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!downstreamAsset) return { nodes: [], edges: [] };

  const downstream = getAssetDataset(pipelineData, downstreamAsset.id);
  const columnLineageMap = pipelineData.column_lineage || {};

  return generateColumnGraphFromJSON({
    ...downstream,
    upstreams: [],
    isFocusAsset: false,
    columns: downstreamAsset.columns || [],
  }, columnLineageMap);
}
