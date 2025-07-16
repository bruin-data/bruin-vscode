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
    processedAssets.add(focusAssetName);

    // Add direct upstream assets
    if (focusAsset.upstreams) {
      focusAsset.upstreams.forEach(upstream => {
        if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
          const upstreamAsset = assetMap[upstream.value];
          nodes.push(createColumnNode(upstreamAsset, false, columnLineageMap[upstream.value] || []));
          processedAssets.add(upstream.value);

          // Add asset-level edge from upstream to focus
          edges.push({
            id: `asset-${upstream.value}-to-${focusAssetName}`,
            source: upstream.value,
            target: focusAssetName,
            data: {
              type: 'asset-lineage'
            },
            style: {
              stroke: '#6b7280',
              strokeWidth: 1
            }
          });
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
          processedAssets.add(downstream.value);

          // Add asset-level edge from focus to downstream
          edges.push({
            id: `asset-${focusAssetName}-to-${downstream.value}`,
            source: focusAssetName,
            target: downstream.value,
            data: {
              type: 'asset-lineage'
            },
            style: {
              stroke: '#6b7280',
              strokeWidth: 1
            }
          });
        }
      });
    } else {
      console.log(`No downstream assets found for ${focusAssetName}`);
    }

    // Column-level edge creation has been removed
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
};
