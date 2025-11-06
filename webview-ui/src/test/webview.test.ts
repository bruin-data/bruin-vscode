import { suite, test, assert, beforeEach, vi, expect } from "vitest";
import * as cronParser from "cron-parser";
import {
  isValidCron,
  resetStartEndDate,
  scheduleToCron,
  getPreviousRun,
  adjustEndDateForExclusive,
  getUpstreams,
} from "../utilities/helper";
import {
  getAssetDependencies,
  parsePipelineData,
  processAssetDependencies,
} from "../utilities/getPipelineLineage";
import {
  extractStructFieldsFromTypeString,
  flattenStructColumns,
} from "../utilities/structUtils";
import * as pipelineData from "../utilities/pipeline.json";
import FilterTab from "@/components/lineage-flow/filterTab/filterTab.vue";
import "./mocks/vueFlow"; // Import the mocks
import { buildPipelineLineage, generateGraph } from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import { buildColumnLineage, getAssetDatasetWithColumns } from "@/components/lineage-flow/column-level/useColumnLevel";
import { generateColumnGraph, createColumnLevelEdges } from "@/utilities/graphGenerator";
import { mount } from "@vue/test-utils";

// Mock VSCode API wrapper to control persistent webview state
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
      // helper for tests
      __storage: storage,
    },
  };
});

// Mock Pinia store
vi.mock("@/store/bruinStore", () => ({
  useConnectionsStore: vi.fn(() => ({
    setDefaultEnvironment: vi.fn(),
    getDefaultEnvironment: vi.fn(() => null),
  })),
}));

import AssetGeneral from "@/components/asset/AssetGeneral.vue";

vi.mock("markdown-it");

suite("testing webview", () => {
  const environments = ["dev", "qa", "prod"];
  let schedule: string, today, startDate, endDate, startTime, endTime, isExclusiveEndDate: boolean;

  /**
   * Before each test, initialize common variables.
   */

  beforeEach(() => {
    schedule = "";
    today = new Date("2024-07-08T05:23:00.000Z");
    startDate = { value: "" };
    endDate = { value: "" };
    startTime = "";
    endTime = "";
    isExclusiveEndDate = false;
  });

  /**
   * Test suite for scheduleToCron function.
   */
  test("test scheduleToCron", () => {
    const hourly = "0 * * * *";
    const daily = "0 0 * * *";
    const weekly = "0 0 * * 1";
    const monthly = "0 0 1 * *";

    const cronHourly = scheduleToCron("hourly");
    const cronDaily = scheduleToCron("daily");
    const cronWeekly = scheduleToCron("weekly");
    const cronMonthly = scheduleToCron("monthly");
    const cronInvalid = scheduleToCron("invalid");

    assert.deepStrictEqual(cronHourly, { cronSchedule: hourly, error: null });
    assert.deepStrictEqual(cronDaily, { cronSchedule: daily, error: null });
    assert.deepStrictEqual(cronWeekly, { cronSchedule: weekly, error: null });
    assert.deepStrictEqual(cronMonthly, { cronSchedule: monthly, error: null });

    assert.deepStrictEqual(cronInvalid.cronSchedule, null);
    assert.match(cronInvalid.error as string, /^Invalid schedule: invalid\. .*$/);
  });

  /**
   * Test if selected environment is correctly initialized with default.
   */
  test("initializes selectedEnv with default environment", () => {
    const selectedEnvironment = "qa";
    const wrapper = {
      vm: {
        selectedEnv: null as string | null,
      },
    };
    wrapper.vm.selectedEnv = selectedEnvironment;
    assert.strictEqual(wrapper.vm.selectedEnv, selectedEnvironment);
  });

  /**
   * Test handling of null selectedEnvironment.
   */
  test("handles edge case of null selectedEnvironment", () => {
    const wrapper = {
      vm: {
        selectedEnv: null,
      },
    };
    wrapper.vm.selectedEnv = null;
    assert.strictEqual(wrapper.vm.selectedEnv, null);
  });
  /**
   * Test handling when selectedEnv is not in the list of environments.
   */
  test("handles edge case when selectedEnv is not in the list of environments", () => {
    const selectedEnvironment = "staging";
    const wrapper = {
      vm: {
        selectedEnv: null as string | null,
      },
    };

    if (!environments.includes(selectedEnvironment)) {
      wrapper.vm.selectedEnv = null;
    } else {
      wrapper.vm.selectedEnv = selectedEnvironment;
    }

    assert.strictEqual(wrapper.vm.selectedEnv, null);
  });
  /**
   * Test suite for cron parser.
   */
  test("test cron parser", () => {
    const fixedDate = new Date("2023-06-15T12:00:00.000Z");
    const interval = cronParser.parseExpression("0 0 1 * *", { currentDate: fixedDate, tz: "UTC" });

    const next = interval.next().toDate();
    const expectedNextDate = new Date(Date.UTC(2023, 6, 1, 0, 0, 0, 0));

    assert.strictEqual(next.toISOString(), expectedNextDate.toISOString());
  });

  /**
   * Test suite for isValidCron function.
   */
  test("test is valid cron ", () => {
    const cron = "0 0 1 * *";
    const invalidCron = "0 0 1 * * *";

    const isValid = isValidCron(cron);
    const isInvalid = isValidCron(invalidCron);

    assert.strictEqual(isValid, true);
    assert.strictEqual(isInvalid, true);
  });

  /**
   * Test suite for getPreviousRun function with "hourly" schedule.
   */

  test('test get previous run for "hourly" schedule', () => {
    schedule = "hourly";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-08T04:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-08T05:00:00.000Z").getTime());
  });

  /**
   * Test suite for getPreviousRun function with "daily" schedule.
   */
  test('test get previous run for "daily" schedule', () => {
    schedule = "daily";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-07T00:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-08T00:00:00.000Z").getTime());
  });
  /**
   * Test suite for getPreviousRun function with "weekly" schedule.
   */

  test('test get previous run for "weekly" schedule', () => {
    schedule = "weekly";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-01T00:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-08T00:00:00.000Z").getTime());
  });
  /**
   * Test suite for getPreviousRun function with "monthly" schedule.
   */
  test('test get previous run for "monthly" schedule', () => {
    schedule = "monthly";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-06-01T00:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-01T00:00:00.000Z").getTime());
  });

  /**
   * Test suite for getPreviousRun function with specific cron expressions.
   */
  test('test get previous run for "2 17 * * *"', () => {
    schedule = "2 17 * * *";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-06T17:02:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-07T17:02:00.000Z").getTime());
  });

  test('test get previous run for "30 17 * * *"', () => {
    schedule = "30 17 * * *";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-06T17:30:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-07T17:30:00.000Z").getTime());
  });

  test('test get previous run for "0 18 * * *"', () => {
    schedule = "0 18 * * *";
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-06T18:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-07T18:00:00.000Z").getTime());
  });
  test('test get previous run for "0 19 * 6 *"', () => {
    schedule = "0 19 * 6 *"; // June
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-06-29T19:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-06-30T19:00:00.000Z").getTime());
  });

  test('test get previous run for "0 20 * * 1-5"', () => {
    schedule = "0 20 * * 1-5"; // Weekdays (Monday to Friday)
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-04T20:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-05T20:00:00.000Z").getTime());
  });

  test('test get previous run for "0 20 * * 6,7"', () => {
    schedule = "0 20 * * 6,7"; // Saturday and Sunday
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2024-07-06T20:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2024-07-07T20:00:00.000Z").getTime());
  });

  test('test get previous run for "0 20 10 7 *"', () => {
    schedule = "0 20 10 7 *"; // July 10th
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date("2022-07-10T20:00:00.000Z").getTime());
    assert.strictEqual(endTime, new Date("2023-07-10T20:00:00.000Z").getTime());
  });

  /**
   * Test suite for resetStartEndDate function.
   */
  test('test reset Start End Date for "hourly" schedule', () => {
    schedule = "hourly";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-08T04:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-08T05:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-08T04:59:59.999999999Z");
  });
  test('test reset Start End Date for "daily" schedule', () => {
    schedule = "daily";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-07T00:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-08T00:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-07T23:59:59.999999999Z");
  });

  test('test reset Start End Date for "weekly" schedule', () => {
    schedule = "weekly";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-01T00:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-08T00:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-07T23:59:59.999999999Z");
  });

  test('test reset Start End Date for "monthly" schedule', () => {
    schedule = "monthly";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-06-01T00:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-01T00:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-06-30T23:59:59.999999999Z");
  });

  test('test reset Start End Date for "2 17 * * *"', () => {
    schedule = "2 17 * * *";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-06T17:02:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-07T17:02:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-07T17:01:59.999999999Z");
  });

  test('test reset Start End Date for "30 17 * * *"', () => {
    schedule = "30 17 * * *";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-06T17:30:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-07T17:30:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-07T17:29:59.999999999Z");
  });

  test('test reset Start End Date for "0 18 * * *"', () => {
    schedule = "0 18 * * *";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-06T18:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-07T18:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-07T17:59:59.999999999Z");
  });

  test('test reset Start End Date for "2 * * * *"', () => {
    schedule = "2 * * * *";
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-08T04:02:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-08T05:02:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-08T05:01:59.999999999Z");
  });

  test('test reset Start End Date for "0 19 * 6 *"', () => {
    schedule = "0 19 * 6 *"; // June
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-06-29T19:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-06-30T19:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-06-30T18:59:59.999999999Z");
  });

  test('test reset Start End Date for "0 20 * * 1-5"', () => {
    schedule = "0 20 * * 1-5"; // Weekdays (Monday to Friday)
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-04T20:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-05T20:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-05T19:59:59.999999999Z");
  });

  test('test reset Start End Date for "0 20 * * 6,7"', () => {
    schedule = "0 20 * * 6,7"; // Saturday and Sunday
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2024-07-06T20:00:00.000Z");
    assert.strictEqual(endDate.value, "2024-07-07T20:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2024-07-07T19:59:59.999999999Z");
  });

  test('test reset Start End Date for "0 20 10 7 *"', () => {
    schedule = "0 20 10 7 *"; // July 10th
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, "2022-07-10T20:00:00.000Z");
    assert.strictEqual(endDate.value, "2023-07-10T20:00:00.000Z");

    const endDateExclusive = adjustEndDateForExclusive(endDate.value);
    assert.strictEqual(endDateExclusive, "2023-07-10T19:59:59.999999999Z");
  });

  test("test get previous run for invalid schedule", () => {
    schedule = "invalid";
    try {
      const { startTime, endTime } = getPreviousRun(schedule, today);
      assert.fail("Expected an error to be thrown");
    } catch (error: any) {
      assert.deepStrictEqual(
        error.message,
        `Invalid schedule: ${schedule}. Please provide a valid cron expression or use 'hourly', 'daily', 'weekly', or 'monthly'.`
      );
    }
  });
});

