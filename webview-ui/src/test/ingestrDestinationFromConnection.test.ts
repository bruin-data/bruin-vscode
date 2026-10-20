import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import IngestrAssetDisplay from "@/components/asset/IngestrAssetDisplay.vue";
import { parseAssetDetails } from "@/utilities/helper";

vi.mock("@/utilities/vscode", () => ({
  vscode: { postMessage: vi.fn(), getState: vi.fn(), setState: vi.fn() },
}));

const sourceParams = {
  source_connection: "prod-athena",
  source_table: "events",
};

// Read component state directly (DOM queries are unreliable in this harness).
const setup = (wrapper: any) => (wrapper.vm as any).$.setupState;

describe("IngestrAssetDisplay destination inferred from the connection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the asset connection instead of a missing destination", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, connection: "bigquery-prod", columns: [] },
    });

    expect(setup(wrapper).isDestinationFromConnection).toBe(true);
    expect(setup(wrapper).isDestinationMissing).toBe(false);
    expect(wrapper.text()).toContain("From connection: bigquery-prod");
  });

  it("uses destination_connection when the asset has no connection", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: {
        parameters: { ...sourceParams, destination_connection: "pg-prod" },
        columns: [],
      },
    });

    expect(setup(wrapper).isDestinationFromConnection).toBe(true);
    expect(wrapper.text()).toContain("From connection: pg-prod");
  });

  it("adds the connection type once the connections list is loaded", async () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, connection: "bigquery-prod", columns: [] },
    });

    setup(wrapper).availableConnections = [{ name: "bigquery-prod", type: "google_cloud_platform" }];
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("From connection: bigquery-prod (google_cloud_platform)");
  });

  it("prefers an explicit destination over the connection", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: {
        parameters: { ...sourceParams, destination: "bigquery" },
        connection: "bigquery-prod",
        columns: [],
      },
    });

    expect(setup(wrapper).isDestinationFromConnection).toBe(false);
    expect(wrapper.text()).toContain("BigQuery");
    expect(wrapper.text()).not.toContain("From connection");
  });

  it("still marks the destination as missing without a destination or connection", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, columns: [] },
    });

    expect(setup(wrapper).isDestinationFromConnection).toBe(false);
    expect(setup(wrapper).isDestinationMissing).toBe(true);
    expect(wrapper.text()).not.toContain("From connection");
  });

  it("does not show the empty state when only a connection is set", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: {}, connection: "bigquery-prod", columns: [] },
    });

    expect(wrapper.text()).not.toContain("No parameters configured");
  });

  it("does not write an inferred destination when saving other fields", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, connection: "bigquery-prod", columns: [] },
    });

    setup(wrapper).toggleFullRefresh();

    const payload = (wrapper.emitted("save") as any[])!.at(-1)![0];
    expect("destination" in payload).toBe(false);
  });
});

describe("IngestrAssetDisplay connection types per environment", () => {
  // `bruin connections list -o json` returns every environment.
  const connectionsList = {
    status: "success",
    message: {
      default_environment_name: "default",
      selected_environment_name: "default",
      environments: {
        default: { connections: { postgres: [{ name: "warehouse" }] } },
        prod: { connections: { google_cloud_platform: [{ name: "warehouse" }] } },
      },
    },
  };

  it("uses the environment selected for runs", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, connection: "warehouse", environment: "prod", columns: [] },
    });

    setup(wrapper).handleConnectionsList(connectionsList);

    expect(setup(wrapper).destinationConnectionLabel).toBe("warehouse (google_cloud_platform)");
  });

  it("follows a change of the selected environment", async () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, connection: "warehouse", environment: "default", columns: [] },
    });

    setup(wrapper).handleConnectionsList(connectionsList);
    expect(setup(wrapper).destinationConnectionLabel).toBe("warehouse (postgres)");

    await wrapper.setProps({ environment: "prod" });

    expect(setup(wrapper).destinationConnectionLabel).toBe("warehouse (google_cloud_platform)");
  });

  it("reloads source tables when the source type changes with the environment", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { source_connection: "warehouse", source_table: "t" }, environment: "default", columns: [] },
    });

    setup(wrapper).handleConnectionsList(connectionsList);
    setup(wrapper).availableSourceTables = ["postgres_table"];
    vi.mocked(vscode.postMessage).mockClear();

    await wrapper.setProps({ environment: "prod" });

    expect(setup(wrapper).availableSourceTables).toEqual([]);
    expect(vscode.postMessage).toHaveBeenCalledWith({
      command: "bruin.getIngestrSourceTables",
      payload: { sourceType: "google_cloud_platform" },
    });
  });

  it("keeps source tables when the source type is the same in the new environment", async () => {
    const { vscode } = await import("@/utilities/vscode");
    const sameType = {
      status: "success",
      message: {
        selected_environment_name: "default",
        environments: {
          default: { connections: { athena: [{ name: "lake" }] } },
          prod: { connections: { athena: [{ name: "lake" }] } },
        },
      },
    };
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { source_connection: "lake", source_table: "t" }, environment: "default", columns: [] },
    });

    setup(wrapper).handleConnectionsList(sameType);
    setup(wrapper).availableSourceTables = ["events"];
    vi.mocked(vscode.postMessage).mockClear();

    await wrapper.setProps({ environment: "prod" });

    expect(setup(wrapper).availableSourceTables).toEqual(["events"]);
    expect(vscode.postMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: "bruin.getIngestrSourceTables" }));
  });

  it("falls back to the config's environment when none is selected", () => {
    const wrapper = mount(IngestrAssetDisplay, {
      props: { parameters: { ...sourceParams }, connection: "warehouse", columns: [] },
    });

    setup(wrapper).handleConnectionsList(connectionsList);

    expect(setup(wrapper).destinationConnectionLabel).toBe("warehouse (postgres)");
  });
});

describe("parseAssetDetails", () => {
  it("passes the asset connection through", () => {
    const details = parseAssetDetails({ asset: { name: "a", type: "ingestr", connection: "bigquery-prod" } });
    expect(details?.connection).toBe("bigquery-prod");
  });
});
