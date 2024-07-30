import type { AssetDataset, Upstream } from "@/types";

export const getAssetDataset = (
  jsonData,
  assetId
): AssetDataset  | null => {
  if (!jsonData) {
    return null;
  }

  const asset = jsonData.assets.filter((asset) => asset.id === assetId)[0];

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
    assetDataset.downstream = asset.downstream.map((downstream: any) => {
      return {
        name: downstream.name,
        type: downstream.type,
        hasDownstreamForClicking: downstream.downstream && downstream.downstream.length > 0,
        executable_file: {
          name: downstream.executable_file?.name,
          path: downstream.executable_file?.path,
          content: downstream.executable_file?.content,
        },
        definition_file: {
          name: downstream.definition_file?.name,
          path: downstream.definition_file?.path,
          type: downstream.definition_file?.type,
        },
      };
    });
  }
  console.log("assetDataset ....", assetDataset);
  return assetDataset ;
};
