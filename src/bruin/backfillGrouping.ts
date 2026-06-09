import { RunSummary, RunStatus, BackfillManifest } from "../types/runLog";

/**
 * Normalizes a path for comparison: forward slashes, lowercased, unquoted.
 * The run log's runPath comes from the shell-parsed cmdline while the manifest
 * stores the raw fsPath, so they may differ only in separators/casing.
 */
const normalizePath = (p?: string): string =>
  (p || "").replace(/^"|"$/g, "").replace(/\\/g, "/").toLowerCase();

/**
 * Parses an ISO timestamp to epoch millis. Run logs carry a local UTC offset
 * (e.g. `…+02:00`) while manifest.startedAt is UTC `…Z`, so timestamps must be
 * compared as instants — a lexicographic string compare is wrong across offsets.
 */
const toMillis = (ts?: string): number => {
  const t = new Date(ts || "").getTime();
  return isNaN(t) ? 0 : t;
};

/**
 * Returns true if a per-chunk run log matches a manifest chunk: same asset,
 * exact window, and run happened at or after the backfill was launched.
 */
const runMatchesChunk = (
  run: RunSummary,
  manifest: BackfillManifest,
  chunk: { start: string; end: string }
): boolean => {
  return (
    normalizePath(run.runPath) === normalizePath(manifest.assetPath) &&
    run.startDate === chunk.start &&
    run.endDate === chunk.end &&
    toMillis(run.timestamp) >= toMillis(manifest.startedAt)
  );
};

const rollUpStatus = (children: RunSummary[]): RunStatus => {
  if (children.some((c) => c.status === "failed")) return "failed";
  if (children.some((c) => c.status === "pending" || c.status === "running")) return "running";
  return "succeeded";
};

/**
 * Groups per-chunk run logs under their backfill manifest, emitting one
 * "backfill" RunSummary per manifest (with the chunk runs as `children`) and
 * leaving all unrelated runs untouched.
 *
 * Pure: takes the flat run list and the manifests, returns the regrouped list
 * sorted by timestamp descending. Manifests are processed newest-first and each
 * run is claimed at most once, so an identical window run later stays separate.
 */
export const groupBackfillRuns = (
  runs: RunSummary[],
  manifests: BackfillManifest[]
): RunSummary[] => {
  const consumed = new Set<string>(); // run filePath (unique per run log)
  const backfills: RunSummary[] = [];

  const sortedManifests = [...manifests].sort((a, b) => toMillis(b.startedAt) - toMillis(a.startedAt));

  for (const manifest of sortedManifests) {
    const children: RunSummary[] = [];
    let matchedCount = 0;

    for (const chunk of manifest.chunks) {
      const match = runs
        .filter((r) => !consumed.has(r.filePath))
        .filter((r) => runMatchesChunk(r, manifest, chunk))
        .sort((a, b) => toMillis(a.timestamp) - toMillis(b.timestamp))[0];

      if (match) {
        consumed.add(match.filePath);
        matchedCount++;
        children.push({ ...match, kind: "run" });
      } else {
        // Chunk hasn't produced a run log yet (not started, or still running).
        children.push({
          runId: `${manifest.backfillId}:${chunk.start}`,
          pipeline: "",
          timestamp: manifest.startedAt,
          status: "pending",
          totalAssets: 0,
          succeededAssets: 0,
          failedAssets: 0,
          environment: manifest.environment || "",
          filePath: "",
          startDate: chunk.start,
          endDate: chunk.end,
          kind: "run",
        });
      }
    }

    const ranChildren = children.filter((c) => c.status !== "pending");
    const pipeline = ranChildren.find((c) => c.pipeline)?.pipeline || "";
    const latestTimestamp = ranChildren.reduce(
      (acc, c) => (toMillis(c.timestamp) > toMillis(acc) ? c.timestamp : acc),
      manifest.startedAt
    );
    const succeededChunks = children.filter((c) => c.status === "succeeded").length;
    const failedChunks = children.filter((c) => c.status === "failed").length;

    backfills.push({
      runId: manifest.backfillId,
      pipeline,
      timestamp: latestTimestamp,
      status: rollUpStatus(children),
      totalAssets: manifest.chunks.length,
      succeededAssets: succeededChunks,
      failedAssets: failedChunks,
      environment: manifest.environment || ranChildren[0]?.environment || "",
      filePath: "",
      runPath: manifest.assetPath,
      kind: "backfill",
      children,
      backfill: {
        backfillId: manifest.backfillId,
        startedAt: manifest.startedAt,
        totalChunks: manifest.chunks.length,
        completedChunks: matchedCount,
      },
    });
  }

  const remaining = runs.filter((r) => !consumed.has(r.filePath));
  return [...remaining, ...backfills].sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp));
};
