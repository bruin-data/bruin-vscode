import type { AssetDataset } from "@/types";

  export const getAssetDataset = (jsonData: any, isFocusAsset: boolean): AssetDataset => {
    const asset = jsonData.asset;
    const assetDataset: AssetDataset = {
      name: asset.name,
      isFocusAsset: isFocusAsset,
    };
  
    if (asset.upstream) {
      assetDataset.upstream = asset.upstream.map((upstream: any) => {
        return {
          name: upstream.name,
          type: upstream.type,
          executable_file: {
            name: upstream.executable_file.name,
            path: upstream.executable_file.path,
            content: upstream.executable_file.content,
          },
          definition_file: {
            name: upstream.definition_file.name,
            path: upstream.definition_file.path,
            type: upstream.definition_file.type,
          },
        };
      });
    }
  
    if (asset.downstream) {
      assetDataset.downstream = asset.downstream.map((downstream: any) => {
        return {
          name: downstream.name,
          type: downstream.type,
          executable_file: {
            name: downstream.executable_file.name,
            path: downstream.executable_file.path,
            content: downstream.executable_file.content,
          },
          definition_file: {
            name: downstream.definition_file.name,
            path: downstream.definition_file.path,
            type: downstream.definition_file.type,
          },
        };
      });
    }
  
    return assetDataset;
  }