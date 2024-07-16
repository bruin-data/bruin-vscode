// src/utils/graphGenerator.js

export function generateGraphFromJSON(asset) {
  const localNodes = new Map();
  const localEdges: any[] = [];

  console.log('asset', asset);

  // Helper function to create or retrieve a node
  function getNode(asset) {
    if (!localNodes.has(asset.name)) {
      const newNode = {
        id: asset.name,
        type: "custom",
        data: {
          type: "asset",
          asset: {
            name: asset.name,
            type: asset.type || 'unknown',
            hasDownstreams: (asset.downstream && asset.downstream.length > 0) || false,
            hasUpstreams: (asset.upstreams && asset.upstreams.length > 0) || (asset.upstream && asset.upstream.length > 0) || false,
            isFocusAsset: asset.isFocusAsset,
          },
          label: asset.name,
        },
        position: { x: 0, y: 0 },
      };
      localNodes.set(asset.name, newNode);
    }
    return localNodes.get(asset.name);
  }

  function processAsset(asset, isFocusAsset = false) {
    const node = getNode(asset);
    node.isFocusAsset = isFocusAsset;

    if (asset.downstream) {
      asset.downstream.forEach(downstreamAsset => {
        const childNode = getNode(downstreamAsset);
        node.data.asset.hasDownstreams = true;
        childNode.data.asset.hasUpstreams = true;
        localEdges.push({
          id: `${node.id}-${childNode.id}`,
          source: node.id,
          target: childNode.id,
        });
      });
    }

    // Combine upstreams from both properties into one array
    const allUpstreams = [...(asset.upstreams || []), ...(asset.upstream || [])];

    if (allUpstreams.length > 0) {
      allUpstreams.forEach(upstreamAsset => {
        const parentNode = getNode(upstreamAsset);
        parentNode.data.asset.hasDownstreams = true;
        node.data.asset.hasUpstreams = true;
        localEdges.push({
          id: `${parentNode.id}-${node.id}`,
          source: parentNode.id,
          target: node.id,
        });
        // processAsset(upstreamAsset); // Uncomment if recursive processing is needed
      });
    }
  }

  // Start processing from the given JSON data
  processAsset(asset, true);

  return { nodes: Array.from(localNodes.values()), edges: localEdges };
}
