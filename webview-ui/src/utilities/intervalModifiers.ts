import { DateTime } from "luxon";

export interface ParsedModifier {
  value: number;
  unit: 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds' | 'milliseconds' | 'nanoseconds';
}

/**
 * Parse interval modifier string format that matches CLI behavior.
 * CLI only accepts scalar string values like "-13d", "5h", "-2w", "500ms", "1000ns"
 * NOT object format like { days: -13, hours: 5 }
 *
 * Supported formats (matching CLI pkg/pipeline/pipeline.go parseTimeModifier):
 * - Two-char suffixes: "ms" (milliseconds), "ns" (nanoseconds)
 * - Single-char suffixes: "h" (hours), "m" (minutes), "s" (seconds), "d" (days), "M" (months)
 *
 * Returns null if modifier is empty or unparseable.
 */
export const parseIntervalModifier = (
  modifier: string | undefined | null
): ParsedModifier | null => {
  if (!modifier || typeof modifier !== "string") return null;

  // Check for two-character suffixes first (ms, ns) - matching CLI logic
  if (modifier.length >= 3) {
    const twoCharSuffix = modifier.slice(-2);
    if (twoCharSuffix === "ms" || twoCharSuffix === "ns") {
      const numeric = modifier.slice(0, -2);
      const value = parseInt(numeric, 10);
      if (isNaN(value)) return null;

      return {
        value,
        unit: twoCharSuffix === "ms" ? "milliseconds" : "nanoseconds"
      };
    }
  }

  // Single character suffix
  if (modifier.length < 2) return null;

  const suffix = modifier[modifier.length - 1];
  const numeric = modifier.slice(0, -1);
  const value = parseInt(numeric, 10);

  if (isNaN(value)) return null;

  // Map suffix to unit (matching CLI switch statement)
  switch (suffix) {
    case 'h':
      return { value, unit: 'hours' };
    case 'm':
      return { value, unit: 'minutes' };
    case 's':
      return { value, unit: 'seconds' };
    case 'd':
      return { value, unit: 'days' };
    case 'M':
      return { value, unit: 'months' };
    default:
      return null;
  }
};

/**
 * Apply interval modifier to a date using Luxon (UTC).
 * Matches CLI's ModifyDate behavior using Go's time.AddDate and time.Add
 */
export const applyModifierToDate = (
  dateStr: string,
  modifier: ParsedModifier
): DateTime => {
  let dt = DateTime.fromISO(dateStr, { zone: "utc" });
  if (!dt.isValid) {
    dt = DateTime.utc();
  }

  const duration: Record<string, number> = {};
  duration[modifier.unit] = modifier.value;

  return dt.plus(duration);
};

/**
 * Format modifier for display (e.g., "-13d" -> "-13 days")
 */
export const formatModifierForDisplay = (
  modifier: string | undefined | null
): string => {
  const parsed = parseIntervalModifier(modifier);
  if (!parsed) return "";

  const unitNames: Record<ParsedModifier['unit'], string> = {
    months: "month",
    weeks: "week",
    days: "day",
    hours: "hour",
    minutes: "minute",
    seconds: "second",
    milliseconds: "millisecond",
    nanoseconds: "nanosecond",
  };

  const unitName = unitNames[parsed.unit];
  const plural = Math.abs(parsed.value) !== 1 ? "s" : "";
  const sign = parsed.value >= 0 ? "+" : "";

  return `${sign}${parsed.value} ${unitName}${plural}`;
};
