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
        isFocusAsset: false,
        hasUpstreamForClicking: asset.upstreams && asset.upstreams.length > 0,
        hasDownstreamForClicking: false,
      };
    }
    return null;
  };

  const deduceDownstream = (asset) => {
    const downstreamMap = pipelineData.assets.reduce((map, a) => {
      map[a.name] = new Set();
      return map;
    }, {});

    pipelineData.assets.forEach(a => {
      if (a.upstreams) {
        a.upstreams.forEach(upstream => {
          if (downstreamMap[upstream.value]) {
            downstreamMap[upstream.value].add(a.name);
          }
        });
      }
    });

    const assetDownstreams = downstreamMap[asset.name] || [];
    const populatedDownstream = Array.from(assetDownstreams).map(name => ({
      type: "asset",
      value: name
    }));

     return populatedDownstream
  }

  const getDownstreamAssets = (asset) => {
    return pipelineData.assets.filter(a => a.upstreams.some(up => up.value === asset.name))
      .map(a => ({
        name: a.name,
        type: a.type,
        isFocusAsset: false,
        hasUpstreamForClicking: false,
        hasDownstreamForClicking: deduceDownstream(a) && deduceDownstream(a).length > 0,
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
    upstreams: upstreams,
    downstream: downstreams,
  };

  console.log("Result", JSON.stringify(result, null, 2));
  return result;
}
 