import { describe, it, expect, vi } from "vitest";
import {
  buildPipelineLineage,
  generateGraph,
  applyLayout,
} from "../components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import { layoutGraph } from "../utilities/elkLayout";

vi.mock("../utilities/elkLayout", () => ({ layoutGraph: vi.fn() }));

const asset = (name: string, upstreams: string[] = []) =>
  ({
    name,
    type: "duckdb.sql",
    definition_file: { path: `/assets/${name}.sql` },
    upstreams: upstreams.map((value) => ({ type: "asset", value })),
  }) as any;

describe("pipeline graph", () => {
  it("emits each dependency once while retaining downstream navigation", () => {
    const lineage = buildPipelineLineage({
      assets: [asset("a"), asset("b", ["a"]), asset("c", ["a", "b"])],
    });
    const graph = generateGraph(lineage, "b");
    expect(graph.edges.map((e) => [e.source, e.target])).toEqual([
      ["a", "b"],
      ["a", "c"],
      ["b", "c"],
    ]);
    expect(new Set(graph.edges.map((e) => e.id)).size).toBe(3);
    expect(lineage.assetMap.a.downstreams?.map((d) => d.value)).toEqual(["b", "c"]);
    expect(graph.nodes.find((n) => n.id === "b")?.data.asset.isFocusAsset).toBe(true);
  });

  it("keeps isolated nodes and excludes unresolved external edges", () => {
    const graph = generateGraph(
      buildPipelineLineage({ assets: [asset("isolated"), asset("b", ["external"])] }),
      ""
    );
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([]);
  });

  it("matches worker layout positions by ID, regardless of return order", async () => {
    vi.mocked(layoutGraph).mockResolvedValue({
      id: "root",
      children: [
        { id: "b", x: 300, y: 20 },
        { id: "a", x: 10, y: 40 },
      ],
    });
    const graph = generateGraph(
      buildPipelineLineage({ assets: [asset("a"), asset("b", ["a"])] }),
      "a"
    );
    const result = await applyLayout(graph.nodes, graph.edges);
    expect(result.nodes.map((n) => n.position)).toEqual([
      { x: 10, y: 40 },
      { x: 300, y: 20 },
    ]);
    expect(result.edges).toEqual(graph.edges);
  });
});

describe("column layout topology", () => {
  it("lays out one edge per asset pair but preserves all column handles for rendering", async () => {
    vi.mocked(layoutGraph).mockResolvedValue({
      id: "root",
      children: [
        { id: "a", x: 0, y: 0 },
        { id: "b", x: 300, y: 0 },
      ],
    });
    const graph = generateGraph(
      buildPipelineLineage({ assets: [asset("a"), asset("b", ["a"])] }),
      "a"
    );
    const edges = [
      ...graph.edges,
      ...["id", "name"].map((column) => ({
        id: column,
        source: "a",
        target: "b",
        sourceHandle: `source-${column}`,
        targetHandle: `target-${column}`,
      })),
    ];
    const result = await applyLayout(graph.nodes, edges);
    expect(vi.mocked(layoutGraph).mock.lastCall?.[0].edges).toHaveLength(1);
    expect(result.edges).toBe(edges);
    expect(result.edges.map((e) => e.sourceHandle)).toEqual([
      undefined,
      "source-id",
      "source-name",
    ]);
  });
});
