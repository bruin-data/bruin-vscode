import type { AssetColumnInfo, ColumnInfo, ColumnLineage, ColumnUpstream } from '@/types';
import type { Node, Edge } from "@vue-flow/core";

/**
 * Process pipeline data to generate column-level lineage graph
 * @param {Object} pipelineData - The raw pipeline data with column information
 * @returns {Object} - Processed column lineage data
 */
function buildColumnLineage(pipelineData: { assets: any[], column_lineage?: Record<string, ColumnLineage[]> }): { 
  assets: any[], 
  columnLineageMap: Record<string, ColumnLineage[]>,
  assetMap: { [key: string]: any }
} {
  // Extract assets and create lookup map
  const assets = pipelineData.assets || [];
  const assetMap: { [key: string]: any } = {};
  let columnLineageMap = pipelineData.column_lineage || {};

  // Create asset map and process column information
  assets.forEach(asset => {
    assetMap[asset.name] = {
      ...asset,
      columns: asset.columns || [],
      hasColumnLineage: false, // Will be set below
      upstreams: asset.upstreams || [],
      downstreams: [] // Initialize empty downstreams array
    };
  });

  // If no column_lineage at pipeline level, build it from individual column upstreams
  if (!pipelineData.column_lineage || Object.keys(pipelineData.column_lineage).length === 0) {
    columnLineageMap = {};
    
    assets.forEach(asset => {
      if (asset.columns && Array.isArray(asset.columns)) {
        const assetColumnLineage: ColumnLineage[] = [];
        
        asset.columns.forEach((column: ColumnInfo) => {
          if (column.upstreams && Array.isArray(column.upstreams) && column.upstreams.length > 0) {
            const lineageEntry: ColumnLineage = {
              column: column.name,
              source_columns: column.upstreams.map((upstream: ColumnUpstream) => ({
                asset: upstream.table,
                column: upstream.column
              }))
            };
            assetColumnLineage.push(lineageEntry);
          }
        });
        
        if (assetColumnLineage.length > 0) {
          columnLineageMap[asset.name] = assetColumnLineage;
        }
      }
    });
  }

  // Update hasColumnLineage flag based on actual column lineage data
  Object.keys(assetMap).forEach(assetName => {
    const hasLineage = Boolean(columnLineageMap[assetName] && columnLineageMap[assetName].length > 0);
    assetMap[assetName].hasColumnLineage = hasLineage;
  });

  // Calculate downstream relationships dynamically
  assets.forEach(asset => {
    if (Array.isArray(asset.upstreams)) {
      asset.upstreams.forEach(upstream => {
        if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
          const upstreamAsset = assetMap[upstream.value];
          if (!upstreamAsset.downstreams) {
            upstreamAsset.downstreams = [];
          }
          upstreamAsset.downstreams.push({
            type: 'asset',
            value: asset.name
          });
        }
      });
    }
  });

  return {
    assets: Object.values(assetMap),
    columnLineageMap,
    assetMap
  };
}

/**
 * Edge styling configurations
 */
const EDGE_STYLES = {
  COLUMN: {
    stroke: '#3b82f6',
    strokeWidth: 0.3,
    strokeDasharray: '5,5'
  },
  ASSET: {
    stroke: '#6b7280',
    strokeWidth: 1
  }
} as const;

const EDGE_LABEL_STYLES = {
  COLUMN: {
    fontSize: '10px',
    fontWeight: 'bold',
    fill: '#3b82f6',
    background: '#ffffff',
    padding: '2px 4px',
    borderRadius: '4px',
    border: '1px solid #3b82f6'
  }
} as const;

/**
 * Create asset-level edge
 * @param {string} sourceAsset - Source asset name
 * @param {string} targetAsset - Target asset name
 * @returns {Edge} - Asset-level edge
 */
function createAssetEdge(sourceAsset: string, targetAsset: string): Edge {
  return {
    id: `asset-${sourceAsset}-to-${targetAsset}`,
    source: sourceAsset,
    target: targetAsset,
    data: {
      type: 'asset-lineage'
    },
    style: EDGE_STYLES.ASSET
  };
}

/**
 * Generate column handles for edge connections
 * @param {string} assetName - Asset name
 * @param {string} columnName - Column name
 * @param {number} columnIndex - Column index
 * @param {string} direction - Handle direction (upstream/downstream)
 * @returns {string} - Generated handle ID
 */
function generateColumnHandle(assetName: string, columnName: string, columnIndex: number, direction: string): string {
  return `col-${assetName.toLowerCase()}-${columnName.toLowerCase()}-${columnIndex}-${direction}`;
}

