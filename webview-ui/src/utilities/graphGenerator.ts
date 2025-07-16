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

    // Only add asset edges if this is the focus asset
    if (isFocusAsset) {
      // Add asset edges from upstream to focus
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

      // Add asset edges from focus to downstream
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

      // Add column lineage edges only for the focus asset
      const assetColumnLineage = columnLineageMap[assetData.name] || [];
      assetColumnLineage.forEach(columnLineage => {
        columnLineage.source_columns.forEach(sourceCol => {
          const sourceNodeExists = localNodes.has(sourceCol.asset);
          if (sourceNodeExists && sourceCol.asset !== assetData.name) {
            const edgeId = `column-${sourceCol.asset}-${sourceCol.column}-to-${assetData.name}-${columnLineage.column}`;
            localEdges.push({
              id: edgeId,
              source: sourceCol.asset,
              sourceHandle: `column-${sourceCol.column}`,
              target: assetData.name,
              targetHandle: `column-${columnLineage.column}`,
              data: {
                sourceColumn: sourceCol.column,
                targetColumn: columnLineage.column,
                sourceAsset: sourceCol.asset,
                targetAsset: assetData.name,
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

      // Add column lineage edges from focus to downstream assets
      assetData.downstream?.forEach((downstreamAsset) => {
        const downstreamColumnLineage = columnLineageMap[downstreamAsset.name] || [];
        downstreamColumnLineage.forEach(lineage => {
          lineage.source_columns.forEach(sourceCol => {
            // Check if this source column comes from the focus asset
            if (sourceCol.asset === assetData.name) {
              const edgeId = `column-${assetData.name}-${sourceCol.column}-to-${downstreamAsset.name}-${lineage.column}`;
              localEdges.push({
                id: edgeId,
                source: assetData.name,
                sourceHandle: `column-${sourceCol.column}`,
                target: downstreamAsset.name,
                targetHandle: `column-${lineage.column}`,
                data: {
                  sourceColumn: sourceCol.column,
                  targetColumn: lineage.column,
                  sourceAsset: assetData.name,
                  targetAsset: downstreamAsset.name,
                  type: 'column-lineage'
                },
                style: {
                  stroke: '#8b5cf6',
                  strokeWidth: 2,
                  strokeDasharray: '5,5'
                }
              });
            }
          });
        });
      });
    }
  };

  processAssetWithColumns(asset, asset.isFocusAsset);
  return { nodes: Array.from(localNodes.values()), edges: localEdges };
}

export function generateColumnGraphForUpstream(nodeName: string, pipelineData: any, focusAssetId: string) {
  const upstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!upstreamAsset) return { nodes: [], edges: [] };

  const upstream = getAssetDataset(pipelineData, upstreamAsset.id);
  const focusAsset = pipelineData.assets.find((asset: any) => asset.id === focusAssetId);
  const columnLineageMap = pipelineData.column_lineage || {};

  const result = generateColumnGraphFromJSON({
    ...upstream,
    downstream: [], // Remove downstream to prevent direct connections
    isFocusAsset: false,
    columns: upstreamAsset.columns || [],
  }, columnLineageMap);

  // Only add column lineage edges from upstream to focus asset (if focus asset exists)
  if (focusAsset && columnLineageMap[focusAsset.name]) {
    const focusAssetLineage = columnLineageMap[focusAsset.name];
    
    focusAssetLineage.forEach(lineage => {
      lineage.source_columns.forEach(sourceCol => {
        // Check if this source column comes from the current upstream asset
        if (sourceCol.asset === nodeName) {
          const edgeId = `column-${nodeName}-${sourceCol.column}-to-${focusAsset.name}-${lineage.column}`;
          
          // Only add if edge doesn't already exist
          const edgeExists = result.edges.some(edge => edge.id === edgeId);
          if (!edgeExists) {
            result.edges.push({
              id: edgeId,
              source: nodeName,
              sourceHandle: `column-${sourceCol.column}`,
              target: focusAsset.name,
              targetHandle: `column-${lineage.column}`,
              data: {
                sourceColumn: sourceCol.column,
                targetColumn: lineage.column,
                sourceAsset: nodeName,
                targetAsset: focusAsset.name,
                type: 'column-lineage'
              },
              style: {
                stroke: '#8b5cf6', // Purple color for column lineage
                strokeWidth: 2,
                strokeDasharray: '5,5' // Dashed lines
              }
            });
          }
        }
      });
    });

    // Add asset-level edge from upstream to focus
    const assetEdgeId = `asset-${nodeName}-to-${focusAsset.name}`;
    const assetEdgeExists = result.edges.some(edge => edge.id === assetEdgeId);
    if (!assetEdgeExists) {
      result.edges.push({
        id: assetEdgeId,
        source: nodeName,
        target: focusAsset.name,
        data: { type: 'asset-lineage' },
        style: { stroke: '#6b7280', strokeWidth: 1 }
      });
    }
  }

  return result;
}

export function generateColumnGraphForDownstream(nodeName: string, pipelineData: any, focusAssetId: string) {
  const downstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!downstreamAsset) return { nodes: [], edges: [] };

  const downstream = getAssetDataset(pipelineData, downstreamAsset.id);
  const focusAsset = pipelineData.assets.find((asset: any) => asset.id === focusAssetId);
  const columnLineageMap = pipelineData.column_lineage || {};

  const result = generateColumnGraphFromJSON({
    ...downstream,
    upstreams: [], // Remove upstreams to prevent direct connections
    isFocusAsset: false,
    columns: downstreamAsset.columns || [],
  }, columnLineageMap);

  // Only add column lineage edges from focus asset to downstream (if focus asset exists)
  if (focusAsset && columnLineageMap[nodeName]) {
    const downstreamAssetLineage = columnLineageMap[nodeName];
    
    downstreamAssetLineage.forEach(lineage => {
      lineage.source_columns.forEach(sourceCol => {
        // Check if this source column comes from the focus asset
        if (sourceCol.asset === focusAsset.name) {
          const edgeId = `column-${focusAsset.name}-${sourceCol.column}-to-${nodeName}-${lineage.column}`;
          
          // Only add the edge if it's not already present
          const edgeExists = result.edges.some(edge => edge.id === edgeId);
          if (!edgeExists) {
            result.edges.push({
              id: edgeId,
              source: focusAsset.name,
              sourceHandle: `column-${sourceCol.column}`,
              target: nodeName,
              targetHandle: `column-${lineage.column}`,
              data: {
                sourceColumn: sourceCol.column,
                targetColumn: lineage.column,
                sourceAsset: focusAsset.name,
                targetAsset: nodeName,
                type: 'column-lineage'
              },
              style: {
                stroke: '#8b5cf6', // Purple color for column lineage
                strokeWidth: 2,
                strokeDasharray: '5,5' // Dashed lines
              }
            });
          }
        }
      });
    });

    // Add asset-level edge from focus to downstream
    const assetEdgeId = `asset-${focusAsset.name}-to-${nodeName}`;
    const assetEdgeExists = result.edges.some(edge => edge.id === assetEdgeId);
    if (!assetEdgeExists) {
      result.edges.push({
        id: assetEdgeId,
        source: focusAsset.name,
        target: nodeName,
        data: { type: 'asset-lineage' },
        style: { stroke: '#6b7280', strokeWidth: 1 }
      });
    }
  }

  return result;
}
