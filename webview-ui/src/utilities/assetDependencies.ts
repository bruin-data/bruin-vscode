/**
 * Utility functions for asset dependency traversal
 */

type AssetMap = Map<string, any>;
type DependencyMap = Map<string, string[]>;

// Cache for dependency maps to avoid rebuilding for same pipeline data
const dependencyMapCache = new WeakMap<any[], {
  assetMap: AssetMap;
  downstreamMap: DependencyMap;  
  upstreamMap: DependencyMap;
}>();

/**
 * Build optimized lookup maps from pipeline data with caching
 */
function buildDependencyMaps(pipelineAssets: any[]): {
  assetMap: AssetMap;
  downstreamMap: DependencyMap;
  upstreamMap: DependencyMap;
} {
  const cached = dependencyMapCache.get(pipelineAssets);
  if (cached) return cached;
  const assetMap = new Map<string, any>();
  const downstreamMap = new Map<string, string[]>();
  const upstreamMap = new Map<string, string[]>();

  pipelineAssets.forEach(asset => {
    assetMap.set(asset.name, asset);
  });

  pipelineAssets.forEach(asset => {
    const upstreams = asset.upstreams?.map((up: any) => up.value) || [];
    upstreamMap.set(asset.name, upstreams);

    upstreams.forEach(upstreamName => {
      if (!downstreamMap.has(upstreamName)) {
        downstreamMap.set(upstreamName, []);
      }
      downstreamMap.get(upstreamName)!.push(asset.name);
    });
  });

  const result = { assetMap, downstreamMap, upstreamMap };
  
  // Cache for future calls
  dependencyMapCache.set(pipelineAssets, result);
  
  return result;
}

/**
 * Find all assets that depend on the given asset (downstream)
 */
export const findDownstreamAssets = (assetName: string, pipelineAssets: any[]): any[] => {
  const { assetMap, downstreamMap } = buildDependencyMaps(pipelineAssets);
  const downstreamNames = downstreamMap.get(assetName) || [];
  return downstreamNames.map(name => assetMap.get(name)!).filter(Boolean);
};

/**
 * Get all downstream asset names for a given asset
 */
export const getDownstreamAssetNames = (assetName: string, pipelineAssets: any[]): string[] => {
  const { downstreamMap } = buildDependencyMaps(pipelineAssets);
  return downstreamMap.get(assetName) || [];
};

export const fetchAllDownstreams = (assetName: string, pipelineAssets: any[], resultAssets: any[] = []): any[] => {
  const { assetMap, downstreamMap } = buildDependencyMaps(pipelineAssets);
  const visited = new Set<string>(resultAssets.map(a => a.name));
  const result: any[] = [...resultAssets];

  function dfsDownstream(currentName: string) {
    if (visited.has(currentName)) return;
    
    const asset = assetMap.get(currentName);
    if (!asset) return;

    visited.add(currentName);
    result.push(asset);

    const downstreams = downstreamMap.get(currentName) || [];
    downstreams.forEach(dfsDownstream);
  }

  dfsDownstream(assetName);
  return result;
};

export const fetchAllUpstreams = (assetName: string, pipelineAssets: any[], resultAssets: any[] = []): any[] => {
  const { assetMap, upstreamMap } = buildDependencyMaps(pipelineAssets);
  const visited = new Set<string>(resultAssets.map(a => a.name));
  const result: any[] = [...resultAssets];

  function dfsUpstream(currentName: string) {
    if (visited.has(currentName)) return;
    
    const asset = assetMap.get(currentName);
    if (!asset) return;

    visited.add(currentName);
    result.push(asset);

    const upstreams = upstreamMap.get(currentName) || [];
    upstreams.forEach(dfsUpstream);
  }

  dfsUpstream(assetName);
  return result;
};