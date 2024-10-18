import type { CheckboxItems } from "@/types";
import { DateTime } from "luxon";
import * as cronParser from "cron-parser";

const isExclusiveChecked = (checkboxesItems: CheckboxItems[]): boolean => {
  return checkboxesItems.some((item) => item.name === "Exclusive-End-Date" && item.checked);
};

export const adjustEndDateForExclusive = (endDateString: string): string => {
  console.log("Initial endDate:", endDateString);

  // Parse the endDateString into a Luxon DateTime object
  let endDate = DateTime.fromISO(endDateString, { zone: "utc" });

  endDate = endDate.minus({ milliseconds: 1 });

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
  let startDateFlag = " --start-date " + startDate;
  if (startDateFlag.slice(-1) !== "Z") {
    startDateFlag += "Z";
  }

  let endDateFlag = " --end-date " + endDate;

  // Adjust end date if "Exclusive End Date" is checked
  if (isExclusiveChecked(checkboxItems)) {
    endDateFlag = " --end-date " + endDateExclusive;
  }
  const checkboxesFlags = checkboxItems
    .filter((item) => item.checked && item.name !== "Exclusive-End-Date")
    .map((item) => ` --${item.name.toLowerCase()}`);

  const flags = [startDateFlag, endDateFlag, ...checkboxesFlags].join("");
  return flags;
};

export const handleError = (validationError: any | null, renderSQLAssetError: string | null) => {
  if (validationError || renderSQLAssetError) {
    return {
      errorCaptured: true,
      errorMessage: validationError || renderSQLAssetError || "An error occurred",
    };
  }
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
  if (error) return hasCriticalErrors? "failed" : "validated";
  if (success) return "validated";
  return null; // Add a default return value
};
/* 
export function formatLineage(data: string) {
  if (!data) return;

  const parsedData = JSON.parse(data);
  console.log(parsedData);
  const numDownstream = parsedData.downstream?.length || 0;
  const numUpstream = parsedData.upstreams?.length || 0;

  let result = `Lineage: '${parsedData.name}'\n\n`;
  result += "Upstream Dependencies\n ========================\n";
  if (numUpstream === 0) {
    result += "Asset has no upstream dependencies.\n\n";
  } else {
    parsedData.upstreams.forEach((dep) => {
      result += `- ${dep.name} (${dep.executable_file.path.split("/").pop()})\n`;
    });
    result += `\nTotal: ${parsedData.upstreams.length}\n\n`;
  }

  result += "Downstream Dependencies\n========================\n";
  if (numDownstream === 0) {
    result += "Asset has no downstream dependencies.\n";
  } else {
    parsedData.downstream.forEach((dep) => {
      result += `- ${dep.name} (${dep.executable_file.path.split("/").pop()})\n`;
    });
    result += `\nTotal: ${parsedData.downstream.length}\n`;
  }

  return result;
} */

export const parseAssetDetails = (data: string) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  if (!parsedData.asset) {
    return {
      id: "undefined",
      name: parsedData.pipeline.name || "undefined",
      type: "pipeline",
      schedule: parsedData.pipeline.schedule || "undefined",
      description: "No description available.",
      owner: "undefined",
      pipeline: parsedData.pipeline || "undefined",
      columns:[],
    };
  }
  const assetDetails = {
    id: parsedData.asset ? parsedData.asset.id : "undefined",
    name: parsedData.asset ? parsedData.asset.name : "undefined",
    type: parsedData.asset
      ? parsedData.asset.type
      : parsedData.asset.external
        ? "external"
        : "undefined",
    schedule: parsedData.asset ? parsedData.asset.schedule : "undefined",
    description: parsedData.asset ? parsedData.asset.description : null,
    owner: parsedData.asset ? parsedData.asset.owner : "undefined",
    pipeline: parsedData.pipeline || "undefined",
    columns: parsedData.asset ? transformColumnData(parsedData.asset.columns) : [],
  };

  return assetDetails;
};

export const parseEnvironmentList = (data) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  const environments = {
    selectedEnvironment: parsedData.selected_environment,
    environments: parsedData.environments.map((env) => env.name),
  };

  return environments;
};

export function isValidCron(expression: string) {
  try {
    cronParser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
}
// function that trnasform 'daily', weekly', 'monthly' schedule to cron
export function scheduleToCron(schedule: string) {
  if (isValidCron(schedule)) {
    return { cronSchedule: schedule, error: null };
  } else {
    switch (schedule) {
      case "hourly":
        return { cronSchedule: "0 * * * *", error: null };
      case "daily":
        return { cronSchedule: "0 0 * * *", error: null };
      case "weekly":
        return { cronSchedule: "0 0 * * 1", error: null };
      case "monthly":
        return { cronSchedule: "0 0 1 * *", error: null };
      default:
        return {
          cronSchedule: null,
          error: `Invalid schedule: ${schedule}. Please provide a valid cron expression or use 'hourly', 'daily', 'weekly', or 'monthly'.`,
        };
    }
  }
}

// function that get timestamp and schedule, and return start and end timestamp

export function getPreviousRun(schedule: string, timestamp) {
  const options = { currentDate: timestamp, tz: "UTC" };

  const { cronSchedule, error } = scheduleToCron(schedule);
  if (error) {
    throw new Error(error);
  }

  const interval = cronParser.parseExpression(cronSchedule!, options);

  const endTime = interval.prev().toDate().getTime();
  const startTime = interval.prev().toDate().getTime();
  return { startTime, endTime };
}

export function resetStartEndDate(schedule, today, startDate, endDate) {
  const { startTime, endTime } = getPreviousRun(schedule, today);
  console.log("start date:", startDate, "end date:", endDate);
  console.log("today", today, "start time:", startTime, "end time:", endTime);

  const start = new Date(startTime).toISOString().slice(0, -1);
  const end = new Date(endTime).toISOString().slice(0, -1);
  console.log("start:", start, "end:", end);
  startDate.value = start;
  endDate.value = end;
}

export const getUpstreams = (data) => {
  return data?.upstreams || data?.upstream || [];
};


export function transformColumnData(columns) {
  if(!columns) return [];
  return columns.map(column => {
    // Create a new object for each column with the desired structure
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

    // Transform the checks array into the new checks object format
    column.checks.forEach(check => {
      switch (check.name) {
        case 'unique':
          newColumn.checks.unique = true;
          break;
        case 'not_null':
          newColumn.checks.not_null = true;
          break;
        case 'positive':
          newColumn.checks.positive = true;
          break;
        case 'negative':
          newColumn.checks.negative = true;
          break;
        case 'not_negative':
          newColumn.checks.not_negative = true;
          break;
        case 'accepted_values':
          newColumn.checks.acceptedValuesEnabled = true;
          newColumn.checks.accepted_values = check.value ? check.value.map(val => val.toString()) : [];
          break;
        case 'pattern':
          newColumn.checks.patternEnabled = true;
          newColumn.checks.pattern = check.value || "";
          break;
        default:
          // Optionally log an unexpected check for debugging purposes
          console.warn(`Unexpected check name: ${check.name}`);
          break;
      }
    });

    return newColumn;
  });
}
