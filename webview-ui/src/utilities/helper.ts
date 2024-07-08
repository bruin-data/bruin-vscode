
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

  return adjustedEndDateString.replace(/\.999Z$/, ".999999999Z");;
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

  const flags = [startDateFlag, endDateFlag, ...checkboxesFlags].join(" ");
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
  loading: string | null
) => {
  return success ? "validated" : error ? "failed" : loading ? "loading" : null;
};

export function formatLineage(data: string) {
  if (!data) return;

  const parsedData = JSON.parse(data);
  console.log(parsedData);
  const numDownstream = parsedData.downstream?.length || 0;
  const numUpstream = parsedData.upstream?.length || 0;

  let result = `Lineage: '${parsedData.name}'\n\n`;
  result += "Upstream Dependencies\n ========================\n";
  if (numUpstream === 0) {
    result += "Asset has no upstream dependencies.\n\n";
  } else {
    parsedData.upstream.forEach((dep) => {
      result += `- ${dep.name} (${dep.executable_file.path.split("/").pop()})\n`;
    });
    result += `\nTotal: ${parsedData.upstream.length}\n\n`;
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
}

export const parseAssetDetails = (data: string) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  if (!parsedData.asset) {
    return {
      id: "undefined",
      name: parsedData.pipeline.name || "undefined",
      type: "pipeline",
      schedule: parsedData.pipeline.schedule || "undefined",
      description:'No description available.',
      owner: "undefined",
      pipeline: parsedData.pipeline || "undefined",
    };
  ;
  }
  const assetDetails = {
    id: parsedData.asset ? parsedData.asset.id : "undefined",
    name: parsedData.asset ? parsedData.asset.name : "undefined",
    type: parsedData.asset ? parsedData.asset.type : "undefined",
    schedule: parsedData.asset ? parsedData.asset.schedule : "undefined",
    description: parsedData.asset ? parsedData.asset.description : null,
    owner: parsedData.asset ? parsedData.asset.owner : "undefined",
    pipeline: parsedData.pipeline || "undefined",
  };

  return assetDetails;
};

export const parseEnvironmentList = (data) => {
  if (!data) return;

  const parsedData = JSON.parse(data);
  const environments = {
    selectedEnvironment: parsedData.selected_environment,
    environments: parsedData.environments.map((env) => env.name)
  };

  return environments;
}
  

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
      case 'hourly':
        return { cronSchedule: '0 0 * * * *', error: null };
      case 'daily':
        return { cronSchedule: '0 0 0 * * *', error: null };
      case 'weekly':
        return { cronSchedule: '0 0 0 * * 1', error: null };
      case 'monthly':
        return { cronSchedule: '0 0 0 1 * *', error: null };
      default:
        return { cronSchedule: null, error: `Invalid schedule: ${schedule}. Please provide a valid cron expression or use 'hourly', 'daily', 'weekly', or 'monthly'.` };
    }
  }
}

// function that get timestamp and schedule, and return start and end timestamp 

export function getPreviousRun(schedule: string, timestamp: Date) {
  const options = { currentDate: timestamp, tz: 'UTC'};
  const {cronSchedule, error} = scheduleToCron(schedule);
  if (error) {
    throw new Error(error);
  } 

  const interval = cronParser.parseExpression(cronSchedule!, options);
  const endTime = interval.prev().toDate().getTime();
  const startTime = interval.prev().toDate().getTime();

  return { startTime, endTime };

}

export function resetStartEndDate(schedule, today, startDate, endDate) {
  const {startTime, endTime} = getPreviousRun(schedule, today);
  const start = new Date(startTime).toISOString().slice(0, -1);
  const end = new Date(endTime).toISOString().slice(0, -1);
  startDate.value = start;
  endDate.value = end;
}
