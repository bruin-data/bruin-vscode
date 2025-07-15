import type { AssetColumnInfo, ColumnInfo, ColumnLineage } from '@/types';
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
  const columnLineageMap = pipelineData.column_lineage || {};

  // Create asset map and process column information
  assets.forEach(asset => {
    assetMap[asset.name] = {
      ...asset,
      columns: asset.columns || [],
      hasColumnLineage: Boolean(columnLineageMap[asset.name] && columnLineageMap[asset.name].length > 0)
    };
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
    nodes.push(createColumnNode(focusAsset, true, columnLineageMap[focusAssetName] || []));
    processedAssets.add(focusAssetName);

    // Add direct upstream assets
    if (focusAsset.upstreams) {
      focusAsset.upstreams.forEach(upstream => {
        if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
          const upstreamAsset = assetMap[upstream.value];
          nodes.push(createColumnNode(upstreamAsset, false, columnLineageMap[upstream.value] || []));
          processedAssets.add(upstream.value);

          // Add asset-level edge
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
    if (focusAsset.downstreams) {
      focusAsset.downstreams.forEach(downstream => {
        if (downstream.type === 'asset' && downstream.value && assetMap[downstream.value]) {
          const downstreamAsset = assetMap[downstream.value];
          nodes.push(createColumnNode(downstreamAsset, false, columnLineageMap[downstream.value] || []));
          processedAssets.add(downstream.value);

          // Add asset-level edge
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
    }

    // Add edges between directly connected upstream and downstream assets
    if (focusAsset.upstreams && focusAsset.downstreams) {
      focusAsset.upstreams.forEach(upstream => {
        if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
          focusAsset.downstreams.forEach(downstream => {
            if (downstream.type === 'asset' && downstream.value && assetMap[downstream.value]) {
              // Check if there's a direct connection between upstream and downstream
              const upstreamAsset = assetMap[upstream.value];
              if (upstreamAsset.downstreams?.some(d => d.value === downstream.value)) {
                edges.push({
                  id: `asset-${upstream.value}-to-${downstream.value}`,
                  source: upstream.value,
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
            }
          });
        }
      });
    }

    // Add column-level edges for direct upstream connections
    const focusAssetColumnLineage = columnLineageMap[focusAssetName] || [];
    focusAssetColumnLineage.forEach(columnLineage => {
      columnLineage.source_columns.forEach(sourceCol => {
        if (processedAssets.has(sourceCol.asset)) {
          edges.push({
            id: `column-${sourceCol.asset}-${sourceCol.column}-to-${focusAssetName}-${columnLineage.column}`,
            source: sourceCol.asset,
            target: focusAssetName,
            data: {
              sourceColumn: sourceCol.column,
              targetColumn: columnLineage.column,
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

    // Add column-level edges for direct downstream connections
    processedAssets.forEach(assetName => {
      if (assetName !== focusAssetName) {
        const assetColumnLineage = columnLineageMap[assetName] || [];
        assetColumnLineage.forEach(columnLineage => {
          columnLineage.source_columns.forEach(sourceCol => {
            if (sourceCol.asset === focusAssetName) {
              edges.push({
                id: `column-${focusAssetName}-${sourceCol.column}-to-${assetName}-${columnLineage.column}`,
                source: focusAssetName,
                target: assetName,
                data: {
                  sourceColumn: sourceCol.column,
                  targetColumn: columnLineage.column,
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
      }
    });
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
