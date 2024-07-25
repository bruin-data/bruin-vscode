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
