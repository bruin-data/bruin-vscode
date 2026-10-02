import ELK from "elkjs/lib/elk-api.js";
import type { ElkNode } from "elkjs/lib/elk-api.js";
import ElkWorker from "elkjs/lib/elk-worker.min.js?worker&inline";

// VS Code webviews require blob workers. Vite's inline worker bundles the ELK
// runtime into a self-contained blob (no importScripts or remote resources).
// elk.bundled's default worker is a synchronous shim and blocks the webview.
let engine: InstanceType<typeof ELK> | undefined;

export function layoutGraph(graph: ElkNode): Promise<ElkNode> {
  engine ??= new ELK({ workerFactory: () => new ElkWorker() });
  return engine.layout(graph);
}