/**
 * Create column-level edge
 * @param {Object} sourceColumn - Source column information
 * @param {string} targetAsset - Target asset name
 * @param {string} targetColumn - Target column name
 * @param {Object} assetMap - Asset lookup map
 * @returns {Edge} - Column-level edge
 */
function createColumnEdge(
  sourceColumn: { asset: string; column: string }, 
  targetAsset: string, 
  targetColumn: string, 
  assetMap: { [key: string]: any }
): Edge {
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
    label: `${sourceColumn.column} → ${targetColumn}`,
    data: {
      type: 'column-lineage',
      sourceColumn: sourceColumn.column,
      targetColumn: targetColumn,
      sourceAsset: sourceColumn.asset,
      targetAsset: targetAsset
    },
    style: EDGE_STYLES.COLUMN,
    labelStyle: EDGE_LABEL_STYLES.COLUMN
  };
}

/**
 * Create column-level edges based on lineage information
 * @param {Set<string>} processedAssets - Set of processed asset names
 * @param {Record<string, ColumnLineage[]>} columnLineageMap - Column lineage mapping
 * @param {Object} assetMap - Asset lookup map
 * @returns {Edge[]} - Array of column-level edges
 */
function createColumnLevelEdges(
  processedAssets: Set<string>, 
  columnLineageMap: Record<string, ColumnLineage[]>, 
  assetMap: { [key: string]: any }
): Edge[] {
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
}

/**
 * Generate nodes and edges for column-level lineage visualization
 * @param {Object} lineageData - The processed column lineage data
 * @param {string} focusAssetName - The name of the asset to focus on
 * @returns {Object} - Graph data containing nodes and edges with column information
 */
function generateColumnGraph(
  lineageData: { 
    assets: any[], 
    columnLineageMap: Record<string, ColumnLineage[]>,
    assetMap: { [key: string]: any }
  }, 
  focusAssetName: string
): { nodes: Node[], edges: Edge[] } {
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

    // Add direct upstream assets
    if (focusAsset.upstreams) {
      focusAsset.upstreams.forEach(upstream => {
        if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
          const upstreamAsset = assetMap[upstream.value];
          nodes.push(createColumnNode(upstreamAsset, false, columnLineageMap[upstream.value] || []));
          processedAssets.add(upstream.value.toLowerCase());

          // Add asset-level edge from upstream to focus
          edges.push(createAssetEdge(upstream.value, focusAssetName));
        }
      });
    }

    // Add direct downstream assets
    if (focusAsset.downstreams && focusAsset.downstreams.length > 0) {
      console.log(`Adding ${focusAsset.downstreams.length} downstream assets for ${focusAssetName}`);
      focusAsset.downstreams.forEach(downstream => {
        if (downstream.type === 'asset' && downstream.value && assetMap[downstream.value]) {
          const downstreamAsset = assetMap[downstream.value];
          console.log(`Adding downstream asset: ${downstream.value}`);
          nodes.push(createColumnNode(downstreamAsset, false, columnLineageMap[downstream.value] || []));
          processedAssets.add(downstream.value.toLowerCase());

          // Add asset-level edge from focus to downstream
          edges.push(createAssetEdge(focusAssetName, downstream.value));
        }
      });
    } else {
      console.log(`No downstream assets found for ${focusAssetName}`);
    }

    // Add column-level edges based on column lineage information
    const columnEdges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    edges.push(...columnEdges);
  }

  return { nodes, edges };
}

function createColumnNode(asset: any, isFocusAsset: boolean = false, columnLineage: ColumnLineage[] = []): Node {
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
}

/**
 * Get asset dataset with column information for column-level lineage
 * @param {Object} jsonData - Raw pipeline data
 * @param {string} assetId - Asset ID to focus on
 * @returns {Object} - Asset dataset with column information
 */
function getAssetDatasetWithColumns(jsonData: any, assetId: string) {
  if (!jsonData || !jsonData.assets) {
    return null;
  }

  const asset = jsonData.assets.find((a: any) => a.id === assetId);
  if (!asset) {
    return null;
  }

  // Build column lineage relationships
  const columnLineageMap = jsonData.column_lineage || {};
  const assetColumnLineage = columnLineageMap[asset.name] || [];

  return {
    ...asset,
    columns: asset.columns || [],
    columnLineage: assetColumnLineage,
    hasColumnLineage: assetColumnLineage.length > 0
  };
}



// Export the utility functions
export {
  buildColumnLineage,
  generateColumnGraph,
  getAssetDatasetWithColumns,
  createColumnLevelEdges,
  createAssetEdge,
  createColumnEdge,
  generateColumnHandle,
};
