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

  test("returns null for empty string", () => {
    expect(parseIntervalModifier("")).toBeNull();
  });

  test("parses days", () => {
    expect(parseIntervalModifier("-13d")).toEqual({ value: -13, unit: "days" });
    expect(parseIntervalModifier("5d")).toEqual({ value: 5, unit: "days" });
  });

  test("parses hours", () => {
    expect(parseIntervalModifier("-2h")).toEqual({ value: -2, unit: "hours" });
    expect(parseIntervalModifier("24h")).toEqual({ value: 24, unit: "hours" });
  });

  test("parses minutes", () => {
    expect(parseIntervalModifier("-30m")).toEqual({ value: -30, unit: "minutes" });
    expect(parseIntervalModifier("15m")).toEqual({ value: 15, unit: "minutes" });
  });

  test("parses seconds", () => {
    expect(parseIntervalModifier("-60s")).toEqual({ value: -60, unit: "seconds" });
    expect(parseIntervalModifier("30s")).toEqual({ value: 30, unit: "seconds" });
  });

  test("parses months (uppercase M)", () => {
    expect(parseIntervalModifier("-1M")).toEqual({ value: -1, unit: "months" });
    expect(parseIntervalModifier("3M")).toEqual({ value: 3, unit: "months" });
  });

  test("parses milliseconds (two-char suffix)", () => {
    expect(parseIntervalModifier("500ms")).toEqual({ value: 500, unit: "milliseconds" });
    expect(parseIntervalModifier("-100ms")).toEqual({ value: -100, unit: "milliseconds" });
  });

  test("parses nanoseconds (two-char suffix)", () => {
    expect(parseIntervalModifier("1000ns")).toEqual({ value: 1000, unit: "nanoseconds" });
    expect(parseIntervalModifier("-500ns")).toEqual({ value: -500, unit: "nanoseconds" });
  });

  test("returns null for invalid format", () => {
    expect(parseIntervalModifier("invalid")).toBeNull();
    expect(parseIntervalModifier("13")).toBeNull();
    expect(parseIntervalModifier("d13")).toBeNull();
    expect(parseIntervalModifier("13x")).toBeNull();
  });

  test("returns null for non-string input", () => {
    // @ts-expect-error Testing invalid input
    expect(parseIntervalModifier(123)).toBeNull();
    // @ts-expect-error Testing invalid input
    expect(parseIntervalModifier({ days: -13 })).toBeNull();
  });
});

describe("applyModifierToDate", () => {
  const baseDate = "2025-03-15T12:00:00.000Z";

  test("applies days modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -13, unit: "days" });
    expect(result.toISO()).toBe("2025-03-02T12:00:00.000Z");
  });

  test("applies positive days modifier", () => {
    const result = applyModifierToDate(baseDate, { value: 5, unit: "days" });
    expect(result.toISO()).toBe("2025-03-20T12:00:00.000Z");
  });

  test("applies hours modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -2, unit: "hours" });
    expect(result.toISO()).toBe("2025-03-15T10:00:00.000Z");
  });

  test("applies months modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -1, unit: "months" });
    expect(result.toISO()).toBe("2025-02-15T12:00:00.000Z");
  });

  test("applies minutes modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -30, unit: "minutes" });
    expect(result.toISO()).toBe("2025-03-15T11:30:00.000Z");
  });

  test("applies seconds modifier", () => {
    const result = applyModifierToDate(baseDate, { value: -60, unit: "seconds" });
    expect(result.toISO()).toBe("2025-03-15T11:59:00.000Z");
  });

  test("applies milliseconds modifier", () => {
    const result = applyModifierToDate(baseDate, { value: 500, unit: "milliseconds" });
    expect(result.toISO()).toBe("2025-03-15T12:00:00.500Z");
  });
});

describe("formatModifierForDisplay", () => {
  test("returns empty string for null/undefined", () => {
    expect(formatModifierForDisplay(undefined)).toBe("");
    expect(formatModifierForDisplay(null)).toBe("");
  });

  test("formats negative days", () => {
    expect(formatModifierForDisplay("-13d")).toBe("-13 days");
  });

  test("formats positive days with plus sign", () => {
    expect(formatModifierForDisplay("5d")).toBe("+5 days");
  });

  test("formats singular day", () => {
    expect(formatModifierForDisplay("1d")).toBe("+1 day");
    expect(formatModifierForDisplay("-1d")).toBe("-1 day");
  });

  test("formats hours", () => {
    expect(formatModifierForDisplay("-2h")).toBe("-2 hours");
    expect(formatModifierForDisplay("1h")).toBe("+1 hour");
  });

  test("formats minutes", () => {
    expect(formatModifierForDisplay("-30m")).toBe("-30 minutes");
    expect(formatModifierForDisplay("1m")).toBe("+1 minute");
  });

  test("formats months", () => {
    expect(formatModifierForDisplay("-1M")).toBe("-1 month");
    expect(formatModifierForDisplay("3M")).toBe("+3 months");
  });

  test("formats milliseconds", () => {
    expect(formatModifierForDisplay("500ms")).toBe("+500 milliseconds");
    expect(formatModifierForDisplay("-100ms")).toBe("-100 milliseconds");
  });

  test("formats nanoseconds", () => {
    expect(formatModifierForDisplay("1000ns")).toBe("+1000 nanoseconds");
    expect(formatModifierForDisplay("-1ns")).toBe("-1 nanosecond");
  });
});
