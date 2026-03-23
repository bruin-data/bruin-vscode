import { DateTime, DurationLikeObject } from "luxon";

export interface TimeModifier {
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  weeks?: number;
  cron_periods?: number;
}

/**
 * Parse interval modifier from various formats:
 * - Number: represents cron_periods (e.g., 2)
 * - String: shorthand format (e.g., "-13d", "5h", "-2w")
 * - Object: full format (e.g., { days: -13, hours: 5 })
 *
 * Returns null if modifier is empty or unparseable.
 * Matches CLI behavior: all fields are preserved and applied together.
 */
export const parseIntervalModifier = (
  modifier: string | number | Record<string, number> | undefined | null
): TimeModifier | null => {
  if (modifier === undefined || modifier === null) return null;

  // Handle number format (cron_periods)
  if (typeof modifier === "number") {
    if (modifier === 0) return null;
    return { cron_periods: modifier };
  }

  // Handle string format like "-13d", "5h", "-2w", "-1M"
  if (typeof modifier === "string") {
    const match = modifier.match(/^(-?\d+)([dhwmMs])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unitChar = match[2];
      switch (unitChar) {
        case "d":
          return { days: value };
        case "h":
          return { hours: value };
        case "w":
          return { weeks: value };
        case "M":
          return { months: value };
        case "m":
          return { minutes: value };
        case "s":
          return { seconds: value };
        default:
          return null;
      }
    }
    return null;
  }

  // Handle object format - preserve all non-zero fields (matches CLI behavior)
  const result: TimeModifier = {};
  const validKeys = ["months", "days", "hours", "minutes", "seconds", "weeks", "cron_periods"];
  let hasValue = false;

  for (const key of validKeys) {
    const val = modifier[key];
    if (typeof val === "number" && val !== 0) {
      result[key as keyof TimeModifier] = val;
      hasValue = true;
    }
  }

  return hasValue ? result : null;
};

/**
 * Apply interval modifier to a date using Luxon (UTC).
 * Matches CLI behavior: applies all fields at once (months, days, hours, etc.)
 */
export const applyModifierToDate = (
  dateStr: string,
  modifier: TimeModifier
): DateTime => {
  let dt = DateTime.fromISO(dateStr, { zone: "utc" });
  if (!dt.isValid) {
    dt = DateTime.utc();
  }

  // Build duration object matching CLI's ModifyDate behavior
  const duration: DurationLikeObject = {};

  if (modifier.months) duration.months = modifier.months;
  if (modifier.weeks) duration.weeks = modifier.weeks;
  if (modifier.days) duration.days = modifier.days;
  if (modifier.hours) duration.hours = modifier.hours;
  if (modifier.minutes) duration.minutes = modifier.minutes;
  if (modifier.seconds) duration.seconds = modifier.seconds;
  // cron_periods can't be calculated without schedule info

  return dt.plus(duration);
};

/**
 * Format modifier for display (e.g., { days: -13, hours: 5 } -> "-13 days, +5 hours")
 */
export const formatModifierForDisplay = (
  modifier: string | number | Record<string, number> | undefined | null
): string => {
  const parsed = parseIntervalModifier(modifier);
  if (!parsed) return "";

  const unitNames: Record<keyof TimeModifier, string> = {
    months: "month",
    weeks: "week",
    days: "day",
    hours: "hour",
    minutes: "minute",
    seconds: "second",
    cron_periods: "period",
  };

  const parts: string[] = [];
  const orderedKeys: (keyof TimeModifier)[] = ["months", "weeks", "days", "hours", "minutes", "seconds", "cron_periods"];

  for (const key of orderedKeys) {
    const value = parsed[key];
    if (value !== undefined && value !== 0) {
      const unitName = unitNames[key];
      const plural = Math.abs(value) !== 1 ? "s" : "";
      const sign = value >= 0 ? "+" : "";
      parts.push(`${sign}${value} ${unitName}${plural}`);
    }
  }

  return parts.join(", ");
};
