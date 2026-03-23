import { suite, test, expect, describe } from "vitest";
import {
  parseIntervalModifier,
  applyModifierToDate,
  formatModifierForDisplay,
} from "../utilities/intervalModifiers";
import { DateTime } from "luxon";

describe("parseIntervalModifier", () => {
  test("returns null for undefined/null", () => {
    expect(parseIntervalModifier(undefined)).toBeNull();
    expect(parseIntervalModifier(null)).toBeNull();
  });

  test("returns null for zero number", () => {
    expect(parseIntervalModifier(0)).toBeNull();
  });

  test("parses number as cron_periods", () => {
    expect(parseIntervalModifier(5)).toEqual({ value: 5, unit: "periods" });
    expect(parseIntervalModifier(-3)).toEqual({ value: -3, unit: "periods" });
  });

  test("parses string format with days", () => {
    expect(parseIntervalModifier("-13d")).toEqual({ value: -13, unit: "d" });
    expect(parseIntervalModifier("5d")).toEqual({ value: 5, unit: "d" });
  });

  test("parses string format with hours", () => {
    expect(parseIntervalModifier("-2h")).toEqual({ value: -2, unit: "h" });
    expect(parseIntervalModifier("24h")).toEqual({ value: 24, unit: "h" });
  });

  test("parses string format with weeks", () => {
    expect(parseIntervalModifier("-1w")).toEqual({ value: -1, unit: "w" });
    expect(parseIntervalModifier("2w")).toEqual({ value: 2, unit: "w" });
  });

  test("parses string format with months (M)", () => {
    expect(parseIntervalModifier("-1M")).toEqual({ value: -1, unit: "m" });
    expect(parseIntervalModifier("3M")).toEqual({ value: 3, unit: "m" });
  });

  test("parses string format with minutes (m)", () => {
    expect(parseIntervalModifier("-30m")).toEqual({ value: -30, unit: "m" });
  });

  test("returns null for invalid string", () => {
    expect(parseIntervalModifier("invalid")).toBeNull();
    expect(parseIntervalModifier("13")).toBeNull();
    expect(parseIntervalModifier("d13")).toBeNull();
  });

  test("parses object format with days", () => {
    expect(parseIntervalModifier({ days: -13 })).toEqual({ value: -13, unit: "d" });
    expect(parseIntervalModifier({ days: 5 })).toEqual({ value: 5, unit: "d" });
  });

  test("parses object format with hours", () => {
    expect(parseIntervalModifier({ hours: -2 })).toEqual({ value: -2, unit: "h" });
    expect(parseIntervalModifier({ hours: 24 })).toEqual({ value: 24, unit: "h" });
  });

  test("parses object format with months", () => {
    expect(parseIntervalModifier({ months: -1 })).toEqual({ value: -1, unit: "m" });
  });

  test("parses object format with minutes", () => {
    expect(parseIntervalModifier({ minutes: -30 })).toEqual({ value: -30, unit: "min" });
  });

  test("parses object format with seconds", () => {
    expect(parseIntervalModifier({ seconds: -60 })).toEqual({ value: -60, unit: "s" });
  });

  test("parses object format with cron_periods", () => {
    expect(parseIntervalModifier({ cron_periods: 2 })).toEqual({ value: 2, unit: "periods" });
  });

  test("returns null for object with zero value", () => {
    expect(parseIntervalModifier({ days: 0 })).toBeNull();
    expect(parseIntervalModifier({ hours: 0, days: 0 })).toBeNull();
  });

  test("returns first non-zero unit from object", () => {
    expect(parseIntervalModifier({ days: 0, hours: 5 })).toEqual({ value: 5, unit: "h" });
  });
});

describe("applyModifierToDate", () => {
  const baseDate = "2025-03-15T12:00:00.000Z";

  test("applies days modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -13, unit: "d" });
    expect(result.toISO()).toBe("2025-03-02T12:00:00.000Z");
  });

  test("applies positive days modifier", () => {
    const result = applyModifierToDate(baseDate, { value: 5, unit: "d" });
    expect(result.toISO()).toBe("2025-03-20T12:00:00.000Z");
  });

  test("applies hours modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -2, unit: "h" });
    expect(result.toISO()).toBe("2025-03-15T10:00:00.000Z");
  });

  test("applies weeks modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -1, unit: "w" });
    expect(result.toISO()).toBe("2025-03-08T12:00:00.000Z");
  });

  test("applies months modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -1, unit: "m" });
    expect(result.toISO()).toBe("2025-02-15T12:00:00.000Z");
  });

  test("applies minutes modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -30, unit: "min" });
    expect(result.toISO()).toBe("2025-03-15T11:30:00.000Z");
  });

  test("applies seconds modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -60, unit: "s" });
    expect(result.toISO()).toBe("2025-03-15T11:59:00.000Z");
  });

  test("periods modifier returns unchanged date", () => {
    const result = applyModifierToDate(baseDate, { value: 2, unit: "periods" });
    expect(result.toISO()).toBe("2025-03-15T12:00:00.000Z");
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
});
