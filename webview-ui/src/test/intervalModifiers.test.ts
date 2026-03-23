import { describe, test, expect } from "vitest";
import {
  parseIntervalModifier,
  applyModifierToDate,
  formatModifierForDisplay,
} from "../utilities/intervalModifiers";

describe("parseIntervalModifier", () => {
  test("returns null for undefined/null", () => {
    expect(parseIntervalModifier(undefined)).toBeNull();
    expect(parseIntervalModifier(null)).toBeNull();
  });

  test("returns null for zero number", () => {
    expect(parseIntervalModifier(0)).toBeNull();
  });

  test("parses number as cron_periods", () => {
    expect(parseIntervalModifier(5)).toEqual({ cron_periods: 5 });
    expect(parseIntervalModifier(-3)).toEqual({ cron_periods: -3 });
  });

  test("parses string format with days", () => {
    expect(parseIntervalModifier("-13d")).toEqual({ days: -13 });
    expect(parseIntervalModifier("5d")).toEqual({ days: 5 });
  });

  test("parses string format with hours", () => {
    expect(parseIntervalModifier("-2h")).toEqual({ hours: -2 });
    expect(parseIntervalModifier("24h")).toEqual({ hours: 24 });
  });

  test("parses string format with weeks", () => {
    expect(parseIntervalModifier("-1w")).toEqual({ weeks: -1 });
    expect(parseIntervalModifier("2w")).toEqual({ weeks: 2 });
  });

  test("parses string format with months (M)", () => {
    expect(parseIntervalModifier("-1M")).toEqual({ months: -1 });
    expect(parseIntervalModifier("3M")).toEqual({ months: 3 });
  });

  test("parses string format with minutes (m)", () => {
    expect(parseIntervalModifier("-30m")).toEqual({ minutes: -30 });
  });

  test("parses string format with seconds (s)", () => {
    expect(parseIntervalModifier("-60s")).toEqual({ seconds: -60 });
  });

  test("returns null for invalid string", () => {
    expect(parseIntervalModifier("invalid")).toBeNull();
    expect(parseIntervalModifier("13")).toBeNull();
    expect(parseIntervalModifier("d13")).toBeNull();
  });

  test("parses object format with days", () => {
    expect(parseIntervalModifier({ days: -13 })).toEqual({ days: -13 });
    expect(parseIntervalModifier({ days: 5 })).toEqual({ days: 5 });
  });

  test("parses object format with hours", () => {
    expect(parseIntervalModifier({ hours: -2 })).toEqual({ hours: -2 });
    expect(parseIntervalModifier({ hours: 24 })).toEqual({ hours: 24 });
  });

  test("parses object format with months", () => {
    expect(parseIntervalModifier({ months: -1 })).toEqual({ months: -1 });
  });

  test("parses object format with minutes", () => {
    expect(parseIntervalModifier({ minutes: -30 })).toEqual({ minutes: -30 });
  });

  test("parses object format with seconds", () => {
    expect(parseIntervalModifier({ seconds: -60 })).toEqual({ seconds: -60 });
  });

  test("parses object format with cron_periods", () => {
    expect(parseIntervalModifier({ cron_periods: 2 })).toEqual({ cron_periods: 2 });
  });

  test("returns null for object with all zero values", () => {
    expect(parseIntervalModifier({ days: 0 })).toBeNull();
    expect(parseIntervalModifier({ hours: 0, days: 0 })).toBeNull();
  });

  test("parses object with multiple non-zero fields (matches CLI)", () => {
    expect(parseIntervalModifier({ days: -13, hours: 5 })).toEqual({ days: -13, hours: 5 });
    expect(parseIntervalModifier({ months: 1, days: -5, hours: 2 })).toEqual({ months: 1, days: -5, hours: 2 });
  });

  test("ignores zero fields in multi-field object", () => {
    expect(parseIntervalModifier({ days: 0, hours: 5 })).toEqual({ hours: 5 });
  });
});

