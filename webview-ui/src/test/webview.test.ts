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
});

/* suite("AssetDetails", () => {
  const defaultProps = {
    name: "Test Asset",
    description: "This is a **test** description",
    type: "dataset",
    owner: "John Doe",
    id: "123",
    pipeline: { schedule: "daily" },
    environments: ["dev", "prod"],
    selectedEnvironment: "dev",
  };
  test("renders correctly with all props", () => {
    const wrapper = mount(AssetDetails, { props: defaultProps });
    assert.match(wrapper.text(), /Test Asset/);
    assert.match(wrapper.text(), /John Doe/);
    assert.match(wrapper.text(), /dataset/);
    assert.match(wrapper.text(), /daily/);
  });

  test("computes ownerExists correctly",async () => {
    const wrapper = mount(AssetDetails, { props: defaultProps })
    expect(wrapper.find('.font-semibold.text-editor-fg.opacity-30').exists()).toBe(true)

    await wrapper.setProps({ owner: '' })
    expect(wrapper.find('.font-semibold.text-editor-fg.opacity-30').exists()).toBe(false)
  });

  test("computes scheduleExists correctly", async () => {
    const wrapper = mount(AssetDetails, { props: defaultProps });
    expect(wrapper.findComponent({ name: 'AssetGeneral' }).props('schedule')).toBe('daily')

    await wrapper.setProps({ pipeline: { schedule: "" } });
    expect(wrapper.findComponent({ name: 'AssetGeneral' }).props('schedule')).toBe('')
  });

  test("renders markdown description correctly", () => {
    const mockRender = vi.fn().mockReturnValue('<p>This is a <strong>test</strong> description</p>')
    vi.mocked(MarkdownIt).mockImplementation(() => ({
      render: mockRender
    }))

    const wrapper = mount(AssetDetails, { props: defaultProps })
    expect(wrapper.html()).toContain('<p>This is a <strong>test</strong> description</p>')
    expect(mockRender).toHaveBeenCalledWith('This is a **test** description')
  });

  test("toggles name editing mode", async () => {
    const wrapper = mount(AssetDetails, { props: defaultProps })

    const nameElement = wrapper.find('.font-md.text-editor-fg.text-lg.font-mono')
    await nameElement.trigger('dblclick')

    expect(wrapper.find('input.font-md.text-editor-fg.text-lg.font-mono').exists()).toBe(true)
  });

  test("toggles description editing mode", async () => {
    const wrapper = mount(AssetDetails, { props: defaultProps })

    const descriptionElement = wrapper.find('.text-sm.text-editor-fg.opacity-65.prose.prose-sm.pt-4')
    await descriptionElement.trigger('dblclick')

    expect(wrapper.find('textarea.text-sm.text-editor-fg.opacity-65.prose.prose-sm.pt-4').exists()).toBe(true)
  });
}); */
