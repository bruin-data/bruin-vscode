import * as fs from "fs";
import * as path from "path";
import type { BackfillChunk } from "./bruinUtils";
import { BackfillManifest } from "../types/runLog";

export const BACKFILL_LOGS_DIR = "logs/backfills";

/**
 * Pads a number to two digits for the timestamp-based backfill id.
 */
const pad = (n: number): string => String(n).padStart(2, "0");

/**
 * Derives a human-readable, collision-resistant backfill id from the launch
 * time and the asset's file name, e.g. `bf_2026_06_09_12_00_00_backfill_demo`.
 */
export const buildBackfillId = (startedAt: Date, assetPath: string): string => {
  const ts = [
    startedAt.getUTCFullYear(),
    pad(startedAt.getUTCMonth() + 1),
    pad(startedAt.getUTCDate()),
    pad(startedAt.getUTCHours()),
    pad(startedAt.getUTCMinutes()),
    pad(startedAt.getUTCSeconds()),
  ].join("_");
  const base = path
    .basename(assetPath)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_");
  return `bf_${ts}_${base}`;
};

/**
 * Parses `--environment <env>` out of a flags string, if present.
 */
export const extractEnvironment = (flags?: string): string | undefined => {
  if (!flags) return undefined;
  const match = flags.match(/--environment\s+(\S+)/);
  return match ? match[1] : undefined;
};

/**
 * Builds the manifest describing a launched backfill. Pure given its inputs so
 * it can be unit-tested; the timestamp is supplied by the caller.
 */
export const buildBackfillManifest = (opts: {
  assetPath: string;
  chunks: BackfillChunk[];
  stopOnFailure: boolean;
  flags?: string;
  startedAt: Date;
}): BackfillManifest => {
  return {
    backfillId: buildBackfillId(opts.startedAt, opts.assetPath),
    assetPath: opts.assetPath,
    environment: extractEnvironment(opts.flags),
    stopOnFailure: opts.stopOnFailure,
    startedAt: opts.startedAt.toISOString(),
    chunks: opts.chunks.map((c) => ({ start: c.start, end: c.end })),
  };
};

/**
 * Writes a backfill manifest under logs/backfills/ in the given workspace root.
 * Best-effort: failures are swallowed so a manifest write never blocks the run.
 */
export const writeBackfillManifest = async (
  workspaceRoot: string,
  manifest: BackfillManifest
): Promise<void> => {
  try {
    const dir = path.join(workspaceRoot, BACKFILL_LOGS_DIR);
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${manifest.backfillId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write backfill manifest:", error);
  }
};
