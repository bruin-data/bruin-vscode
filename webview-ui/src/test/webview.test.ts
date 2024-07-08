import { suite, test, assert, beforeEach, afterEach } from 'vitest';
import * as  cronParser from 'cron-parser';
import { isValidCron, resetStartEndDate, scheduleToCron, getPreviousRun } from '../utilities/helper';


suite('testing webview', () => {
  const environments = ['dev', 'qa', 'prod'];
  let schedule, today, startDate, endDate, startTime, endTime;

  beforeEach(() => {
    schedule = '' ;
    today = new Date('2024-07-08T05:23:00.000Z');
    startDate = { value: '' };
    endDate = { value: '' };
    startTime = '';
    endTime = '';
  });

  test('test scheduleToCron', () => {
    const daily = '0 0 0 * * *';
    const weekly = '0 0 0 * * 1';
    const monthly = '0 0 0 1 * *';

    const cronDaily = scheduleToCron('daily');
    const cronWeekly = scheduleToCron('weekly');
    const cronMonthly = scheduleToCron('monthly');
    const cronInvalid = scheduleToCron('invalid');

    assert.deepStrictEqual(cronDaily, { cronSchedule: daily, error: null });
    assert.deepStrictEqual(cronWeekly, { cronSchedule: weekly, error: null });
    assert.deepStrictEqual(cronMonthly, { cronSchedule: monthly, error: null });

    assert.deepStrictEqual(cronInvalid.cronSchedule, null);
    assert.match(cronInvalid.error as string, /^Invalid schedule: invalid\. .*$/);
  });
  test('initializes selectedEnv with default environment', () => {
    const selectedEnvironment = 'qa';
    const wrapper = {
      vm: {
        selectedEnv: null as string | null,
      },
    };
    wrapper.vm.selectedEnv = selectedEnvironment;
    assert.strictEqual(wrapper.vm.selectedEnv, selectedEnvironment);
  });

  test('handles edge case of null selectedEnvironment', () => {
    const wrapper = {
      vm: {
        selectedEnv: null,
      },
    };
    wrapper.vm.selectedEnv = null;
    assert.strictEqual(wrapper.vm.selectedEnv, null);
  });

  test('handles edge case when selectedEnv is not in the list of environments', () => {
    const selectedEnvironment = 'staging';
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

  test('test cron parser', () => {
    const fixedDate = new Date('2023-06-15T12:00:00.000Z');
    const interval = cronParser.parseExpression('0 0 1 * *', { currentDate: fixedDate, tz: 'UTC' });

    const next = interval.next().toDate();
    const expectedNextDate = new Date(Date.UTC(2023, 6, 1, 0, 0, 0, 0));

    assert.strictEqual(next.toISOString(), expectedNextDate.toISOString());
  });

  test('test is valid cron ', () => {
    const cron = '0 0 1 * *';
    const invalidCron = '0 0 1 * * *';

    const isValid = isValidCron(cron);
    const isInvalid = isValidCron(invalidCron);

    assert.strictEqual(isValid, true);
    assert.strictEqual(isInvalid, true);
  });

  test('test get previous run for "hourly" schedule', () => {
    schedule = 'hourly';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-08T04:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-08T05:00:00.000Z').getTime());
  });

  test('test get previous run for "daily" schedule', () => {
    schedule = 'daily';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-07T00:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-08T00:00:00.000Z').getTime());
  });

  test('test get previous run for "weekly" schedule', () => {
    schedule = 'weekly';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-01T00:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-08T00:00:00.000Z').getTime()); 
});

  test('test get previous run for "monthly" schedule', () => {
    schedule = 'monthly';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-06-01T00:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-01T00:00:00.000Z').getTime());
  });

  test('test get previous run for "2 17 * * *"', () => {
    schedule = '2 17 * * *';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-06T17:02:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-07T17:02:00.000Z').getTime());
  });

  test('test get previous run for "30 17 * * *"', () => {
    schedule = '30 17 * * *';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-06T17:30:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-07T17:30:00.000Z').getTime());
  });

  test('test get previous run for "0 18 * * *"', () => {
    schedule = '0 18 * * *';
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-06T18:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-07T18:00:00.000Z').getTime());
  });
    test('test get previous run for "0 19 * 6 *"', () => {
    schedule = '0 19 * 6 *'; // June
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-06-29T19:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-06-30T19:00:00.000Z').getTime());
  });

  test('test get previous run for "0 20 * * 1-5"', () => {
    schedule = '0 20 * * 1-5'; // Weekdays (Monday to Friday)
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-04T20:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-05T20:00:00.000Z').getTime());
  });

  test('test get previous run for "0 20 * * 6,7"', () => {
    schedule = '0 20 * * 6,7'; // Saturday and Sunday
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2024-07-06T20:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2024-07-07T20:00:00.000Z').getTime());
  });

  test('test get previous run for "0 20 10 7 *"', () => {
    schedule = '0 20 10 7 *'; // July 10th
    const { startTime, endTime } = getPreviousRun(schedule, today);
    assert.strictEqual(startTime, new Date('2022-07-10T20:00:00.000Z').getTime());
    assert.strictEqual(endTime, new Date('2023-07-10T20:00:00.000Z').getTime());
  });
  
  test ('test reset Start End Date for "hourly" schedule', () => {
    schedule = 'hourly';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-08T04:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-08T05:00:00.000');
  });
  test('test reset Start End Date for "daily" schedule', () => {
    schedule = 'daily';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-07T00:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-08T00:00:00.000');
  });

  test('test reset Start End Date for "weekly" schedule', () => {
    schedule = 'weekly';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-01T00:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-08T00:00:00.000');
  });

  test('test reset Start End Date for "monthly" schedule', () => {
    schedule = 'monthly';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-06-01T00:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-01T00:00:00.000');
  });

  test('test reset Start End Date for "2 17 * * *"', () => {
    schedule = '2 17 * * *';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T17:02:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T17:02:00.000');
  });

  test('test reset Start End Date for "30 17 * * *"', () => {
    schedule = '30 17 * * *';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T17:30:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T17:30:00.000');
  });

  test('test reset Start End Date for "0 18 * * *"', () => {
    schedule = '0 18 * * *';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T18:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T18:00:00.000');
  });

  test('test reset Start End Date for "0 19 * 6 *"', () => {
    schedule = '0 19 * 6 *'; // June
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-06-29T19:00:00.000');
    assert.strictEqual(endDate.value, '2024-06-30T19:00:00.000');
  });

  test('test reset Start End Date for "0 20 * * 1-5"', () => {
    schedule = '0 20 * * 1-5'; // Weekdays (Monday to Friday)
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-04T20:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-05T20:00:00.000');
  });

  test('test reset Start End Date for "0 20 * * 6,7"', () => {
    schedule = '0 20 * * 6,7'; // Saturday and Sunday
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T20:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T20:00:00.000');
  });

  test('test reset Start End Date for "0 20 10 7 *"', () => {
    schedule = '0 20 10 7 *'; // July 10th
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2022-07-10T20:00:00.000');
    assert.strictEqual(endDate.value, '2023-07-10T20:00:00.000');
  });


  test ('test get previous run for invalid schedule', () => {
    schedule = 'invalid';
    try {
      const { startTime, endTime } = getPreviousRun(schedule, today);
      assert.fail('Expected an error to be thrown');
    } catch (error: any) {
      assert.deepStrictEqual(error.message, `Invalid schedule: ${schedule}. Please provide a valid cron expression or use 'hourly', 'daily', 'weekly', or 'monthly'.`);
    }
  }
  );

});