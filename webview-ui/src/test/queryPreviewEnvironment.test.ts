import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the VSCode API wrapper so we can inspect postMessage payloads.
vi.mock("@/utilities/vscode", () => {
  const storage: Record<string, any> = {};
  return {
    vscode: {
      postMessage: vi.fn(),
      getState: vi.fn(() => storage),
      setState: vi.fn((newState: any) => {
        Object.keys(storage).forEach((k) => delete storage[k]);
        Object.assign(storage, newState || {});
        return storage;
      }),
      __storage: storage,
    },
  };
});

// Mock the Pinia connections store (default env only).
vi.mock("@/store/bruinStore", () => ({
  useConnectionsStore: vi.fn(() => ({
    setDefaultEnvironment: vi.fn(),
    getDefaultEnvironment: vi.fn(() => "dev"),
  })),
}));

import QueryPreview from "@/components/query-output/QueryPreview.vue";

const mountPreview = () =>
  mount(QueryPreview, {
    props: {
      output: null,
      error: null,
      isLoading: false,
      environment: "dev",
      environments: ["dev", "staging", "prod"],
      connectionName: "",
      isExportLoading: false,
      exportOutput: null,
      exportError: null,
    },
  });

const getVscode = async () => (await import("@/utilities/vscode")).vscode as any;

const click = async (el: Element | null) => {
  expect(el, "target element should exist").toBeTruthy();
  el!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flushPromises();
};

const root = (wrapper: any): HTMLElement => wrapper.element as HTMLElement;

const openEnvMenu = (wrapper: any) =>
  click(root(wrapper).querySelector('[title="Change SQL preview environment"], [aria-haspopup="menu"]'));

const clickText = async (wrapper: any, text: string) => {
  const btn = Array.from(root(wrapper).querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text
  );
  await click(btn ?? null);
};

const runQuery = (wrapper: any) => click(root(wrapper).querySelector('[title="Run Query"]'));

const lastRunPayload = async () => {
  const vscode = await getVscode();
  const call = vscode.postMessage.mock.calls
    .map((c: any[]) => c[0])
    .reverse()
    .find((m: any) => m.command === "bruin.getQueryOutput");
  return call?.payload;
};

describe("SQL preview environment selector", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the available environments plus a follow-default option", async () => {
    const wrapper = mountPreview();
    await openEnvMenu(wrapper);
    const labels = Array.from(root(wrapper).querySelectorAll("button")).map((b) =>
      b.textContent?.trim()
    );
    expect(labels).toContain("staging");
    expect(labels).toContain("prod");
    expect(labels.some((l) => l?.startsWith("Follow asset panel"))).toBe(true);
  });

  it("runs the query with the selected environment", async () => {
    const wrapper = mountPreview();
    await openEnvMenu(wrapper);
    await clickText(wrapper, "prod");
    await runQuery(wrapper);

    expect((await lastRunPayload()).environment).toBe("prod");
  });

  it("reverts to the default environment when Default is chosen", async () => {
    const wrapper = mountPreview();
    await openEnvMenu(wrapper);
    await clickText(wrapper, "prod");

    await openEnvMenu(wrapper);
    await clickText(wrapper, "Follow asset panel (dev)");
    await runQuery(wrapper);

    expect((await lastRunPayload()).environment).toBe("dev");
  });
});
