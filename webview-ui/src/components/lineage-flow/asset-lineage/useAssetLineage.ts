import type { AssetDataset } from "@/types";
 
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
      hasUpstreamForClicking: asset.upstreams && asset.upstreams.length > 0,
      hasDownstreamForClicking: false,
    };
  };

  const deduceDownstream = (asset) => {
    // Simple O(n) lookup instead of building full map
    return pipelineData.assets
      .filter(a => a.upstreams?.some(up => up.value === asset.name))
      .map(a => ({
        type: "asset",
        value: a.name
      }));
  }

  const getDownstreamAssets = (asset) => {
    return pipelineData.assets.filter(a => a.upstreams.some(up => up.value === asset.name))
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
    throw new Error(`Asset with ID ${assetId} not found.`);
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
 