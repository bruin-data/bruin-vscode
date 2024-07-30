import type { AssetDataset, Upstream } from "@/types";

export const getAssetDataset = (
  jsonData,
  assetId
): AssetDataset  | null => {
  if (!jsonData) {
    return null;
  }

  const asset_ = jsonData.assets.find((asset) => asset.id === assetId);
  if (!asset_) {
    return null;
  }

  // Step 2: Deduce downstreams
  const downstreamMap: Record<string, Set<string>> = {};

  // Initialize the map with empty sets for each asset
  jsonData.assets.forEach((a) => {
    downstreamMap[a.name] = new Set<string>();
  });

  // Populate the map with upstream relationships
  jsonData.assets.forEach((a) => {
    if (a.upstreams) {
      a.upstreams.forEach((upstream) => {
        if (downstreamMap[upstream.value]) {
          downstreamMap[upstream.value].add(a.name);
        }
      });
    }
  });

  // Deduce downstreams for the specific asset
  const assetDownstreams = downstreamMap[asset_.name] || [];
  const populatedDownstream = Array.from(assetDownstreams).map((name) => ({
    type: 'asset',  
    value: name,
  }));
  
  const asset = {...asset_, downstream: populatedDownstream};
  
  console.log("asset .....", asset.downstream);
  const assetDataset: AssetDataset = {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    isFocusAsset: true,
  };

  console.log("================\n");

  const parseUpstream = (upstream) => {
    if (upstream.type === "uri") {
      return {
        name: upstream.value,
        type: "external",
      };
    }
    const upstreamAsAsset = jsonData.assets.filter((asset) => asset.name === upstream.value)[0];
    console.log("upstreamAsAsset", upstreamAsAsset);
    return {
      name: upstreamAsAsset.name,
      type: upstreamAsAsset.type,
      hasUpstreamForClicking: upstreamAsAsset.upstreams && upstreamAsAsset.upstreams.length > 0,
      isFocusAsset: false,
      executable_file: {
        name: upstreamAsAsset.executable_file?.name,
        path: upstreamAsAsset.executable_file?.path,
        content: upstreamAsAsset.executable_file?.content,
      },
      definition_file: {
        name: upstreamAsAsset.definition_file?.name,
        path: upstreamAsAsset.definition_file?.path,
        type: upstreamAsAsset.definition_file?.type,
      },
    };
  };

  const upstreams: Upstream[] = [];

  if (asset.upstreams) {
    upstreams.push(...asset.upstreams.map(parseUpstream));
  }

  if (upstreams.length > 0) {
    assetDataset.upstreams = upstreams;
  }
  if (asset.downstream) {
    let assetDownstream;
    assetDataset.downstream = asset.downstream.map((downstream: any) => {
      assetDownstream = jsonData.assets.find((asset) => asset.name === downstream.value);
      return {
        name: assetDownstream.name,
        type: assetDownstream.type,
        hasDownstreamForClicking: assetDownstream.downstream && assetDownstream.downstream.length > 0,
        executable_file: {
          name: assetDownstream.executable_file?.name,
          path: assetDownstream.executable_file?.path,
          content: assetDownstream.executable_file?.content,
        },
        definition_file: {
          name: assetDownstream.definition_file?.name,
          path: assetDownstream.definition_file?.path,
          type: assetDownstream.definition_file?.type,
        },
      };
    });
  }
  console.log("assetDataset ....", assetDataset);
  return assetDataset ;
};
