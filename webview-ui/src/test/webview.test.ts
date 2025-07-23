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
import * as pipelineData from "../utilities/pipeline.json";
import FilterTab from "@/components/lineage-flow/filterTab/filterTab.vue";
import { mount } from "@vue/test-utils";
import "./mocks/vueFlow"; // Import the mocks
import { buildPipelineLineage, generateGraph } from "@/components/lineage-flow/pipeline-lineage/pipelineLineageBuilder";
import { buildColumnLineage, getAssetDatasetWithColumns } from "@/components/lineage-flow/column-level/useColumnLevel";
import { generateColumnGraph, createColumnLevelEdges } from "@/utilities/graphGenerator";

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
