import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import IngestrAssetDisplay from "@/components/asset/IngestrAssetDisplay.vue";

vi.mock("@/utilities/vscode", () => ({
  vscode: { postMessage: vi.fn(), getState: vi.fn(), setState: vi.fn() },
}));

const baseParams = {
  source_connection: "jira-conn",
  source_table: "issues",
  destination: "postgres",
};

// The repo's test setup (setup.ts) creates a second JSDOM that breaks
// querySelector on freshly-mounted components, so we drive the toggle through
// the component's setup state rather than clicking the rendered checkbox.
const setup = (wrapper: any) => (wrapper.vm as any).$.setupState;

describe("IngestrAssetDisplay full_refresh", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toggling on emits save with full_refresh: true and preserves other params", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...baseParams }, columns: [] },
    });

    setup(wrapper).toggleFullRefresh();

    const payload = (wrapper.emitted("save") as any[])!.at(-1)![0];
    expect(payload.full_refresh).toBe(true);
    expect(payload.source_table).toBe("issues");
    expect(payload.destination).toBe("postgres");
  });

  it("toggling off drops full_refresh from the saved parameters", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...baseParams, full_refresh: true }, columns: [] },
    });

    setup(wrapper).toggleFullRefresh();

    const payload = (wrapper.emitted("save") as any[])!.at(-1)![0];
    expect("full_refresh" in payload).toBe(false);
  });

  it("shows the read-only full refresh row only when enabled", () => {
    const off = mount(IngestrAssetDisplay, {
      props: { parameters: { ...baseParams }, columns: [] },
    });
    expect(off.text()).not.toContain("Full Refresh:");

    const on = mount(IngestrAssetDisplay, {
      props: { parameters: { ...baseParams, full_refresh: true }, columns: [] },
    });
    expect(on.text()).toContain("Full Refresh:");
  });
});
