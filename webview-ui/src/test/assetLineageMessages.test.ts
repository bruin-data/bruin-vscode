import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import AssetLineage from "../AssetLineage.vue";
import Lineage from "../components/lineage-flow/Lineage.vue";

vi.mock("../components/lineage-flow/Lineage.vue", () => ({
  default: {
    props: ["assetDataset", "pipelineData", "isLoading", "LineageError"],
    template: "<div />",
  },
}));

const pipeline = (upstreams: any[] = []) =>
  JSON.stringify({
    name: "test",
    assets: [
      { id: "a", name: "a", upstreams: [], definition_file: { path: "/a.sql" } },
      { id: "b", name: "b", upstreams, definition_file: { path: "/b.sql" } },
    ],
  });

describe("lineage message updates", () => {
  let wrapper: ReturnType<typeof mount>;
  beforeEach(() => {
    vi.useFakeTimers();
    wrapper = mount(AssetLineage);
  });
  afterEach(() => {
    wrapper.unmount();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  const child = () => wrapper.findComponent<any>(Lineage);
  const send = async (command: string, fields: any) => {
    window.dispatchEvent(
      new MessageEvent("message", { data: { panelType: "AssetLineage", command, ...fields } })
    );
    await nextTick();
  };
  const result = (id: string, raw: string, extra = {}) =>
    send("flow-lineage-message", {
      payload: {
        status: "success",
        filePath: `/${id}.sql`,
        message: { id, name: id, pipeline: raw, ...extra },
      },
    });

  it("does not rebuild unchanged data even when messages arrive seconds apart", async () => {
    await result("a", pipeline());
    const first = child().props();
    vi.advanceTimersByTime(2000);
    await result("a", pipeline());
    expect(child().props("assetDataset")).toBe(first.assetDataset);
    expect(child().props("pipelineData")).toBe(first.pipelineData);
  });

  it("switches assets while retaining the parsed pipeline for dependency caches", async () => {
    await result("a", pipeline());
    const parsed = child().props("pipelineData");
    await send("flow-lineage-loading", { filePath: "/b.sql" });
    await result("b", pipeline());
    expect(child().props("assetDataset").id).toBe("b");
    expect(child().props("pipelineData")).toBe(parsed);
  });

  it("refreshes the same asset after dependency or column data changes", async () => {
    await result("b", pipeline());
    const parsed = child().props("pipelineData");
    await result("b", pipeline([{ type: "asset", value: "a" }]), { hasColumnData: true });
    expect(child().props("pipelineData")).not.toBe(parsed);
    expect(
      child()
        .props("assetDataset")
        .upstreams.map((a: any) => a.name)
    ).toEqual(["a"]);
  });

  it("ignores an old file response and supports pipeline view without duplicate data", async () => {
    await send("flow-lineage-loading", { filePath: "/b.sql" });
    await result("b", pipeline());
    await result("a", pipeline());
    expect(child().props("assetDataset").id).toBe("b");
    await send("flow-lineage-loading", { filePath: "/pipeline.yml" });
    await send("flow-lineage-message", {
      payload: {
        status: "success",
        filePath: "/pipeline.yml",
        message: { name: "test", pipeline: pipeline(), isPipelineView: true },
      },
    });
    expect(child().props("assetDataset").pipelineData).toBe(child().props("pipelineData"));
    expect(child().props("isLoading")).toBe(false);
  });
});
