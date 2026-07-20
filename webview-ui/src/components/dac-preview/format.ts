import type { DacResultColumn } from "./types";

/** Index of the column whose name matches `name` (case-insensitive), else -1. */
export function columnIndex(columns: DacResultColumn[], name?: string): number {
  if (!name) {
    return -1;
  }
  const lower = name.toLowerCase();
  return columns.findIndex((c) => c.name.toLowerCase() === lower);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Formats a raw cell for display. `format` follows dac's widget formats
 * (number | currency | percent | date); anything else falls back to a string.
 */
export function formatValue(value: unknown, format?: string): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const num = typeof value === "string" ? Number(value) : value;
  switch (format) {
    case "currency":
      if (isFiniteNumber(num)) {
        return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
      }
      break;
    case "percent":
      if (isFiniteNumber(num)) {
        return `${(num * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
      }
      break;
    case "number":
      if (isFiniteNumber(num)) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      break;
    case "date":
      return String(value);
    default:
      if (isFiniteNumber(num) && typeof value === "number") {
        return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
      }
  }
  return String(value);
}

/** Coerces a cell to a finite number for charting, or null if not numeric. */
export function toNumber(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  return isFiniteNumber(num) ? num : null;
}
