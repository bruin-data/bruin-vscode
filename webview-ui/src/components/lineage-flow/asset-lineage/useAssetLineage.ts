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
    return pipelineData.assets.find(asset => asset.id === id);
  };

  const getUpstreamAsset = (upstream) => {
    if (upstream.type === "uri") {
      return { name: upstream.value, external: true };
    }
    const asset = pipelineData.assets.find(asset => asset.name === upstream.value);
    if (asset) {
      return {
        name: asset.name,
        type: asset.type,
        pipeline: pipelineData.name,
        path: asset.definition_file.path,
        isFocusAsset: false,
        hasUpstreamForClicking: asset.upstreams && asset.upstreams.length > 0,
        hasDownstreamForClicking: false,
      };
    }
    return null;
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

  // Bit hard to understand the complexity, optimize this 
  const getDownstreamAssets = (asset) => {
    return pipelineData.assets.filter(a => a.upstreams.some(up => up.value === asset.name))
      .map(a => ({
        name: a.name,
        type: a.type,
        pipeline: pipelineData.name,
        path: a.definition_file.path,
        isFocusAsset: false,
        hasUpstreamForClicking: false,
        hasDownstreamForClicking: deduceDownstream(a) && deduceDownstream(a).length > 0,
        // This is too complex, simplify it 
      }));
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
 