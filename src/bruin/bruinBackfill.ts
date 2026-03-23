import * as vscode from "vscode";
import {
  BackfillConfig,
  BackfillInterval,
  IntervalUnit,
} from "./backfillTypes";
import { getBruinExecutablePath } from "../providers/BruinExecutableService";
import { createIntegratedTerminal, escapeFilePath, shouldUseUnixFormatting } from "./bruinUtils";

/**
 * Advances a date by the specified interval unit and size
 */
function advanceDate(date: Date, unit: IntervalUnit, size: number): Date {
  const result = new Date(date);
  switch (unit) {
    case "hour":
      result.setHours(result.getHours() + size);
      break;
    case "day":
      result.setDate(result.getDate() + size);
      break;
    case "week":
      result.setDate(result.getDate() + size * 7);
      break;
    case "month":
      result.setMonth(result.getMonth() + size);
      break;
    case "year":
      result.setFullYear(result.getFullYear() + size);
      break;
  }
  return result;
}

/**
 * Splits a date range into intervals based on the specified unit and size
 */
export function splitIntervals(
  startDate: Date,
  endDate: Date,
  intervalUnit: IntervalUnit,
  intervalSize: number
): BackfillInterval[] {
  const intervals: BackfillInterval[] = [];
  let current = new Date(startDate);
  let index = 0;

  while (current < endDate) {
    const intervalStart = new Date(current);
    const intervalEnd = advanceDate(current, intervalUnit, intervalSize);
    const effectiveEnd = intervalEnd > endDate ? endDate : intervalEnd;

    intervals.push({
      index,
      startDate: intervalStart.toISOString(),
      endDate: effectiveEnd.toISOString(),
    });

    current = intervalEnd;
    index++;
  }

  return intervals;
}

/**
 * Runs a backfill operation in the integrated terminal
 */
export async function runBackfillInTerminal(config: BackfillConfig): Promise<void> {
  const intervals = splitIntervals(
    new Date(config.startDate),
    new Date(config.endDate),
    config.intervalUnit,
    config.intervalSize
  );

  if (intervals.length === 0) {
    vscode.window.showWarningMessage("No intervals to process for backfill");
    return;
  }

  const bruinExecutable = getBruinExecutablePath();
  const escapedAssetPath = escapeFilePath(config.assetPath);
  const terminal = await createIntegratedTerminal(undefined);

  const useUnixFormatting = shouldUseUnixFormatting(terminal);
  const executable = ((terminal.creationOptions as vscode.TerminalOptions).shellPath?.includes("bash"))
    ? "bruin"
    : bruinExecutable;

  // Build commands for each interval
  const commands: string[] = [];

  for (const interval of intervals) {
    const args = ["run"];

    args.push("--start-date", interval.startDate);
    args.push("--end-date", interval.endDate);

    if (config.environment) {
      args.push("--environment", config.environment);
    }

    args.push(escapedAssetPath);

    commands.push(`${executable} ${args.join(" ")}`);
  }

  // Join commands with && so they run sequentially
  const fullCommand = commands.join(" && ");

  terminal.show(true);
  terminal.sendText(" ");

  setTimeout(() => {
    terminal.sendText(fullCommand);
  }, 500);
}

// Keep alias for compatibility
export const runBackfillWithProgress = runBackfillInTerminal;

/**
 * Estimates the number of jobs for a given backfill configuration
 */
export function estimateBackfillJobs(config: Omit<BackfillConfig, "assetPath">): number {
  const intervals = splitIntervals(
    new Date(config.startDate),
    new Date(config.endDate),
    config.intervalUnit,
    config.intervalSize
  );
  return intervals.length;
}

/**
 * Cancels the current backfill operation (no-op for terminal approach)
 */
export function cancelBackfill(): void {
  // For terminal approach, user can press Ctrl+C in the terminal
  vscode.window.showInformationMessage("Press Ctrl+C in the terminal to cancel the backfill");
}
