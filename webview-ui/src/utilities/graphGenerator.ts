// Graph generation utilities for lineage visualization

import { getAssetDataset } from "@/components/lineage-flow/asset-lineage/useAssetLineage";
import { processUpstreamAssets, processDownstreamAssets } from "@/components/lineage-flow/column-level/useColumnLevel";
import type { AssetColumnInfo, ColumnInfo, ColumnLineage, ColumnUpstream } from '@/types';
import type { Node, Edge } from "@vue-flow/core";

// Asset-level graph generation
export const generateGraphFromJSON = (asset) => {
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
};

export const generateGraphForUpstream = (nodeName: string, pipelineData: any, focusAssetId: string) => {
  const upstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!upstreamAsset) return { nodes: [], edges: [] };

  const upstream = getAssetDataset(pipelineData, upstreamAsset.id);
  const focusAssetUpstreavms = pipelineData.assets.find((asset: any) => asset.id === focusAssetId)?.upstreams.map((upstream: any) => upstream.value) || [];

  return generateGraphFromJSON({
    ...upstream,
    downstream: [],
    isFocusAsset: false,
  });
};

export const generateGraphForDownstream = (nodeName: string, pipelineData: any) => {
  const downstreamAsset = pipelineData.assets.find((asset: any) => asset.name === nodeName);
  if (!downstreamAsset) return { nodes: [], edges: [] };

  const downstream = getAssetDataset(pipelineData, downstreamAsset.id);
  return generateGraphFromJSON({
    ...downstream,
    upstreams: [],
    isFocusAsset: false,
  });
};

// Column-level graph generation utilities

/**
 * Edge styling configurations
 */
const EDGE_STYLES = {
  COLUMN: {
    stroke: '#6b7280',
    strokeWidth: 0.3,
    strokeDasharray: '5,5'
  },
  ASSET: {
    stroke: '#6b7280',
    strokeWidth: 1
  }
} as const;



/**
 * Create asset-level edge
 */
export const createAssetEdge = (sourceAsset: string, targetAsset: string): Edge => {
  return {
    id: `asset-${sourceAsset}-to-${targetAsset}`,
    source: sourceAsset,
    target: targetAsset,
    data: {
      type: 'asset-lineage'
    },
    style: EDGE_STYLES.ASSET
  };
};

/**
 * Generate column handles for edge connections
 */
export const generateColumnHandle = (assetName: string, columnName: string, columnIndex: number, direction: string): string => {
  return `col-${assetName.toLowerCase()}-${columnName.toLowerCase()}-${columnIndex}-${direction}`;
};

/**
 * Create column-level edge
 */
export const createColumnEdge = (
  sourceColumn: { asset: string; column: string }, 
  targetAsset: string, 
  targetColumn: string, 
  assetMap: { [key: string]: any }
): Edge => {
  const sourceAsset = assetMap[sourceColumn.asset];
  const targetAssetData = assetMap[targetAsset];
  
  const sourceColumnIndex = sourceAsset?.columns?.findIndex(c => c.name.toLowerCase() === sourceColumn.column.toLowerCase()) ?? 0;
  const targetColumnIndex = targetAssetData?.columns?.findIndex(c => c.name.toLowerCase() === targetColumn.toLowerCase()) ?? 0;
  
  const sourceHandle = generateColumnHandle(sourceColumn.asset, sourceColumn.column, sourceColumnIndex, 'downstream');
  const targetHandle = generateColumnHandle(targetAsset, targetColumn, targetColumnIndex, 'upstream');
  
  const edgeId = `column-${sourceColumn.asset.toLowerCase()}.${sourceColumn.column.toLowerCase()}-to-${targetAsset.toLowerCase()}.${targetColumn.toLowerCase()}`;
  
  return {
    id: edgeId,
    source: sourceColumn.asset,
    target: targetAsset,
    sourceHandle: sourceHandle,
    targetHandle: targetHandle,
    data: {
      type: 'column-lineage',
      sourceColumn: sourceColumn.column,
      targetColumn: targetColumn,
      sourceAsset: sourceColumn.asset,
      targetAsset: targetAsset
    },
    style: EDGE_STYLES.COLUMN
  };
};

/**
 * Create column-level edges based on lineage information
 */
export const createColumnLevelEdges = (
  processedAssets: Set<string>, 
  columnLineageMap: Record<string, ColumnLineage[]>, 
  assetMap: { [key: string]: any }
): Edge[] => {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // Track unique edges to prevent duplicates
  
  processedAssets.forEach(assetName => {
    const assetColumnLineage = columnLineageMap[assetName];
    if (!assetColumnLineage || assetColumnLineage.length === 0) return;
    
    assetColumnLineage.forEach(lineage => {
      lineage.source_columns.forEach(sourceColumn => {
        if (!processedAssets.has(sourceColumn.asset.toLowerCase())) return;
        
        const edgeId = `column-${sourceColumn.asset.toLowerCase()}.${sourceColumn.column.toLowerCase()}-to-${assetName.toLowerCase()}.${lineage.column.toLowerCase()}`;
        
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          const edge = createColumnEdge(sourceColumn, assetName, lineage.column, assetMap);
          edges.push(edge);
        }
      });
    });
  });
  
  return edges;
};

/**
 * Create column node
 */
export const createColumnNode = (asset: any, isFocusAsset: boolean = false, columnLineage: ColumnLineage[] = []): Node => {
  return {
    id: asset.name,
    type: 'customWithColumn', // Different node type for column display
    position: { x: 0, y: 0 }, // Initial position to be adjusted by layout
    data: {
      label: asset.name,
      type: 'asset',
      asset: {
        ...asset,
        isFocusAsset,
        hasUpstreams: Array.isArray(asset.upstreams) && asset.upstreams.length > 0,
        hasDownstreams: Array.isArray(asset.downstreams) && asset.downstreams.length > 0,
        path: asset.definition_file?.path || asset.path,
        columns: asset.columns || [],
        columnLineage: columnLineage
      },
      hasUpstreamForClicking: asset.hasUpstreams,
      hasDownstreamForClicking: asset.hasDownstreams,
      columns: asset.columns || [],
      columnLineage: columnLineage
    }
  };
};

/**
 * Generate nodes and edges for column-level lineage visualization
 */
export const generateColumnGraph = (
  lineageData: { 
    assets: any[], 
    columnLineageMap: Record<string, ColumnLineage[]>,
    assetMap: { [key: string]: any }
  }, 
  focusAssetName: string
): { nodes: Node[], edges: Edge[] } => {
  const { assetMap, columnLineageMap } = lineageData;
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const processedAssets = new Set<string>();

  // First, add the focus asset
  const focusAsset = assetMap[focusAssetName];
  if (focusAsset) {
    console.log(`Focus asset ${focusAssetName} downstreams:`, focusAsset.downstreams);
    nodes.push(createColumnNode(focusAsset, true, columnLineageMap[focusAssetName] || []));
    processedAssets.add(focusAssetName.toLowerCase());

    // Process upstream assets using helper function
    const upstreamResult = processUpstreamAssets(focusAsset, assetMap, columnLineageMap, processedAssets);
    nodes.push(...upstreamResult.nodes);
    edges.push(...upstreamResult.edges);

    // Process downstream assets using helper function
    const downstreamResult = processDownstreamAssets(focusAsset, assetMap, columnLineageMap, processedAssets);
    nodes.push(...downstreamResult.nodes);
    edges.push(...downstreamResult.edges);

    // Add column-level edges based on column lineage information
    const columnEdges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    edges.push(...columnEdges);
  }

  return { nodes, edges };
};
