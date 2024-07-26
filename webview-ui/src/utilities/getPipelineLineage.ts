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
  if (!pipelineJson) {
    return { assets: [] };
  }

  if (!pipelineJson.assets || pipelineJson.assets.length === 0) {
    return { assets: [] };
  }
  const assets = pipelineJson.assets.map((asset) => {
    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      upstreams: [],
      downstreams: [],
    };
  });

  const assetMap: { [name: string]: SimpleAsset } = {};
  assets.forEach((asset) => {
    assetMap[asset.name] = asset;
  });

  // Populate upstreams
  pipelineJson.assets.forEach((asset) => {
    if (asset.upstreams) {
      const upstreamNames = asset.upstreams.map((upstream) => upstream.value);
      assetMap[asset.name].upstreams = upstreamNames;
    }
  });

  // Populate downstreams
  pipelineJson.assets.forEach((asset) => {
    if (asset.upstreams) {
      asset.upstreams.forEach((upstream) => {
        if (assetMap[upstream.value]) {
          assetMap[upstream.value].downstreams.push(asset.name);
        }
      });
    }
  });
  return { assets };
};


// function that get the full dependencies of an asset and return all the dependencies of the asset dependencies and so on
// until all the dependencies are found
export const getAssetDependencies = (assetId: string, pipelineAssets: SimpleAsset[]): any => {
  const asset = pipelineAssets.find((asset) => asset.id === assetId);
  if (!asset) {
    return null;
  }

  const buildDependencyTree = (currentAssetId: string, visited: Set<string> = new Set()): any => {
    if (visited.has(currentAssetId)) {
      return null; // Circular dependency detected, stop recursion
    }

    visited.add(currentAssetId);

    const currentAsset = pipelineAssets.find((asset) => asset.id === currentAssetId);
    if (!currentAsset) {
      return null;
    }

    const buildDependency = (dependencyName: string) => {
      const dependencyAsset = pipelineAssets.find((asset) => asset.name === dependencyName);
      if (dependencyAsset) {
        return buildDependencyTree(dependencyAsset.id, new Set(visited));
      } else {
        // If the asset is not found in pipelineAssets, still include it in the tree
        return {
          name: dependencyName,
          upstreams: [],
          downstreams: [],
        };
      }
    };

    const upstreams = currentAsset.upstreams.map(buildDependency);
    const downstreams = currentAsset.downstreams.map(buildDependency);

    return {
      name: currentAsset.name,
      upstreams: upstreams.filter(Boolean), // Remove nulls from the array
      downstreams: downstreams.filter(Boolean), // Remove nulls from the array
    };
  };

  return buildDependencyTree(assetId);
};


