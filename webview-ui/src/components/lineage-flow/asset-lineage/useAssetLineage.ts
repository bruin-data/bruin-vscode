import type { AssetDataset } from "@/types";
import { findDownstreamAssets, getDownstreamAssetNames } from '@/utilities/assetDependencies';
 
export const getAssetDataset = (
  pipelineData,
  assetId,
): AssetDataset  | null => {
  if (!pipelineData) {
    return null;
  } 
  console.log("pipelineData", pipelineData);


  const findAssetById = (id) => {
    if (!id) return null;
    return pipelineData.assets.find(asset => asset.id === id);
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
      path: asset.definition_file.path,
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
  }

  const getDownstreamAssets = (asset) => {
    return findDownstreamAssets(asset.name, pipelineData.assets)
      .map(a => {
        const downstreams = deduceDownstream(a);
        return {
          name: a.name,
          type: a.type,
          pipeline: pipelineData.name,
          path: a.definition_file.path,
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

  const upstreams = asset.upstreams.map(getUpstreamAsset).filter(Boolean);
  const downstreams = getDownstreamAssets(asset);
  
  const result = {
    id: asset.id,
    isFocusAsset: asset.isFocusAsset || true,
    name: asset.name,
    type: asset.type,
    pipeline: pipelineData.name,
    path: asset.definition_file.path,
    upstreams: upstreams,
    downstream: downstreams,
  };

  console.log("Result", JSON.stringify(result, null, 2));
  return result;
}
 