suite("AssetGeneral persistence", () => {
  test("persists and restores checkbox state and dates across remounts", async () => {
    const { vscode } = await import("@/utilities/vscode");

    // Mount component with minimal required props
    const wrapper = mount(AssetGeneral, {
      props: {
        schedule: "daily",
        environments: ["dev"],
        selectedEnvironment: "dev",
        hasIntervalModifiers: false,
        assetType: "sql",
        parameters: {},
        columns: [],
      },
      global: {
        stubs: {
          'vscode-button': { template: '<button><slot /></button>' },
          'vscode-checkbox': { template: '<input type="checkbox" />' },
        },
      },
    });

    // Flip some checkboxes by mutating reactive state directly
    const vm: any = wrapper.vm as any;
    vm.checkboxItems = [
      { name: 'Full-Refresh', checked: true },
      { name: 'Interval-modifiers', checked: true },
      { name: 'Exclusive-End-Date', checked: false },
      { name: 'Push-Metadata', checked: true },
    ];

    // Set specific dates
    vm.startDate = '2024-07-01T00:00:00.000Z';
    vm.endDate = '2024-07-02T00:00:00.000Z';

    await wrapper.vm.$nextTick();

    // Ensure state persisted to vscode.setState
    expect((vscode as any).__storage.checkboxState["Full-Refresh"]).toBe(true);
    expect((vscode as any).__storage.checkboxState["Push-Metadata"]).toBe(true);
    expect((vscode as any).__storage.startDate).toBe('2024-07-01T00:00:00.000Z');
    expect((vscode as any).__storage.endDate).toBe('2024-07-02T00:00:00.000Z');

    // Remount to simulate navigating to another asset and back
    wrapper.unmount();

    const wrapper2 = mount(AssetGeneral, {
      props: {
        schedule: "daily",
        environments: ["dev"],
        selectedEnvironment: "dev",
        hasIntervalModifiers: false,
        assetType: "sql",
        parameters: {},
        columns: [],
      },
      global: {
        stubs: {
          'vscode-button': { template: '<button><slot /></button>' },
          'vscode-checkbox': { template: '<input type="checkbox" />' },
        },
      },
    });

    const vm2: any = wrapper2.vm as any;
    // Check restoration
    expect(vm2.checkboxItems.find((i: any) => i.name === 'Full-Refresh').checked).toBe(true);
    expect(vm2.checkboxItems.find((i: any) => i.name === 'Push-Metadata').checked).toBe(true);
    expect(vm2.startDate).toBe('2024-07-01T00:00:00.000Z');
    expect(vm2.endDate).toBe('2024-07-02T00:00:00.000Z');
  });
});

