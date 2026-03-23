import * as vscode from "vscode";
import {
  BackfillConfig,
  BackfillInterval,
  IntervalUnit,
} from "./backfillTypes";
import {
  createIntegratedTerminal,
  escapeFilePath,
} from "./bruinUtils";
import { getBruinExecutablePath } from "../providers/BruinExecutableService";

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

    // Clamp to endDate
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
 * Formats a date for display (YYYY-MM-DD HH:mm)
 */
function formatDateForDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toISOString().replace("T", " ").substring(0, 16);
}

/**
 * Runs a backfill operation by sending commands to the integrated terminal.
 * Each interval runs sequentially with status output.
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

  const terminal = await createIntegratedTerminal(undefined);
  const bruinExecutable = getBruinExecutablePath();

  const executable = ((terminal.creationOptions as vscode.TerminalOptions).shellPath?.includes("bash"))
    ? "bruin"
    : bruinExecutable;

  const escapedAssetPath = escapeFilePath(config.assetPath);

  // Show terminal
  terminal.show(true);

  // Send header
  terminal.sendText(`echo ""`);
  terminal.sendText(`echo "============================================================"`);
  terminal.sendText(`echo "BACKFILL STARTED"`);
  terminal.sendText(`echo "============================================================"`);
  terminal.sendText(`echo "Asset: ${escapedAssetPath}"`);
  terminal.sendText(`echo "Date Range: ${formatDateForDisplay(config.startDate)} to ${formatDateForDisplay(config.endDate)}"`);
  terminal.sendText(`echo "Interval: ${config.intervalSize} ${config.intervalUnit}(s)"`);
  terminal.sendText(`echo "Total Jobs: ${intervals.length}"`);
  terminal.sendText(`echo "============================================================"`);
  terminal.sendText(`echo ""`);

  // Run each interval command
  for (const interval of intervals) {
    const jobNum = interval.index + 1;
    const totalJobs = intervals.length;

    // Build the bruin run command for this interval
    let runCmd = `${executable} run`;
    runCmd += ` --start-date ${interval.startDate}`;
    runCmd += ` --end-date ${interval.endDate}`;

    if (config.environment) {
      runCmd += ` --environment ${config.environment}`;
    }

    if (config.flags) {
      runCmd += ` ${config.flags}`;
    }

    runCmd += ` ${escapedAssetPath}`;

    // Echo job info and run the command
    terminal.sendText(`echo "[${jobNum}/${totalJobs}] Running: ${formatDateForDisplay(interval.startDate)} to ${formatDateForDisplay(interval.endDate)}"`);
    terminal.sendText(runCmd);
  }

  // Send summary header (will appear after all jobs complete)
  terminal.sendText(`echo ""`);
  terminal.sendText(`echo "============================================================"`);
  terminal.sendText(`echo "BACKFILL COMPLETE - ${intervals.length} jobs executed"`);
  terminal.sendText(`echo "============================================================"`);
  terminal.sendText(`echo ""`);
}

/**
 * Estimates the number of jobs for a given backfill configuration
 */
export function estimateBackfillJobs(config: Omit<BackfillConfig, 'assetPath'>): number {
  const intervals = splitIntervals(
    new Date(config.startDate),
    new Date(config.endDate),
    config.intervalUnit,
    config.intervalSize
  );
  return intervals.length;
}
