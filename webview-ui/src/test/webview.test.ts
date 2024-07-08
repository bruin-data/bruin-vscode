import { suite, test, assert, beforeEach, afterEach } from 'vitest';
import cronParser from 'cron-parser';
import { isValidCron, resetStartEndDate } from '../utilities/helper';
import { after } from 'node:test';

suite('testing webview', () => {
  const environments = ['dev', 'qa', 'prod'];
  let schedule, today, startDate, endDate;

  beforeEach(() => {
    schedule = '' ;
    today = new Date('2024-07-08T05:23:00.000');
    startDate = { value: '' };
    endDate = { value: '' };
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

    console.log('Next execution date:', next.toISOString());
    console.log('Expected next date:', expectedNextDate.toISOString());

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

  test('test reset start and end date for "daily" schedule', () => {
    schedule = 'daily';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-07T00:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-08T00:00:00.000');
  });

  test('test reset start and end date for "weekly" schedule', () => {
    schedule = 'weekly';
    today = new Date('2024-07-04T00:00:00.000Z');
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-06-24T00:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-01T00:00:00.000'); 
});

  test('test reset start and end date for "monthly" schedule', () => {
    schedule = 'monthly';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-06-01T00:00:00.000');
    assert.strictEqual(endDate.value, '2024-06-30T00:00:00.000');
  });

  test('test reset start and end date for "2 17 * * *"', () => {
    schedule = '2 17 * * *';
    resetStartEndDate(schedule, today, startDate, endDate);
    console.log('Start Date cron:', startDate.value);
    console.log('End Date cron:', endDate.value);
    assert.strictEqual(startDate.value, '2024-07-06T17:02:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T17:02:00.000');
  });

  test('test reset start and end date for "30 17 * * *"', () => {
    schedule = '30 17 * * *';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T17:30:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T17:30:00.000');
  });

  test('test reset start and end date for "0 18 * * *"', () => {
    schedule = '0 18 * * *';
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T18:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T18:00:00.000');
  });

  test('test reset start and end date for "0 19 * 6 *"', () => {
    schedule = '0 19 * 6 *'; // June
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-06-29T19:00:00.000');
    assert.strictEqual(endDate.value, '2024-06-30T19:00:00.000');
  });

  test('test reset start and end date for "0 20 * * 1-5"', () => {
    schedule = '0 20 * * 1-5'; // Weekdays (Monday to Friday)
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-04T20:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-05T20:00:00.000');
  });

  test('test reset start and end date for "0 20 * * 6,7"', () => {
    schedule = '0 20 * * 6,7'; // Saturday and Sunday
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2024-07-06T20:00:00.000');
    assert.strictEqual(endDate.value, '2024-07-07T20:00:00.000');
  });

  test('test reset start and end date for "0 20 10 7 *"', () => {
    schedule = '0 20 10 7 *'; // July 10th
    resetStartEndDate(schedule, today, startDate, endDate);
    assert.strictEqual(startDate.value, '2022-07-10T20:00:00.000');
    assert.strictEqual(endDate.value, '2023-07-10T20:00:00.000');
  });

});