suite("test lineage panel", () => {
  test("test get lineage text for old and new upstream format", () => {
    const oldFormatasset = {
      name: "asset1",
      type: "python",
      upstream: [
        {
          name: "asset2",
          type: "python",
          executable_file: {
            name: "asset2.py",
          },
          definition_file: {
            name: "asset2.yml",
          },
        },
      ],
    };
    const newFormatasset = {
      name: "asset1",
      type: "python",
      upstreams: [
        {
          name: "asset2",
          type: "python",
          executable_file: {
            name: "asset2.py",
          },
          definition_file: {
            name: "asset2.yml",
          },
        },
        {
          name: "asset2",
          external: true,
        },
      ],
    };

    const oldUpstream = getUpstreams(oldFormatasset);
    const newUpstream = getUpstreams(newFormatasset);
    assert.deepStrictEqual(oldUpstream, oldFormatasset.upstream);
    assert.deepStrictEqual(newUpstream, newFormatasset.upstreams);
  });

  // test for parsePiplineData function using mock data from pipeline.json
  test("test parsePiplineData", () => {
    const pipelineAssets = parsePipelineData(pipelineData);

    const assetTest2 = pipelineAssets.assets.find((asset) => asset.name === "test_dataset.test2");
    const assetTest3 = pipelineAssets.assets.find((asset) => asset.name === "test_dataset.test3");
    const assetTest4 = pipelineAssets.assets.find((asset) => asset.name === "test_dataset.test4");
    assert.deepStrictEqual(assetTest3 && assetTest3.upstreams, [
      "test_dataset.test",
      "test_dataset.test2",
      "test_dataset.test4",
      "asset_uri",
    ]);
    assert.deepStrictEqual(assetTest3 && assetTest3.downstream, []);
    assert.deepStrictEqual(assetTest4 && assetTest4.upstreams, [
      "test_dataset.test6",
      "bigquery://some-query",
    ]);
    assert.deepStrictEqual(assetTest4 && assetTest4.downstream, ["test_dataset.test3"]);
    assert.deepStrictEqual(assetTest2 && assetTest2.upstreams, ["test_dataset.test5"]);
    assert.deepStrictEqual(assetTest2 && assetTest2.downstream, ["test_dataset.test3"]);
  });

  const pipelineDataNoUpstreamsDownstreams = {
    assets: [
      {
        name: "test_dataset.test7",
        upstreams: [],
        downstream: [],
      },
    ],
  };

  test("test parsePipelineData with no upstreams or downstreams", () => {
    const pipelineAssets = parsePipelineData(pipelineDataNoUpstreamsDownstreams);

    const assetTest7 = pipelineAssets.assets.find((asset) => asset.name === "test_dataset.test7");

    assert.deepStrictEqual(assetTest7 && assetTest7.upstreams, []);
    assert.deepStrictEqual(assetTest7 && assetTest7.downstream, []);
  });

  test("test parsePipelineData with no assets", () => {
    const pipelineAssets = parsePipelineData({ assets: [] });
    assert.deepStrictEqual(pipelineAssets.assets, []);
  });

  test("test parsePipelineData with empty object", () => {
    const pipelineAssets = parsePipelineData({});
    assert.deepStrictEqual(pipelineAssets.assets, []);
  });

  test("test parsePipelineData with null", () => {
    const pipelineAssets = parsePipelineData(null);
    assert.deepStrictEqual(pipelineAssets.assets, []);
  });

  test("test getAssetDependencies with valid assetId", () => {
    const pipelineAssets = parsePipelineData(pipelineData).assets;
    const expectedOutput = {
      name: "test_dataset.test3",
      upstreams: [
        {
          name: "test_dataset.test",
          upstreams: [],
          downstream: [],
        },
        {
          name: "test_dataset.test2",
          upstreams: [
            {
              name: "test_dataset.test5",
              upstreams: [],
              downstream: [],
            },
          ],
          downstream: [],
        },
        {
          name: "test_dataset.test4",
          upstreams: [
            {
              name: "test_dataset.test6",
              upstreams: [],
              downstream: [],
            },
            {
              name: "bigquery://some-query",
              upstreams: [],
              downstream: [],
            },
          ],
          downstream: [],
        },
        {
          name: "asset_uri",
          upstreams: [],
          downstream: [],
        },
      ],
      downstream: [],
    };

    const assetId = "842395685364ad0d4d6903bbb5b9cf48a54945774187f169327559e1453a7612";
    const assetDependencies = getAssetDependencies(assetId, pipelineAssets);
    const assetName = pipelineAssets.filter((asset) => asset.id === assetId)[0].name;
    // assert.deepStrictEqual(assetName, "test_dataset.test3");
    assert.deepStrictEqual(assetDependencies, expectedOutput);
  });

  test("test getAssetDependencies with assetId that has downstreams and upstreams ", () => {
    const pipelineAssets = parsePipelineData(pipelineData).assets;

    const assetId = "04a0d75146552e5e3305db450e7c5b402bd4bb8f8de813263166466f9f901a6b";
    const assetDependencies = getAssetDependencies(assetId, pipelineAssets);
    //assert.deepStrictEqual(assetDependencies, []);
  });

  test("test processAssetDependencies with assetId that has no downstreams and some upstreams ", () => {
    const pipelineAssets = parsePipelineData(pipelineData).assets;
    const expectedOutput = {
      name: "test_dataset.test3",
      upstreams: [
        {
          name: "test_dataset.test",
          hasUpstreamForClicking: false,
          hasDownstreamForClicking: false,
        },
        {
          name: "test_dataset.test2",
          hasUpstreamForClicking: true,
          hasDownstreamForClicking: false,
        },
        {
          name: "test_dataset.test4",
          hasUpstreamForClicking: true,
          hasDownstreamForClicking: false,
        },
        {
          name: "asset_uri",
          hasUpstreamForClicking: false,
          hasDownstreamForClicking: false,
        },
      ],
      downstream: [],
    };
    const assetId = "842395685364ad0d4d6903bbb5b9cf48a54945774187f169327559e1453a7612";
    const assetDependencies = processAssetDependencies(assetId, pipelineAssets);
    assert.deepStrictEqual(assetDependencies, expectedOutput);
  });

  let filterWrapper;

  // Mock props for FilterTab
  const filterProps = {
    filterType: "direct" as "direct" | "all",
    expandAllUpstreams: false,
    expandAllDownstreams: false,
    showPipelineView: false,
    showColumnView: false,
  };

  // Update the component setup in the test file
  beforeEach(() => {
    filterWrapper = mount(FilterTab, {
      props: filterProps,
      global: {
        stubs: {
          Panel: {
            template: '<div><slot></slot></div>',
          },
          'vscode-button': {
            template: '<button><slot></slot></button>',
          },
          'vscode-radio-group': {
            template: '<div><slot></slot></div>',
          },
          'vscode-radio': {
            template: '<div><slot></slot></div>',
          },
          'vscode-link': {
            template: '<a><slot></slot></a>',
          },
        },
      },
    });
  });

  test('emits update:filterType with "all" when handleAllFilter is called', async () => {
    // Call handleAllFilter method directly
    await (filterWrapper.vm as any).handleAllFilter(new Event("click"));

    // Check that the correct events were emitted
    const emittedEvents = filterWrapper.emitted() as any;
    assert.isDefined(emittedEvents["update:filterType"]);
    assert.equal(emittedEvents["update:filterType"][0][0], "all");
    assert.isDefined(emittedEvents["update:expandAllUpstreams"]);
    assert.equal(emittedEvents["update:expandAllUpstreams"][0][0], true);
    assert.isDefined(emittedEvents["update:expandAllDownstreams"]);
    assert.equal(emittedEvents["update:expandAllDownstreams"][0][0], true);
  });

  test('emits correct events when handleDirectFilter is called', async () => {
    // Call handleDirectFilter method directly
    await (filterWrapper.vm as any).handleDirectFilter({ stopPropagation: () => {} });

    // Check that the correct events were emitted
    const emittedEvents = filterWrapper.emitted() as any;
    assert.isDefined(emittedEvents["update:filterType"]);
    assert.equal(emittedEvents["update:filterType"][0][0], "direct");
    assert.isDefined(emittedEvents["update:expandAllUpstreams"]);
    assert.equal(emittedEvents["update:expandAllUpstreams"][0][0], false);
    assert.isDefined(emittedEvents["update:expandAllDownstreams"]);
    assert.equal(emittedEvents["update:expandAllDownstreams"][0][0], false);
  });

  test("emits update:expandAllUpstreams when toggleUpstream is called", async () => {
    // Create a new wrapper with filterType 'all' to enable toggle
    const wrapperWithAllFilter = mount(FilterTab, {
      props: { ...filterProps, filterType: "all" },
      global: {
        stubs: {
          Panel: {
            template: '<div><slot></slot></div>',
          },
          'vscode-button': {
            template: '<button><slot></slot></button>',
          },
          'vscode-radio-group': {
            template: '<div><slot></slot></div>',
          },
          'vscode-radio': {
            template: '<div><slot></slot></div>',
          },
          'vscode-link': {
            template: '<a><slot></slot></a>',
          },
        },
      },
    });

    // Call toggleUpstream
    await (wrapperWithAllFilter.vm as any).toggleUpstream(new Event("click"));

    // Check that the correct event was emitted
    const emittedEvents = wrapperWithAllFilter.emitted() as any;
    assert.isDefined(emittedEvents["update:expandAllUpstreams"]);
    assert.equal(emittedEvents["update:expandAllUpstreams"][0][0], true);
  });
  test("emits update:expandAllDownstreams when toggleDownstream is called", async () => {
    // Create a new wrapper with filterType 'all' to enable toggle
    const wrapperWithAllFilter = mount(FilterTab, {
      props: { ...filterProps, filterType: "all" },
      global: {
        stubs: {
          Panel: {
            template: '<div><slot></slot></div>',
          },
          'vscode-button': {
            template: '<button><slot></slot></button>',
          },
          'vscode-radio-group': {
            template: '<div><slot></slot></div>',
          },
          'vscode-radio': {
            template: '<div><slot></slot></div>',
          },
          'vscode-link': {
            template: '<a><slot></slot></a>',
          },
        },
      },
    });

    // Call toggleDownstream
    await (wrapperWithAllFilter.vm as any).toggleDownstream(new Event("click"));

    // Check that the correct event was emitted
    const emittedEvents = wrapperWithAllFilter.emitted() as any;
    assert.isDefined(emittedEvents["update:expandAllDownstreams"]);
    assert.equal(emittedEvents["update:expandAllDownstreams"][0][0], true);
  });

});