describe("applyModifierToDate", () => {
  const baseDate = "2025-03-15T12:00:00.000Z";

  test("applies days modifier", () => {
    const result = applyModifierToDate(baseDate, { days: -13 });
    expect(result.toISO()).toBe("2025-03-02T12:00:00.000Z");
  });

  test("applies positive days modifier", () => {
    const result = applyModifierToDate(baseDate, { days: 5 });
    expect(result.toISO()).toBe("2025-03-20T12:00:00.000Z");
  });

  test("applies hours modifier", () => {
    const result = applyModifierToDate(baseDate, { hours: -2 });
    expect(result.toISO()).toBe("2025-03-15T10:00:00.000Z");
  });

  test("applies weeks modifier", () => {
    const result = applyModifierToDate(baseDate, { weeks: -1 });
    expect(result.toISO()).toBe("2025-03-08T12:00:00.000Z");
  });

  test("applies months modifier", () => {
    const result = applyModifierToDate(baseDate, { months: -1 });
    expect(result.toISO()).toBe("2025-02-15T12:00:00.000Z");
  });

  test("applies minutes modifier", () => {
    const result = applyModifierToDate(baseDate, { minutes: -30 });
    expect(result.toISO()).toBe("2025-03-15T11:30:00.000Z");
  });

  test("applies seconds modifier", () => {
    const result = applyModifierToDate(baseDate, { seconds: -60 });
    expect(result.toISO()).toBe("2025-03-15T11:59:00.000Z");
  });

  test("cron_periods modifier returns unchanged date", () => {
    const result = applyModifierToDate(baseDate, { cron_periods: 2 });
    expect(result.toISO()).toBe("2025-03-15T12:00:00.000Z");
  });

  test("applies multiple modifiers at once (matches CLI)", () => {
    const result = applyModifierToDate(baseDate, { days: -13, hours: 5 });
    expect(result.toISO()).toBe("2025-03-02T17:00:00.000Z");
  });

  test("applies months and days together", () => {
    const result = applyModifierToDate(baseDate, { months: -1, days: -5 });
    expect(result.toISO()).toBe("2025-02-10T12:00:00.000Z");
  });
});

describe("formatModifierForDisplay", () => {
  test("returns empty string for null/undefined", () => {
    expect(formatModifierForDisplay(undefined)).toBe("");
    expect(formatModifierForDisplay(null)).toBe("");
  });

  test("formats negative days", () => {
    expect(formatModifierForDisplay({ days: -13 })).toBe("-13 days");
  });

  test("formats positive days with plus sign", () => {
    expect(formatModifierForDisplay({ days: 5 })).toBe("+5 days");
  });

  test("formats singular day", () => {
    expect(formatModifierForDisplay({ days: 1 })).toBe("+1 day");
    expect(formatModifierForDisplay({ days: -1 })).toBe("-1 day");
  });

  test("formats hours", () => {
    expect(formatModifierForDisplay({ hours: -2 })).toBe("-2 hours");
    expect(formatModifierForDisplay({ hours: 1 })).toBe("+1 hour");
  });

  test("formats string input", () => {
    expect(formatModifierForDisplay("-13d")).toBe("-13 days");
    expect(formatModifierForDisplay("5h")).toBe("+5 hours");
  });

  test("formats number input (periods)", () => {
    expect(formatModifierForDisplay(2)).toBe("+2 periods");
    expect(formatModifierForDisplay(-1)).toBe("-1 period");
  });

  test("formats multiple fields in order", () => {
    expect(formatModifierForDisplay({ days: -13, hours: 5 })).toBe("-13 days, +5 hours");
    expect(formatModifierForDisplay({ months: 1, days: -5 })).toBe("+1 month, -5 days");
  });

  test("formats fields in correct order (months, weeks, days, hours, minutes, seconds)", () => {
    expect(formatModifierForDisplay({ hours: 2, months: 1, days: -5 })).toBe("+1 month, -5 days, +2 hours");
  });
});
