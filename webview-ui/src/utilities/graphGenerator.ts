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
      localEdges.push({ 
        id: `${node.id}-${childNode.id}`, 
        source: node.id, 
        target: childNode.id,
        style: {
          stroke: '#ffffff',
          strokeWidth: 1
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#ffffff'
        }
      });
    });

    const allUpstreams = [...(assetData.upstreams || []), ...(assetData.upstream || [])];
    allUpstreams.forEach((upstreamAsset) => {
      const parentNode = getNode(upstreamAsset);
      parentNode.data.asset.hasDownstreams = true;
      localEdges.push({ 
        id: `${parentNode.id}-${node.id}`, 
        source: parentNode.id, 
        target: node.id,
        style: {
          stroke: '#ffffff',
          strokeWidth: 1
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#ffffff'
        }
      });
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
  const columnNodeMap = new Map();
  
  // Create upstream table nodes first
  const upstreamTables = new Set();
  if (asset.columns) {
    asset.columns.forEach((column: any) => {
      if (column.upstreams) {
        column.upstreams.forEach((upstream: any) => {
          upstreamTables.add(upstream.table);
        });
      }
    });
  }
  
  // Create upstream table nodes
  Array.from(upstreamTables).forEach((tableName, index: number) => {
    const upstreamAsset = asset.upstreams?.find((u: any) => u.value === tableName);
    const upstreamNode = {
      id: tableName,
      type: 'custom',
      position: { x: -400, y: index * 200 },
      data: {
        label: tableName,
        type: 'asset',
        asset: {
          name: tableName,
          type: upstreamAsset?.type || "asset",
          pipeline: asset.pipeline || "unknown",
          path: upstreamAsset?.path || "unknown",
          columns: upstreamAsset?.columns || [],
          isFocusAsset: false,
          hasUpstreams: false,
          hasDownstreams: true
        },
        hasUpstreamForClicking: false,
        hasDownstreamForClicking: false
      }
    };
    nodes.push(upstreamNode);
  });
  
  // Create main asset node with columns
  const mainNode = {
    id: asset.name,
    type: 'custom',
    position: { x: 200, y: 0 },
    data: {
      label: asset.name,
      type: 'asset',
      asset: {
        name: asset.name,
        type: asset.type || "unknown",
        pipeline: asset.pipeline || "unknown",
        path: asset.executable_file?.path || asset.definition_file?.path || asset.path || "unknown",
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
  
  // Create column-level edges
  if (asset.columns) {
    asset.columns.forEach((column: any) => {
      if (column.upstreams && column.upstreams.length > 0) {
        column.upstreams.forEach((upstream: any, upstreamIndex: number) => {
                     // Create edge from upstream column to target column
           const edgeId = `${upstream.table}.${upstream.column}-${asset.name}.${column.name}`;
           const edge = {
             id: edgeId,
             source: upstream.table,
             target: asset.name,
             type: 'default',
             sourceHandle: `${upstream.table}-${upstream.column}`,
             targetHandle: `${asset.name}-${column.name}`,
             data: {
               sourceColumn: upstream.column,
               targetColumn: column.name,
               isColumnLineage: true
             },
             style: {
               stroke: '#ffffff',
               strokeWidth: 2,
               strokeDasharray: '5,5'
             },
             markerEnd: 'arrowclosed'
           };
          edges.push(edge);
        });
      }
    });
  }
  
  return { nodes, edges };
};
