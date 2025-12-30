import type { AssetColumnInfo, ColumnInfo, ColumnLineage, ColumnUpstream } from '@/types';
import type { Node, Edge } from "@vue-flow/core";
import { 
  createAssetEdge,  
  createColumnNode, 
   
} from '@/utilities/graphGenerator';
import { findDownstreamAssets, getDownstreamAssetNames } from '@/utilities/assetDependencies';

export const getAssetDatasetWithColumns = (
  pipelineData: any,
  assetId: string,
) => {
  if (!pipelineData || !pipelineData.assets) {
    return null;
  }
  console.log("pipelineData for columns", pipelineData);

  const findAssetById = (id: string) => {
    if (!id) return null;
    return pipelineData.assets.find(asset => asset.id === id);
  };

  const buildColumnLineageMap = () => {
    let columnLineageMap = pipelineData.column_lineage || {};
    
    // If no column_lineage at pipeline level, build it from individual column upstreams
    if (!pipelineData.column_lineage || Object.keys(pipelineData.column_lineage).length === 0) {
      columnLineageMap = {};
      
      pipelineData.assets.forEach(asset => {
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
    
    return columnLineageMap;
  };

  const getUpstreamAsset = (upstream) => {
    if (upstream.type === "uri") {
      return { name: upstream.value, external: true };
    }
    const asset = pipelineData.assets.find(asset => asset.name === upstream.value);
    if (!asset) return null;
    
    return {
      name: asset.name,
      type: asset.type,
      pipeline: pipelineData.name,
      path: asset.definition_file?.path || asset.path,
      columns: asset.columns || [],
      isFocusAsset: false,
      hasUpstreamForClicking: asset.upstreams?.length > 0,
      hasDownstreamForClicking: false,
    };
  };

  const deduceDownstream = (asset) => {
    return getDownstreamAssetNames(asset.name, pipelineData.assets)
      .map(name => ({
        type: "asset",
        value: name
      }));
  };

  const getDownstreamAssets = (asset) => {
    return findDownstreamAssets(asset.name, pipelineData.assets)
      .map(a => {
        const downstreams = deduceDownstream(a);
        return {
          name: a.name,
          type: a.type,
          pipeline: pipelineData.name,
          path: a.definition_file?.path || a.path,
          columns: a.columns || [],
          isFocusAsset: false,
          hasUpstreamForClicking: false,
          hasDownstreamForClicking: downstreams.length > 0,
        };
      });
  };

  const asset = findAssetById(assetId);

  if (!asset) {
    console.warn(`Asset with ID ${assetId} not found.`);
    return null;
  }

  const columnLineageMap = buildColumnLineageMap();
  const assetColumnLineage = columnLineageMap[asset.name] || [];
  const upstreams = asset.upstreams?.map(getUpstreamAsset).filter(Boolean) || [];
  const downstreams = getDownstreamAssets(asset);

  const result = {
    id: asset.id,
    isFocusAsset: asset.isFocusAsset || true,
    name: asset.name,
    type: asset.type,
    pipeline: pipelineData.name,
    path: asset.definition_file?.path || asset.path,
    columns: asset.columns || [],
    columnLineage: assetColumnLineage,
    hasColumnLineage: assetColumnLineage.length > 0,
    upstreams: upstreams,
    downstream: downstreams,
  };

  console.log("Column Result", JSON.stringify(result, null, 2));
  return result;
};

/**
 * Process pipeline data to generate column-level lineage graph
 * @param {Object} pipelineData - The raw pipeline data with column information
 * @returns {Object} - Processed column lineage data
 */
export const buildColumnLineage = (pipelineData: { assets: any[], column_lineage?: Record<string, ColumnLineage[]> }): { 
  assets: any[], 
  columnLineageMap: Record<string, ColumnLineage[]>,
  assetMap: { [key: string]: any }
} => {
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
};

/**
 * Process upstream assets for column-level lineage
 * @param {any} focusAsset - The focus asset
 * @param {Object} assetMap - Asset lookup map
 * @param {Record<string, ColumnLineage[]>} columnLineageMap - Column lineage mapping
 * @param {Set<string>} processedAssets - Set to track processed assets
 * @returns {Object} - Upstream nodes and edges
 */
export const processUpstreamAssets = (
  focusAsset: any,
  assetMap: { [key: string]: any },
  columnLineageMap: Record<string, ColumnLineage[]>,
  processedAssets: Set<string>
): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (focusAsset.upstreams) {
    focusAsset.upstreams.forEach(upstream => {
      if (upstream.type === 'asset' && upstream.value && assetMap[upstream.value]) {
        const upstreamAsset = assetMap[upstream.value];
        nodes.push(createColumnNode(upstreamAsset, false, columnLineageMap[upstream.value] || []));
        processedAssets.add(upstream.value.toLowerCase());

        // Add asset-level edge from upstream to focus
        edges.push(createAssetEdge(upstream.value, focusAsset.name));
      }
    });
  }

  return { nodes, edges };
};

/**
 * Process downstream assets for column-level lineage
 * @param {any} focusAsset - The focus asset
 * @param {Object} assetMap - Asset lookup map
 * @param {Record<string, ColumnLineage[]>} columnLineageMap - Column lineage mapping
 * @param {Set<string>} processedAssets - Set to track processed assets
 * @returns {Object} - Downstream nodes and edges
 */
export const processDownstreamAssets = (
  focusAsset: any,
  assetMap: { [key: string]: any },
  columnLineageMap: Record<string, ColumnLineage[]>,
  processedAssets: Set<string>
): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (focusAsset.downstreams && focusAsset.downstreams.length > 0) {
    console.log(`Adding ${focusAsset.downstreams.length} downstream assets for ${focusAsset.name}`);
    focusAsset.downstreams.forEach(downstream => {
      if (downstream.type === 'asset' && downstream.value && assetMap[downstream.value]) {
        const downstreamAsset = assetMap[downstream.value];
        console.log(`Adding downstream asset: ${downstream.value}`);
        nodes.push(createColumnNode(downstreamAsset, false, columnLineageMap[downstream.value] || []));
        processedAssets.add(downstream.value.toLowerCase());

        // Add asset-level edge from focus to downstream
        edges.push(createAssetEdge(focusAsset.name, downstream.value));
      }
    });
  } else {
    console.log(`No downstream assets found for ${focusAsset.name}`);
  }

  return { nodes, edges };
};
