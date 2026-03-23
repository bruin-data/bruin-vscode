import { DateTime } from "luxon";

export interface ParsedModifier {
  value: number;
  unit: string;
}

/**
 * Parse interval modifier from various formats:
 * - Number: represents cron_periods (e.g., 2)
 * - String: shorthand format (e.g., "-13d", "5h", "-2w")
 * - Object: full format (e.g., { days: -13 }, { hours: 5 })
 *
 * Returns null if modifier is empty, zero, or unparseable.
 */
export const parseIntervalModifier = (
  modifier: string | number | Record<string, number> | undefined | null
): ParsedModifier | null => {
  if (modifier === undefined || modifier === null) return null;

  // Handle number format (cron_periods)
  if (typeof modifier === "number") {
    if (modifier === 0) return null;
    return { value: modifier, unit: "periods" };
  }

  // Handle string format like "-13d", "5h", "-2w", "-1M"
  if (typeof modifier === "string") {
    const match = modifier.match(/^(-?\d+)([dhwmM])$/);
    if (match) {
      const unit = match[2] === "M" ? "m" : match[2].toLowerCase();
      return { value: parseInt(match[1], 10), unit };
    }
    return null;
  }

  // Handle object format like { days: -13 }, { hours: 5 }
  const unitMap: Record<string, string> = {
    days: "d",
    hours: "h",
    weeks: "w",
    months: "m",
    minutes: "min",
    seconds: "s",
    cron_periods: "periods",
  };

  for (const [key, val] of Object.entries(modifier)) {
    if (typeof val === "number" && val !== 0 && unitMap[key]) {
      return { value: val, unit: unitMap[key] };
    }
  }
  return null;
};

/**
 * Apply interval modifier to a date using Luxon (UTC).
 */
export const applyModifierToDate = (
  dateStr: string,
  modifier: ParsedModifier
): DateTime => {
  let dt = DateTime.fromISO(dateStr, { zone: "utc" });
  if (!dt.isValid) {
    dt = DateTime.utc();
  }

  switch (modifier.unit) {
    case "d":
      return dt.plus({ days: modifier.value });
    case "h":
      return dt.plus({ hours: modifier.value });
    case "w":
      return dt.plus({ weeks: modifier.value });
    case "m":
      return dt.plus({ months: modifier.value });
    case "min":
      return dt.plus({ minutes: modifier.value });
    case "s":
      return dt.plus({ seconds: modifier.value });
    case "periods":
      // cron_periods - can't calculate without schedule info
      return dt;
    default:
      return dt;
  }
};

/**
 * Format modifier for display (e.g., { days: -13 } -> "-13 days")
 */
export const formatModifierForDisplay = (
  modifier: string | number | Record<string, number> | undefined | null
): string => {
  const parsed = parseIntervalModifier(modifier);
  if (!parsed) return "";

  const unitNames: Record<string, string> = {
    d: "day",
    h: "hour",
    w: "week",
    m: "month",
    min: "minute",
    s: "second",
    periods: "period",
  };
  const unitName = unitNames[parsed.unit] || parsed.unit;
  const plural = Math.abs(parsed.value) !== 1 ? "s" : "";
  const sign = parsed.value >= 0 ? "+" : "";
  return `${sign}${parsed.value} ${unitName}${plural}`;
};
