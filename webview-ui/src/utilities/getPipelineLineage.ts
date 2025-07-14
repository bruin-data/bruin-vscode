import type { PipelineAssets, SimpleAsset } from "@/types";
/**
 * Parses the pipeline data from the JSON object.
 *
 * @param pipelineJson The pipeline JSON object.
 *
 * @returns The pipeline assets.
 *
 */

export const parsePipelineData = (pipelineJson): PipelineAssets => {
  if (!pipelineJson || !pipelineJson.assets || pipelineJson.assets.length === 0) {
    return { assets: [] };
  }

  const assetMap: { [name: string]: SimpleAsset } = {};
  const assets = pipelineJson.assets.map((asset) => {
    const newAsset = {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      pipeline: asset.pipeline || '',
      path: asset.path || '',
      upstreams: [],
      downstream: [],
    };
    assetMap[asset.name] = newAsset;
    return newAsset;
  });

  // Populate upstreams and downstreams
  pipelineJson.assets.forEach((asset) => {
    if (asset.upstreams) {
      const upstreamNames = asset.upstreams.map((upstream) => upstream.value);
      assetMap[asset.name].upstreams = upstreamNames;

      upstreamNames.forEach((upstreamName) => {
        if (assetMap[upstreamName]) {
          assetMap[upstreamName].downstream.push(asset.name);
        }
      });
    }
  });

  return { assets };
};

// Function that gets the full dependencies of an asset and returns all the dependencies recursively
export const getAssetDependencies = (assetId: string, pipelineAssets: SimpleAsset[]): any => {
  const asset = pipelineAssets.find((asset) => asset.id === assetId);
  if (!asset) return null;

  const buildDependencyTree = (currentAssetId: string, visited: Set<string> = new Set()): any => {
    if (visited.has(currentAssetId)) return null; // Circular dependency detected

    visited.add(currentAssetId);
    const currentAsset = pipelineAssets.find((asset) => asset.id === currentAssetId);
    if (!currentAsset) return null;

    const upstreams = currentAsset.upstreams.map((dependencyName) => {
      const dependencyAsset = pipelineAssets.find((asset) => asset.name === dependencyName);
      return dependencyAsset ? buildDependencyTree(dependencyAsset.id, new Set(visited)) : { name: dependencyName, upstreams: [], downstream: [] };
    });

    const downstreams = currentAsset.downstream.map((dependencyName) => {
      const dependencyAsset = pipelineAssets.find((asset) => asset.name === dependencyName);
      return dependencyAsset ? buildDependencyTree(dependencyAsset.id, new Set(visited)) : { name: dependencyName, upstreams: [], downstream: [] };
    });

    return {
      name: currentAsset.name,
      upstreams: upstreams.filter(Boolean),
      downstream: downstreams.filter(Boolean),
    };
  };

  return buildDependencyTree(assetId);
};

// Function that processes the asset dependencies and returns the dependencies that can be clicked
export const processAssetDependencies = (assetId: string, pipelineAssets: SimpleAsset[]): any => {
  const assetDependencies = getAssetDependencies(assetId, pipelineAssets);
  if (!assetDependencies) return null;

  const processDependency = (dependency) => ({
    name: dependency.name,
    hasUpstreamForClicking: dependency.upstreams.length > 0,
    hasDownstreamForClicking: dependency.downstream.length > 0,
  });

  return {
    name: assetDependencies.name,
    upstreams: assetDependencies.upstreams.map(processDependency),
    downstream: assetDependencies.downstream.map(processDependency),
  };
}