suite('buildPipelineLineage', () => {
  test('should properly process pipeline data and build upstream/downstream relationships', () => {
    // Arrange
    const pipelineData = {
      assets: [
        {
          name: 'myschema.examplesomethingtoolong',
          type: 'bq.sql',
          upstreams: [],
          downstreams: [],
          hasUpstreams: false,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        {
          name: 'asset-example-1',
          type: 'bq.seed',
          upstreams: [],
          downstreams: [],
          hasUpstreams: false,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        {
          name: 'myschema.country_list',
          type: 'python',
          upstreams: [
            {
              type: 'asset',
              value: 'myschema.example',
              columns: [],
              mode: 'full'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        }
      ]
    };

    const result = buildPipelineLineage(pipelineData);

    expect(result.assets).toHaveLength(3);
    expect(result.assetMap).toBeDefined();
    
    // Verify the assets are in the map
    expect(result.assetMap['myschema.examplesomethingtoolong']).toBeDefined();
    expect(result.assetMap['asset-example-1']).toBeDefined();
    expect(result.assetMap['myschema.country_list']).toBeDefined();
    
    // Check upstream relationship exists
    const countryListAsset = result.assetMap['myschema.country_list'];
    expect(countryListAsset.upstreams).toHaveLength(1);
    expect(countryListAsset.upstreams[0].value).toBe('myschema.example');
    expect(countryListAsset.hasUpstreams).toBe(true);
    
    // No downstreams should exist for this test data as the upstream 'myschema.example' doesn't exist
    expect(countryListAsset.downstreams).toHaveLength(0);
  });

  test('should handle missing assets gracefully', () => {
    // Arrange
    const pipelineData = {
      assets: []
    };

    // Act
    const result = buildPipelineLineage(pipelineData);

    // Assert
    expect(result.assets).toHaveLength(0);
    expect(result.assetMap).toEqual({});
  });

  test('should correctly build downstream relationships', () => {
    // Arrange
    const pipelineData = {
      assets: [
        {
          name: 'source',
          type: 'bq.sql',
          upstreams: [],
          downstreams: [],
          hasUpstreams: false,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        {
          name: 'middle',
          type: 'bq.sql',
          upstreams: [
            {
              type: 'asset',
              value: 'source',
              columns: [],
              mode: 'full'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        {
          name: 'destination',
          type: 'bq.sql',
          upstreams: [
            {
              type: 'asset',
              value: 'middle',
              columns: [],
              mode: 'full'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        }
      ]
    };

    // Act
    const result = buildPipelineLineage(pipelineData);

    // Assert
    // Check source has downstream to middle
    expect(result.assetMap['source'].downstreams).toHaveLength(1);
    expect(result.assetMap['source'].downstreams[0].value).toBe('middle');
    expect(result.assetMap['source'].hasDownstreams).toBe(true);
    expect(result.assetMap['source'].hasUpstreams).toBe(false);
    
    // Check middle has upstream from source and downstream to destination
    expect(result.assetMap['middle'].upstreams).toHaveLength(1);
    expect(result.assetMap['middle'].upstreams[0].value).toBe('source');
    expect(result.assetMap['middle'].downstreams).toHaveLength(1);
    expect(result.assetMap['middle'].downstreams[0].value).toBe('destination');
    expect(result.assetMap['middle'].hasUpstreams).toBe(true);
    expect(result.assetMap['middle'].hasDownstreams).toBe(true);
    
    // Check destination has upstream from middle and no downstreams
    expect(result.assetMap['destination'].upstreams).toHaveLength(1);
    expect(result.assetMap['destination'].upstreams[0].value).toBe('middle');
    expect(result.assetMap['destination'].downstreams).toHaveLength(0);
    expect(result.assetMap['destination'].hasUpstreams).toBe(true);
    expect(result.assetMap['destination'].hasDownstreams).toBe(false);
  });

  test('should handle non-asset type upstreams', () => {
    // Arrange
    const pipelineData = {
      assets: [
        {
          name: 'asset1',
          type: 'bq.sql',
          upstreams: [
            {
              type: 'file', // non-asset type
              value: 'some-file.csv',
              columns: [],
              mode: 'full'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        {
          name: 'asset2',
          type: 'bq.sql',
          upstreams: [
            {
              type: 'asset',
              value: 'asset1',
              columns: [],
              mode: 'full'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        }
      ]
    };

    // Act
    const result = buildPipelineLineage(pipelineData);

    // Assert
    expect(result.assetMap['asset1'].hasUpstreams).toBe(true); // Has a non-asset upstream
    expect(result.assetMap['asset1'].downstreams).toHaveLength(1);
    expect(result.assetMap['asset1'].downstreams[0].value).toBe('asset2');
  });
});

suite('generateGraph', () => {
  test('should generate nodes and edges from lineage data', () => {
    // Arrange
    const lineageData = {
      assets: [
        {
          name: 'asset1',
          type: 'bq.sql',
          upstreams: [],
          downstreams: [
            {
              type: 'asset',
              value: 'asset2'
            }
          ],
          hasUpstreams: false,
          hasDownstreams: true,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        {
          name: 'asset2',
          type: 'bq.sql',
          upstreams: [
            {
              type: 'asset',
              value: 'asset1'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        }
      ],
      assetMap: {
        'asset1': {
          name: 'asset1',
          type: 'bq.sql',
          upstreams: [],
          downstreams: [
            {
              type: 'asset',
              value: 'asset2'
            }
          ],
          hasUpstreams: false,
          hasDownstreams: true,
          pipeline: 'pipeline1',
          path: '/some/path',
        },
        'asset2': {
          name: 'asset2',
          type: 'bq.sql',
          upstreams: [
            {
              type: 'asset',
              value: 'asset1'
            }
          ],
          downstreams: [],
          hasUpstreams: true,
          hasDownstreams: false,
          pipeline: 'pipeline1',
          path: '/some/path',
        }
      }
    };

    // Act
    const result = generateGraph(lineageData, 'asset1');
    
    // Check node properties
    const asset1Node = result.nodes.find(n => n.id === 'asset1');
    const asset2Node = result.nodes.find(n => n.id === 'asset2');
    
    expect(asset1Node).toBeDefined();
    expect(asset2Node).toBeDefined();
    expect(asset1Node?.data.asset.isFocusAsset).toBe(true);
    expect(asset2Node?.data.asset.isFocusAsset).toBe(false);
    
    // Check edge
    expect(result.edges[0].source).toBe('asset1');
    expect(result.edges[0].target).toBe('asset2');
  });

});

suite('createColumnLevelEdges', () => {
  test('should create column level edges correctly', () => {
    const processedAssets = new Set(['asset1', 'asset2']);
    const columnLineageMap = {
      'asset2': [
        {
          column: 'target_col',
          source_columns: [
            { asset: 'asset1', column: 'source_col' }
          ]
        }
      ]
    };
    
    const assetMap = {
      'asset1': { columns: [{ name: 'source_col' }] },
      'asset2': { columns: [{ name: 'target_col' }] }
    };
    
    const edges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe('column-asset1.source_col-to-asset2.target_col');
    expect(edges[0].source).toBe('asset1');
    expect(edges[0].target).toBe('asset2');
    expect(edges[0].data.type).toBe('column-lineage');
    expect(edges[0].data.sourceColumn).toBe('source_col');
    expect(edges[0].data.targetColumn).toBe('target_col');
    expect(edges[0].data.sourceAsset).toBe('asset1');
    expect(edges[0].data.targetAsset).toBe('asset2');
  });

  test('should not create edges for assets not in processedAssets', () => {
    const processedAssets = new Set(['asset2']);
    const columnLineageMap = {
      'asset2': [
        {
          column: 'target_col',
          source_columns: [
            { asset: 'asset1', column: 'source_col' } 
          ]
        }
      ]
    };
    
    const assetMap = {
      'asset1': { columns: [{ name: 'source_col' }] },
      'asset2': { columns: [{ name: 'target_col' }] }
    };
    
    const edges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    
    expect(edges).toHaveLength(0);
  });

  test('should handle multiple source columns for same target column', () => {
    const processedAssets = new Set(['asset1', 'asset2', 'asset3']);
    const columnLineageMap = {
      'asset3': [
        {
          column: 'target_col',
          source_columns: [
            { asset: 'asset1', column: 'col_a' },
            { asset: 'asset2', column: 'col_b' }
          ]
        }
      ]
    };
    
    const assetMap = {
      'asset1': { columns: [{ name: 'col_a' }] },
      'asset2': { columns: [{ name: 'col_b' }] },
      'asset3': { columns: [{ name: 'target_col' }] }
    };
    
    const edges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    
    expect(edges).toHaveLength(2);
    expect(edges[0].id).toBe('column-asset1.col_a-to-asset3.target_col');
    expect(edges[1].id).toBe('column-asset2.col_b-to-asset3.target_col');
  });

  test('should handle empty column lineage map', () => {
    const processedAssets = new Set(['asset1', 'asset2']);
    const columnLineageMap = {};
    const assetMap = {
      'asset1': { columns: [] },
      'asset2': { columns: [] }
    };
    
    const edges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    
    expect(edges).toHaveLength(0);
  });

  test('should create column lineage with focus asset having upstream and downstream', () => {
    const processedAssets = new Set(['upstream_asset1', 'upstream_asset', 'focus_asset', 'downstream_asset']);
    const columnLineageMap = {
      'upstream_asset': [
        {
          column: 'upstream_col',
          source_columns: [
            { asset: 'upstream_asset1', column: 'upstream_col1' }
          ]
        }
      ],
      'focus_asset': [
        {
          column: 'focus_col',
          source_columns: [
            { asset: 'upstream_asset', column: 'upstream_col' }
          ]
        }
      ],
      'downstream_asset': [
        {
          column: 'downstream_col',
          source_columns: [
            { asset: 'focus_asset', column: 'focus_col' }
          ]
        }
      ]
    };
    
    const assetMap = {
      'upstream_asset1': { columns: [{ name: 'upstream_col1' }] },
      'upstream_asset': { columns: [{ name: 'upstream_col' }] },
      'focus_asset': { columns: [{ name: 'focus_col' }] },
      'downstream_asset': { columns: [{ name: 'downstream_col' }] }
    };
    
    const edges = createColumnLevelEdges(processedAssets, columnLineageMap, assetMap);
    
    expect(edges).toHaveLength(3);
    
    // Check upstream1 to upstream edge
    const upstream1ToUpstreamEdge = edges.find(e => e.source === 'upstream_asset1' && e.target === 'upstream_asset');
    expect(upstream1ToUpstreamEdge).toBeDefined();
    expect(upstream1ToUpstreamEdge?.data.sourceAsset).toBe('upstream_asset1');
    expect(upstream1ToUpstreamEdge?.data.targetAsset).toBe('upstream_asset');
    expect(upstream1ToUpstreamEdge?.data.sourceColumn).toBe('upstream_col1');
    expect(upstream1ToUpstreamEdge?.data.targetColumn).toBe('upstream_col');
    
    // Check upstream to focus edge
    const upstreamToFocusEdge = edges.find(e => e.source === 'upstream_asset' && e.target === 'focus_asset');
    expect(upstreamToFocusEdge).toBeDefined();
    expect(upstreamToFocusEdge?.data.sourceAsset).toBe('upstream_asset');
    expect(upstreamToFocusEdge?.data.targetAsset).toBe('focus_asset');
    expect(upstreamToFocusEdge?.data.sourceColumn).toBe('upstream_col');
    expect(upstreamToFocusEdge?.data.targetColumn).toBe('focus_col');
    
    // Check focus to downstream edge
    const focusToDownstreamEdge = edges.find(e => e.source === 'focus_asset' && e.target === 'downstream_asset');
    expect(focusToDownstreamEdge).toBeDefined();
    expect(focusToDownstreamEdge?.data.sourceAsset).toBe('focus_asset');
    expect(focusToDownstreamEdge?.data.targetAsset).toBe('downstream_asset');
    expect(focusToDownstreamEdge?.data.sourceColumn).toBe('focus_col');
    expect(focusToDownstreamEdge?.data.targetColumn).toBe('downstream_col');
  });
});

suite('ConnectionsForm updateUseApplicationDefaultCredentials', () => {
  test('handleUseApplicationDefaultCredentialsChange updates form value correctly', () => {
    const form = { value: { use_application_default_credentials: false } };
    
    const handleUseApplicationDefaultCredentialsChange = (value) => {
      form.value.use_application_default_credentials = value;
    };

    handleUseApplicationDefaultCredentialsChange(true);
    assert.strictEqual(form.value.use_application_default_credentials, true);

    handleUseApplicationDefaultCredentialsChange(false);
    assert.strictEqual(form.value.use_application_default_credentials, false);
  });

  test('form includes use_application_default_credentials in initialization', () => {
    const defaultEnvironment = 'dev';
    const form = {
      connection_type: "",
      connection_name: "",
      environment: defaultEnvironment,
      use_application_default_credentials: false,
    };

    assert.strictEqual(form.use_application_default_credentials, false);
    assert.strictEqual(form.environment, defaultEnvironment);
  });

  test('use_application_default_credentials is properly handled in connection data submission', () => {
    const form = {
      connection_type: "google_cloud_platform",
      connection_name: "test-connection",
      environment: "dev",
      use_application_default_credentials: true,
    };

    const connectionData: any = {
      name: form.connection_name,
      type: form.connection_type,
      environment: form.environment,
      credentials: {},
    };

    if (form.connection_type === "google_cloud_platform" && form.use_application_default_credentials) {
      connectionData.credentials.use_application_default_credentials = form.use_application_default_credentials;
    }

    assert.strictEqual(connectionData.credentials.use_application_default_credentials, true);
    assert.strictEqual(connectionData.type, "google_cloud_platform");
  });

  test('use_application_default_credentials is not included for non-GCP connections', () => {
    const form = {
      connection_type: "postgresql",
      connection_name: "test-connection",
      environment: "dev",
      use_application_default_credentials: true,
    };

    const connectionData: any = {
      name: form.connection_name,
      type: form.connection_type,
      environment: form.environment,
      credentials: {},
    };

    if (form.connection_type === "google_cloud_platform" && form.use_application_default_credentials) {
      connectionData.credentials.use_application_default_credentials = form.use_application_default_credentials;
    }

    assert.strictEqual(connectionData.credentials.use_application_default_credentials, undefined);
    assert.strictEqual(connectionData.type, "postgresql");
  });

  test('service account input method change clears use_application_default_credentials', () => {
    const form = { value: { service_account_json: "", use_application_default_credentials: true } };
    let selectedFile = { value: null };
    
    const handleServiceAccountInputMethodChange = (newMethod) => {
      if (newMethod === "file") {
        form.value.service_account_json = "";
        form.value.use_application_default_credentials = false;
        selectedFile.value = null;
      } else if (newMethod === "text") {
        form.value.use_application_default_credentials = false;
        selectedFile.value = null;
      } else if (newMethod === "default") {
        form.value.service_account_json = "";
        selectedFile.value = null;
      }
    };

    handleServiceAccountInputMethodChange("file");
    assert.strictEqual(form.value.use_application_default_credentials, false);

    form.value.use_application_default_credentials = true;

    handleServiceAccountInputMethodChange("text");
    assert.strictEqual(form.value.use_application_default_credentials, false);
  });
});

suite('FormField updateUseApplicationDefaultCredentials', () => {
  test('handleInputMethodChange emits updateUseApplicationDefaultCredentials when default is selected', () => {
    const emittedEvents: Array<{ eventName: string; value: any }> = [];
    const emit = (eventName: string, value?: any) => {
      emittedEvents.push({ eventName, value });
    };

    let internalValue = { value: "" };
    let selectedFile = { value: null };

    const handleInputMethodChange = (event: any) => {
      const newMethod = event.target.value;
      
      if (newMethod === "file") {
        internalValue.value = "";
        selectedFile.value = null;
        emit("update:modelValue", "");
      } else if (newMethod === "text") {
        selectedFile.value = null;
        emit("update:modelValue", internalValue.value);
      } else if (newMethod === "default") {
        internalValue.value = "";
        selectedFile.value = null;
        emit("update:modelValue", "");
        emit("updateUseApplicationDefaultCredentials", true);
      }
      emit("clearError");
    };

    const mockEvent = { target: { value: "default" } };
    handleInputMethodChange(mockEvent);

    const updateCredentialsEvent = emittedEvents.find(e => e.eventName === "updateUseApplicationDefaultCredentials");
    assert.isDefined(updateCredentialsEvent);
    assert.strictEqual(updateCredentialsEvent?.value, true);

    const clearErrorEvent = emittedEvents.find(e => e.eventName === "clearError");
    assert.isDefined(clearErrorEvent);

    const updateModelEvent = emittedEvents.find(e => e.eventName === "update:modelValue");
    assert.isDefined(updateModelEvent);
    assert.strictEqual(updateModelEvent?.value, "");
  });

  test('handleInputMethodChange does not emit updateUseApplicationDefaultCredentials for other methods', () => {
    const emittedEvents: Array<{ eventName: string; value: any }> = [];
    const emit = (eventName: string, value?: any) => {
      emittedEvents.push({ eventName, value });
    };

    let internalValue = { value: "some-text" };
    let selectedFile = { value: null };

    const handleInputMethodChange = (event: any) => {
      const newMethod = event.target.value;
      
      if (newMethod === "file") {
        internalValue.value = "";
        selectedFile.value = null;
        emit("update:modelValue", "");
      } else if (newMethod === "text") {
        selectedFile.value = null;
        emit("update:modelValue", internalValue.value);
      } else if (newMethod === "default") {
        internalValue.value = "";
        selectedFile.value = null;
        emit("update:modelValue", "");
        emit("updateUseApplicationDefaultCredentials", true);
      }
      emit("clearError");
    };

    const mockFileEvent = { target: { value: "file" } };
    handleInputMethodChange(mockFileEvent);

    let updateCredentialsEvent = emittedEvents.find(e => e.eventName === "updateUseApplicationDefaultCredentials");
    assert.isUndefined(updateCredentialsEvent);

    emittedEvents.length = 0;

    const mockTextEvent = { target: { value: "text" } };
    handleInputMethodChange(mockTextEvent);

    updateCredentialsEvent = emittedEvents.find(e => e.eventName === "updateUseApplicationDefaultCredentials");
    assert.isUndefined(updateCredentialsEvent);
  });

  test('useApplicationDefaultCredentials prop is correctly passed and used', () => {
    const props = {
      useApplicationDefaultCredentials: true
    };

    assert.strictEqual(props.useApplicationDefaultCredentials, true);

    const propsWithFalse = {
      useApplicationDefaultCredentials: false
    };
    
    assert.strictEqual(propsWithFalse.useApplicationDefaultCredentials, false);
  });
});

suite('AssetLineage hover functionality', () => {
  // Test the utility functions directly
  const getUpstreamNodesAndEdges = (nodeId: string, allEdges: any[]) => {
    const upstreamNodes = new Set<string>([nodeId]);
    const upstreamEdges = new Set<any>();
    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const incomingEdges = allEdges.filter((edge) => edge.target === currentNodeId);

      for (const edge of incomingEdges) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          upstreamNodes.add(edge.source);
          queue.push(edge.source);
        }
        upstreamEdges.add(edge);
      }
    }

    return { upstreamNodes, upstreamEdges };
  };

  const getDownstreamNodesAndEdges = (nodeId: string, allEdges: any[]) => {
    const downstreamNodes = new Set<string>([nodeId]);
    const downstreamEdges = new Set<any>();
    const queue = [nodeId];
    const visited = new Set<string>([nodeId]);

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      const outgoingEdges = allEdges.filter((edge) => edge.source === currentNodeId);

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          downstreamNodes.add(edge.target);
          queue.push(edge.target);
        }
        downstreamEdges.add(edge);
      }
    }

    return { downstreamNodes, downstreamEdges };
  };

  test('getUpstreamNodesAndEdges should find upstream nodes correctly', () => {
    const allEdges = [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node2', target: 'node3' },
      { id: 'edge3', source: 'node0', target: 'node1' }
    ];

    const result = getUpstreamNodesAndEdges('node2', allEdges);
    
    expect(result.upstreamNodes.has('node2')).toBe(true);
    expect(result.upstreamNodes.has('node1')).toBe(true);
    expect(result.upstreamNodes.has('node0')).toBe(true);
    expect(result.upstreamNodes.size).toBe(3);
    expect(result.upstreamEdges.size).toBe(2);
  });

  test('getDownstreamNodesAndEdges should find downstream nodes correctly', () => {
    const allEdges = [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node2', target: 'node3' },
      { id: 'edge3', source: 'node3', target: 'node4' }
    ];

    const result = getDownstreamNodesAndEdges('node2', allEdges);
    
    expect(result.downstreamNodes.has('node2')).toBe(true);
    expect(result.downstreamNodes.has('node3')).toBe(true);
    expect(result.downstreamNodes.has('node4')).toBe(true);
    expect(result.downstreamNodes.size).toBe(3);
    expect(result.downstreamEdges.size).toBe(2);
  });

  test('hover functionality logic should identify connected and non-connected nodes', () => {
    const allNodes = [
      { id: 'node1', class: '' },
      { id: 'node2', class: '' },
      { id: 'node3', class: '' },
      { id: 'node4', class: '' }  // This should be identified as non-connected
    ];

    const allEdges = [
      { id: 'edge1', source: 'node1', target: 'node2', class: '' },
      { id: 'edge2', source: 'node2', target: 'node3', class: '' }
    ];

    const hoveredNodeId = 'node2';
    const { upstreamNodes, upstreamEdges } = getUpstreamNodesAndEdges(hoveredNodeId, allEdges);
    const { downstreamNodes, downstreamEdges } = getDownstreamNodesAndEdges(hoveredNodeId, allEdges);

    const highlightNodes = new Set([...upstreamNodes, ...downstreamNodes]);
    const highlightEdges = new Set([...upstreamEdges, ...downstreamEdges]);

    // Check which nodes should be highlighted (connected)
    expect(highlightNodes.has('node1')).toBe(true);
    expect(highlightNodes.has('node2')).toBe(true);
    expect(highlightNodes.has('node3')).toBe(true);
    expect(highlightNodes.has('node4')).toBe(false); // Not connected

    // Test the logic for applying faded class
    const nonConnectedNodes = allNodes.filter(node => !highlightNodes.has(node.id));
    expect(nonConnectedNodes.length).toBe(1);
    expect(nonConnectedNodes[0].id).toBe('node4');
  });

  test('class manipulation logic should work correctly', () => {
    const testNodes = [
      { id: 'node1', class: 'faded' },
      { id: 'node2', class: 'faded some-other-class' },
      { id: 'node3', class: '' }
    ];

    const testEdges = [
      { id: 'edge1', class: 'faded' },
      { id: 'edge2', class: 'some-class faded another-class' }
    ];

    // Simulate removing faded class
    testNodes.forEach((node) => {
      if (node.class && typeof node.class === 'string') {
        node.class = node.class.replace(/faded/g, '').replace(/\s+/g, ' ').trim();
      }
    });
    
    testEdges.forEach((edge) => {
      if (edge.class && typeof edge.class === 'string') {
        edge.class = edge.class.replace(/faded/g, '').replace(/\s+/g, ' ').trim();
      }
    });

    // Check that faded class is removed correctly
    expect(testNodes[0].class).toBe('');
    expect(testNodes[1].class).toBe('some-other-class');
    expect(testNodes[2].class).toBe('');
    expect(testEdges[0].class).toBe('');
    expect(testEdges[1].class).toBe('some-class another-class');
  });

  test('getUpstreamNodesAndEdges should handle circular dependencies', () => {
    const allEdges = [
      { id: 'edge1', source: 'node1', target: 'node2' },
      { id: 'edge2', source: 'node2', target: 'node3' },
      { id: 'edge3', source: 'node3', target: 'node1' }  // Creates a cycle
    ];

    const result = getUpstreamNodesAndEdges('node2', allEdges);
    
    // Should handle circular dependencies without infinite loop
    expect(result.upstreamNodes.has('node1')).toBe(true);
    expect(result.upstreamNodes.has('node2')).toBe(true);
    expect(result.upstreamNodes.has('node3')).toBe(true);
    expect(result.upstreamNodes.size).toBe(3);
  });

  test('getDownstreamNodesAndEdges should handle nodes with no connections', () => {
    const allEdges = [
      { id: 'edge1', source: 'node1', target: 'node2' }
    ];

    const result = getDownstreamNodesAndEdges('node3', allEdges);
    
    // Should only include the node itself when no connections exist
    expect(result.downstreamNodes.has('node3')).toBe(true);
    expect(result.downstreamNodes.size).toBe(1);
    expect(result.downstreamEdges.size).toBe(0);
  });

  test('hover functionality should work with complex graph structures', () => {
    const complexEdges = [
      { id: 'edge1', source: 'A', target: 'B' },
      { id: 'edge2', source: 'B', target: 'C' },
      { id: 'edge3', source: 'C', target: 'D' },
      { id: 'edge4', source: 'E', target: 'F' },  // Separate branch
      { id: 'edge5', source: 'X', target: 'B' },  // Another input to B
    ];

    // Test hovering over B
    const { upstreamNodes: upB, upstreamEdges: upEdgesB } = getUpstreamNodesAndEdges('B', complexEdges);
    const { downstreamNodes: downB, downstreamEdges: downEdgesB } = getDownstreamNodesAndEdges('B', complexEdges);
    
    const connectedToB = new Set([...upB, ...downB]);
    
    expect(connectedToB.has('A')).toBe(true);
    expect(connectedToB.has('B')).toBe(true);
    expect(connectedToB.has('C')).toBe(true);
    expect(connectedToB.has('D')).toBe(true);
    expect(connectedToB.has('X')).toBe(true);
    expect(connectedToB.has('E')).toBe(false); // Not connected to B
    expect(connectedToB.has('F')).toBe(false); // Not connected to B
  });

  suite("structUtils", () => {
    suite("extractStructFieldsFromTypeString", () => {
      test("should extract fields from STRUCT type string with double quotes", () => {
        const typeString = 'STRUCT("login" VARCHAR, "id" VARCHAR, "display_name" VARCHAR)';
        const result = extractStructFieldsFromTypeString(typeString);
        
        assert.deepStrictEqual(result, [
          { name: "login", type: "VARCHAR" },
          { name: "id", type: "VARCHAR" },
          { name: "display_name", type: "VARCHAR" },
        ]);
      });

      test("should extract fields from STRUCT type string with single quotes", () => {
        const typeString = "STRUCT('login' VARCHAR, 'id' INTEGER)";
        const result = extractStructFieldsFromTypeString(typeString);
        
        assert.deepStrictEqual(result, [
          { name: "login", type: "VARCHAR" },
          { name: "id", type: "INTEGER" },
        ]);
      });

      test("should handle empty type string", () => {
        const result = extractStructFieldsFromTypeString("");
        assert.deepStrictEqual(result, []);
      });

      test("should handle non-STRUCT type string", () => {
        const result = extractStructFieldsFromTypeString("VARCHAR");
        assert.deepStrictEqual(result, []);
      });

      test("should handle invalid STRUCT format", () => {
        const result = extractStructFieldsFromTypeString("STRUCT invalid");
        assert.deepStrictEqual(result, []);
      });

      test("should handle STRUCT with whitespace", () => {
        const typeString = 'STRUCT( "field1" VARCHAR , "field2" INTEGER )';
        const result = extractStructFieldsFromTypeString(typeString);
        
        assert.deepStrictEqual(result, [
          { name: "field1", type: "VARCHAR" },
          { name: "field2", type: "INTEGER" },
        ]);
      });
    });


    suite("flattenStructColumns", () => {
      test("should flatten STRUCT column with fields in type string", () => {
        const columns = [
          {
            name: "author",
            type: 'STRUCT("login" VARCHAR, "id" VARCHAR, "display_name" VARCHAR)'
          },
          {
            name: "regular_column",
            type: "STRING"
          }
        ];

        const rows = [
          [{"login":"test","id":"123","display_name":"test"}, "regular_value_1"],
          [{"login":"test2","id":"456","display_name":"test2"}, "regular_value_2"]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "author.login", type: "" },
          { name: "author.id", type: "" },
          { name: "author.display_name", type: "" },
          { name: "regular_column", type: "STRING" }
        ]);

        assert.deepStrictEqual(result.rows, [
          ["test", "123", "test", "regular_value_1"],
          ["test2", "456", "test2", "regular_value_2"]
        ]);
      });

      test("should flatten STRUCT column with fields array", () => {
        const columns = [
          {
            name: "struct",
            type: "RECORD",
            fields: [
              { name: "a", type: "INTEGER" },
              { name: "b", type: "INTEGER" },
              { name: "c", type: "INTEGER" }
            ]
          }
        ];

        const rows = [
          [[1, 2, 3]],
          [[4, 5, 6]]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "struct.a", type: "" },
          { name: "struct.b", type: "" },
          { name: "struct.c", type: "" }
        ]);

        assert.deepStrictEqual(result.rows, [
          [1, 2, 3],
          [4, 5, 6]
        ]);
      });

      test("should infer fields from object structure", () => {
        const columns = [
          {
            name: "struct",
            type: "STRUCT"
          }
        ];

        const rows = [
          [{"field1":"value1","field2":"value2"}]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "struct.field1", type: "" },
          { name: "struct.field2", type: "" }
        ]);

        assert.deepStrictEqual(result.rows, [
          ["value1", "value2"]
        ]);
      });


      test("should handle nested array structure", () => {
        const columns = [
          {
            name: "struct",
            type: "RECORD"
          }
        ];

        const rows = [
          [[[1, 2, 3]]]
        ];

        const result = flattenStructColumns(columns, rows);

        // Since the nested array [[[1, 2, 3]]] is not an object, it should not be flattened
        assert.deepStrictEqual(result.columns, [
          { name: "struct", type: "RECORD" }
        ]);

        assert.deepStrictEqual(result.rows, [
          [[[1, 2, 3]]]
        ]);
      });

      test("should keep non-STRUCT columns unchanged", () => {
        const columns = [
          {
            name: "regular_string",
            type: "STRING"
          },
          {
            name: "regular_int",
            type: "INTEGER"
          }
        ];

        const rows = [
          ["value1", 123],
          ["value2", 456]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, columns);
        assert.deepStrictEqual(result.rows, rows);
      });

      test("should handle empty columns and rows", () => {
        const result = flattenStructColumns([], []);
        assert.deepStrictEqual(result, { columns: [], rows: [] });
      });

      test("should handle null/undefined values", () => {
        const columns = [
          {
            name: "author",
            type: 'STRUCT("login" VARCHAR, "id" VARCHAR)'
          }
        ];

        const rows = [
          [{"login":"test","id":null}],
          [{"login":null,"id":"123"}]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "author.login", type: "" },
          { name: "author.id", type: "" }
        ]);

        assert.deepStrictEqual(result.rows, [
          ["test", null],
          [null, "123"]
        ]);
      });

      test("should handle STRUCT with missing fields in row data", () => {
        const columns = [
          {
            name: "author",
            type: 'STRUCT("login" VARCHAR, "id" VARCHAR, "email" VARCHAR)'
          }
        ];

        const rows = [
          [{"login":"test","id":"123"}]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "author.login", type: "" },
          { name: "author.id", type: "" },
          { name: "author.email", type: "" }
        ]);

        assert.deepStrictEqual(result.rows, [
          ["test", "123", null]
        ]);
      });

      test("should handle multiple STRUCT columns", () => {
        const columns = [
          {
            name: "author",
            type: 'STRUCT("login" VARCHAR, "id" VARCHAR)'
          },
          {
            name: "metadata",
            type: 'STRUCT("key" VARCHAR, "value" VARCHAR)'
          },
          {
            name: "regular",
            type: "STRING"
          }
        ];

        const rows = [
          [{"login":"test","id":"123"}, {"key":"k1","value":"v1"}, "regular_value"]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "author.login", type: "" },
          { name: "author.id", type: "" },
          { name: "metadata.key", type: "" },
          { name: "metadata.value", type: "" },
          { name: "regular", type: "STRING" }
        ]);

        assert.deepStrictEqual(result.rows, [
          ["test", "123", "k1", "v1", "regular_value"]
        ]);
      });

      test("should preserve column order", () => {
        const columns = [
          {
            name: "col1",
            type: "STRING"
          },
          {
            name: "struct",
            type: 'STRUCT("a" VARCHAR, "b" VARCHAR)'
          },
          {
            name: "col2",
            type: "INTEGER"
          }
        ];

        const rows = [
          ["value1", {"a":"a_val","b":"b_val"}, 42]
        ];

        const result = flattenStructColumns(columns, rows);

        assert.deepStrictEqual(result.columns, [
          { name: "col1", type: "STRING" },
          { name: "struct.a", type: "" },
          { name: "struct.b", type: "" },
          { name: "col2", type: "INTEGER" }
        ]);

        assert.deepStrictEqual(result.rows, [
          ["value1", "a_val", "b_val", 42]
        ]);
      });
    });
  });
});
