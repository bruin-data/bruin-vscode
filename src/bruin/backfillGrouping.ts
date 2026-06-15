import { RunSummary, RunStatus } from "../types/runLog";

/**
 * Parses an ISO timestamp to epoch millis. Run logs carry a local UTC offset
 * (e.g. `…+02:00`), so timestamps must be compared as instants — a lexicographic
 * string compare is wrong across offsets.
 */
const toMillis = (ts?: string): number => {
  const t = new Date(ts || "").getTime();
  return isNaN(t) ? 0 : t;
};

const rollUpStatus = (children: RunSummary[], complete: boolean): RunStatus => {
  const hasFailed = children.some((c) => c.status === "failed");
  // Still missing chunks → running, unless a failure already settled it
  // (stop-on-failure halts the rest; the user re-runs to continue).
  if (hasFailed) {
    return "failed";
  }
  return complete ? "succeeded" : "running";
};

/**
 * Groups per-chunk run logs of a local backfill into one "backfill" RunSummary,
 * keyed off the `backfillId` the CLI stamps into each chunk's run log
 * (`bruin run --backfill-id`). All non-backfill runs pass through untouched.
 *
 * Pure: takes the flat run list, returns the regrouped list sorted by instant
 * descending. No manifest, no window-matching, no collision inference — each
 * chunk keeps its own (collision-free) log, so the group is exact.
 */
export const groupBackfillRuns = (runs: RunSummary[]): RunSummary[] => {
  const groups = new Map<string, RunSummary[]>();
  const passthrough: RunSummary[] = [];

  for (const run of runs) {
    if (run.backfillId) {
      const existing = groups.get(run.backfillId);
      if (existing) {
        existing.push(run);
      } else {
        groups.set(run.backfillId, [run]);
      }
    } else {
      passthrough.push(run);
    }
  }

  const backfills: RunSummary[] = [];
  for (const [backfillId, rawChildren] of groups) {
    // Children newest-window first for display; mark them as plain runs.
    const children = rawChildren
      .map((c) => ({ ...c, kind: "run" as const }))
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

    // backfill_total gives the planned chunk count; fall back to what we see.
    const totalChunks = Math.max(
      rawChildren.reduce((m, c) => Math.max(m, c.backfillTotal ?? 0), 0),
      children.length
    );
    const completedChunks = children.length;
    const complete = completedChunks >= totalChunks;

    const succeededChunks = children.filter((c) => c.status === "succeeded").length;
    const failedChunks = children.filter((c) => c.status === "failed").length;
    const latestTimestamp = children.reduce(
      (acc, c) => (toMillis(c.timestamp) > toMillis(acc) ? c.timestamp : acc),
      children[0]?.timestamp || ""
    );

    backfills.push({
      runId: backfillId,
      pipeline: children.find((c) => c.pipeline)?.pipeline || "",
      timestamp: latestTimestamp,
      status: rollUpStatus(children, complete),
      totalAssets: totalChunks,
      succeededAssets: succeededChunks,
      failedAssets: failedChunks,
      environment: children[0]?.environment || "",
      filePath: "",
      runPath: children[0]?.runPath,
      kind: "backfill",
      children,
      backfill: { backfillId, totalChunks, completedChunks },
    });
  }

  return [...passthrough, ...backfills].sort(
    (a, b) => toMillis(b.timestamp) - toMillis(a.timestamp)
  );
};
