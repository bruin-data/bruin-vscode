import type { AssetDataset, Upstream } from "@/types";

/*  function deduceDownstream(asset, pipelineData) {
  const downstreamMap: Record<string, Set<string>> = {};
   // Initialize the map with empty sets for each asset
   pipelineData.assets.forEach((a) => {
    downstreamMap[a.name] = new Set<string>();
  });
  pipelineData.assets.forEach((a) => {
    if (a.upstreams) {
      a.upstreams.forEach((upstream) => {
        if (downstreamMap[upstream.value]) {
          downstreamMap[upstream.value].add(a.name);
        }
      });
    }
  });

  const assetDownstreams = downstreamMap[asset.name] || [];
  const populatedDownstream = Array.from(assetDownstreams).map((name) => ({
    type: 'asset',  
    value: name,
  }));
  
  return {...asset, downstream: populatedDownstream};
}

export const getAssetDataset = (
  pipelineData,
  assetId,
): AssetDataset  | null => {
  if (!pipelineData) {
    return null;
  }

  const asset_ = pipelineData.assets.find((asset) => asset.id === assetId);
  if (!asset_) {
    return null;
  }

  
  const asset = deduceDownstream(asset_, pipelineData);
  
  const assetDataset: AssetDataset = {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    isFocusAsset: asset.isFocusAsset || true,
  };


  const parseUpstream = (upstream) => {
    if (upstream.type === "uri") {
      return {
        name: upstream.value,
        type: "external",
      };
    }
    const upstreamAsAsset = pipelineData.assets.filter((asset) => asset.name === upstream.value)[0];
    const downstream = deduceDownstream(upstreamAsAsset, pipelineData).downstream
    return {
      ...upstreamAsAsset,
      hasUpstreamForClicking: upstreamAsAsset.upstreams && upstreamAsAsset.upstreams.length > 0,
      hasUpstreams: upstreamAsAsset.upstreams && upstreamAsAsset.upstreams.length > 0,
      downstream: downstream,
      hasDownstreams: downstream && downstream.length > 0,
      hasDownstreamForClicking: downstream && downstream.length > 0 && downstream.filter((downstream) => {
        return downstream.value === asset.name; 
      },).length === 0,
      isFocusAsset: false,
    };

  };
  const upstreams: Upstream[] = [];

  if (asset.upstreams) {
    upstreams.push(...asset.upstreams.map(parseUpstream));
  }
   console.log("upstreams ....", upstreams);

  if (upstreams.length > 0) {
    assetDataset.upstreams = upstreams;
  }
  if (asset.downstream) {
    let assetDownstream;
    assetDataset.downstream = asset.downstream.map((downstream: any) => {
      assetDownstream = pipelineData.assets.find((asset) => asset.name === downstream.value);
      return {
        ...assetDownstream,
        hasDownstreamForClicking: deduceDownstream(assetDownstream, pipelineData).downstream && deduceDownstream(assetDownstream, pipelineData).downstream.length > 0,
        hasDownstreams: deduceDownstream(assetDownstream, pipelineData).downstream && deduceDownstream(assetDownstream, pipelineData).downstream.length > 0,
        downstream: deduceDownstream(assetDownstream, pipelineData).downstream,
        isFocusAsset: false,
      };
    });
  }
  console.log("assetDataset ....", assetDataset);
  return assetDataset ;
}; */
 
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
 