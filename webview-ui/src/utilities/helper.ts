import type { CheckboxItems } from "@/types";
import { DateTime } from "luxon";
import * as cronParser from "cron-parser";

const isExclusiveChecked = (checkboxesItems: CheckboxItems[]): boolean => {
  return checkboxesItems.some((item) => item.name === "Exclusive-End-Date" && item.checked);
};

export const adjustEndDateForExclusive = (endDateString: string): string => {
  console.log("Initial endDate:", endDateString);

  // Parse the endDateString into a Luxon DateTime object
  const endDate = DateTime.fromISO(endDateString, { zone: "utc" }).minus({ milliseconds: 1 });
  const adjustedEndDateString = endDate.toISO({ includeMillis: true });

  console.log("Adjusted endDate with Luxon:", adjustedEndDateString);
  return adjustedEndDateString.replace(/\.999Z$/, ".999999999Z");
};

export const concatCommandFlags = (
  startDate: string,
  endDate: string,
  endDateExclusive: string,
  checkboxItems: CheckboxItems[]
): string => {
  const startDateFlag = ` --start-date ${startDate.endsWith("Z") ? startDate : startDate + "Z"}`;
  const endDateFlag = isExclusiveChecked(checkboxItems) ? ` --end-date ${endDateExclusive}` : ` --end-date ${endDate}`;

  const checkboxesFlags = checkboxItems
    .filter((item) => item.checked && item.name !== "Exclusive-End-Date")
    .map((item) => ` --${item.name.toLowerCase()}`);

  return [startDateFlag, endDateFlag, ...checkboxesFlags].join("");
};

export const handleError = (validationError: any | null, renderSQLAssetError: any | null) => {
  if (validationError || renderSQLAssetError) {
    let errorMessage = validationError || renderSQLAssetError || "An error occurred";
    const isValidationError = !!validationError;

    // Handle JSON-formatted errors
    if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
      try {
        const parsedError = JSON.parse(errorMessage);
        errorMessage = parsedError.error || errorMessage;
      } catch {
        // If parsing fails, use the original error message
      }
    }

    return {
      errorCaptured: true,
      errorMessage,
      isValidationError,
    };
  }
  return null;
};

export const resetStates = (states: any[]) => {
  states.forEach((state) => (state.value = null));
};

export const updateValue = (
  envelope: { payload: { status: string; message: any } },
  status: string
) => {
  return envelope.payload.status === status ? envelope.payload.message : null;
};

export const determineValidationStatus = (
  success: string | null,
  error: string | null,
  loading: string | null,
  hasCriticalErrors: boolean
) => {
  if (loading) return "loading";
  if (error) return hasCriticalErrors ? "failed" : "validated";
  if (success) return "validated";
  return null; // Default return value
};

export const parseAssetDetails = (data: string) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  const asset = parsedData.asset || {};
  const pipeline = parsedData.pipeline || {};

  return {
    id: asset.id || "undefined",
    name: asset.name || pipeline.name || "undefined",
    type: asset.type || (asset.external ? "external" : "undefined"),
    schedule: asset.schedule || "undefined",
    description: asset.description || "No description available.",
    owner: asset.owner || "undefined",
    pipeline,
    columns: asset.columns ? transformColumnData(asset.columns) : [],
  };
};

export const parseEnvironmentList = (data) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  return {
    selectedEnvironment: parsedData.selected_environment,
    environments: parsedData.environments.map((env) => env.name),
  };
};

export const isValidCron = (expression: string) => {
  try {
    cronParser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
};

// Function that transforms 'daily', 'weekly', 'monthly' schedule to cron
export const scheduleToCron = (schedule: string) => {
  if (isValidCron(schedule)) {
    return { cronSchedule: schedule, error: null };
  }

  const cronSchedules = {
    hourly: "0 * * * *",
    daily: "0 0 * * *",
    weekly: "0 0 * * 1",
    monthly: "0 0 1 * *",
  };

  const cronSchedule = cronSchedules[schedule];
  if (cronSchedule) {
    return { cronSchedule, error: null };
  }

  return {
    cronSchedule: null,
    error: `Invalid schedule: ${schedule}. Please provide a valid cron expression or use 'hourly', 'daily', 'weekly', or 'monthly'.`,
  };
};

// Function that gets timestamp and schedule, and returns start and end timestamp
export const getPreviousRun = (schedule: string, timestamp: number) => {
  const options = { currentDate: timestamp, tz: "UTC" };
  const { cronSchedule, error } = scheduleToCron(schedule);
  if (error) throw new Error(error);

  const interval = cronParser.parseExpression(cronSchedule!, options);
  const endTime = interval.prev().toDate().getTime();
  const startTime = interval.prev().toDate().getTime(); // This seems to be the same as endTime; consider revising logic if needed

  return { startTime, endTime };
};

export const resetStartEndDate = (schedule: string, today: number, startDate: { value: string }, endDate: { value: string }) => {
  const { startTime, endTime } = getPreviousRun(schedule, today);
  console.log("start date:", startDate.value, "end date:", endDate.value);
  console.log("today", today, "start time:", startTime, "end time:", endTime);

  startDate.value = new Date(startTime).toISOString().slice(0, -1);
  endDate.value = new Date(endTime).toISOString().slice(0, -1);
  console.log("start:", startDate.value, "end:", endDate.value);
};

export const getUpstreams = (data) => {
  return data?.upstreams || data?.upstream || [];
};

export const transformColumnData = (columns) => {
  if (!columns) return [];
  return columns.map(column => {
    const newColumn = {
      name: column.name,
      type: column.type,
      description: column.description,
      checks: {
        unique: false,
        not_null: false,
        positive: false,
        negative: false,
        not_negative: false,
        acceptedValuesEnabled: false,
        accepted_values: [],
        patternEnabled: false,
        pattern: "",
      },
    };

    column.checks.forEach(check => {
      if (newColumn.checks.hasOwnProperty(check.name)) {
        newColumn.checks[check.name] = true;
        if (check.name === 'accepted_values') {
          newColumn.checks.acceptedValuesEnabled = true;
          newColumn.checks.accepted_values = check.value ? check.value.map(val => val.toString()) : [];
        } else if (check.name === 'pattern') {
          newColumn.checks.patternEnabled = true;
          newColumn.checks.pattern = check.value || "";
        }
      } else {
        console.warn(`Unexpected check name: ${check.name}`);
      }
    });

    return newColumn;
  });
};
