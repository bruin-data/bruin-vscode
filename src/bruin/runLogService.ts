import * as fs from "fs";
import * as path from "path";
import { RunLog, RunSummary, RunStatus, BackfillManifest } from "../types/runLog";
import { groupBackfillRuns } from "./backfillGrouping";
import { BACKFILL_LOGS_DIR } from "./backfillManifest";

const LOGS_DIR = "logs/runs";
// Cap how many manifests are loaded (most-recent by mtime) so old backfills
// whose chunk logs have aged out don't accumulate as stale "running" rows.
const MAX_BACKFILL_MANIFESTS = 25;

export class RunLogService {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  private getLogsPath(): string {
    return path.join(this.workspaceRoot, LOGS_DIR);
  }

  async getPipelines(): Promise<string[]> {
    const logsPath = this.getLogsPath();
    try {
      const entries = await fs.promises.readdir(logsPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  async getRunsForPipeline(pipeline: string, limit = 20): Promise<RunSummary[]> {
    const pipelinePath = path.join(this.getLogsPath(), pipeline);
    try {
      const files = await fs.promises.readdir(pipelinePath);
      // Gather extra so chunk runs aren't truncated before grouping.
      const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, limit * 4);

      const runs: RunSummary[] = [];
      for (const file of jsonFiles) {
        const summary = await this.getRunSummary(pipeline, file);
        if (summary) {runs.push(summary);}
      }
      const manifests = await this.getBackfillManifests();
      return groupBackfillRuns(runs, manifests).slice(0, limit);
    } catch {
      return [];
    }
  }

  async getAllRuns(limit = 50): Promise<RunSummary[]> {
    const pipelines = await this.getPipelines();
    const allRuns: RunSummary[] = [];

    for (const pipeline of pipelines) {
      // Gather raw (ungrouped) runs per pipeline, then group across the full set.
      const runs = await this.getRawRunsForPipeline(pipeline, limit * 4);
      allRuns.push(...runs);
    }

    const manifests = await this.getBackfillManifests();
    // groupBackfillRuns already returns sorted by instant (toMillis); no second sort.
    return groupBackfillRuns(allRuns, manifests).slice(0, limit);
  }

  private async getRawRunsForPipeline(pipeline: string, limit: number): Promise<RunSummary[]> {
    const pipelinePath = path.join(this.getLogsPath(), pipeline);
    try {
      const files = await fs.promises.readdir(pipelinePath);
      const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse().slice(0, limit);
      const runs: RunSummary[] = [];
      for (const file of jsonFiles) {
        const summary = await this.getRunSummary(pipeline, file);
        if (summary) {runs.push(summary);}
      }
      return runs;
    } catch {
      return [];
    }
  }

  private async getRunSummary(pipeline: string, fileName: string): Promise<RunSummary | null> {
    const filePath = path.join(this.getLogsPath(), pipeline, fileName);
    try {
      const content = await fs.promises.readFile(filePath, "utf-8");
      const log: RunLog = JSON.parse(content);
      return this.parseRunLog(log, pipeline, filePath);
    } catch {
      return null;
    }
  }

  async getRunDetails(filePath: string): Promise<RunLog | null> {
    try {
      const content = await fs.promises.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private parseRunLog(log: RunLog, pipeline: string, filePath: string): RunSummary {
    const succeeded = log.state.filter((a) => a.status === "succeeded").length;
    const failed = log.state.filter((a) => a.status === "failed").length;
    const status: RunStatus = failed > 0 ? "failed" : "succeeded";

    // Extract active flags
    const flags: string[] = [];
    const params = log.parameters;
    if (params.downstream) flags.push("downstream");
    if (params.fullRefresh) flags.push("full-refresh");
    if (params.force) flags.push("force");
    if (params.pushMetadata) flags.push("push-metadata");
    if (params.applyIntervalModifiers) flags.push("interval-modifiers");
    if (params.tag) flags.push(`tag:${params.tag}`);
    if (params.excludeTag) flags.push(`exclude:${params.excludeTag}`);
    if (params.only && params.only.length > 0) flags.push(`${params.only.length} assets`);

    // Extract run path from cmdline (last argument is the asset/pipeline path)
    let runPath: string | undefined;
    if (log.cmdline && log.cmdline.length > 0) {
      const lastArg = log.cmdline[log.cmdline.length - 1];
      if (lastArg && !lastArg.startsWith("-")) {
        runPath = lastArg;
      }
    }

    return {
      runId: log.run_id,
      pipeline,
      timestamp: log.timestamp,
      status,
      totalAssets: log.state.length,
      succeededAssets: succeeded,
      failedAssets: failed,
      environment: log.parameters.environment,
      filePath,
      flags: flags.length > 0 ? flags : undefined,
      runPath,
      startDate: params.startDate,
      endDate: params.endDate,
    };
  }

  async getBackfillManifests(): Promise<BackfillManifest[]> {
    const dir = path.join(this.workspaceRoot, BACKFILL_LOGS_DIR);
    try {
      const jsonFiles = (await fs.promises.readdir(dir)).filter((f) => f.endsWith(".json"));

      // Keep only the most-recent manifests by mtime. Old backfills whose chunk
      // logs have aged out of the run-read window would otherwise resurface as
      // stale all-"pending"/"running" rows and eat into the display limit.
      const withMtime = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const stat = await fs.promises.stat(path.join(dir, file));
            return { file, mtime: stat.mtimeMs };
          } catch {
            return { file, mtime: 0 };
          }
        })
      );
      const recent = withMtime
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, MAX_BACKFILL_MANIFESTS);

      const manifests: BackfillManifest[] = [];
      for (const { file } of recent) {
        try {
          const content = await fs.promises.readFile(path.join(dir, file), "utf-8");
          manifests.push(JSON.parse(content));
        } catch {
          // skip malformed manifest
        }
      }
      return manifests;
    } catch {
      return [];
    }
  }

  getLogsDirectory(): string {
    return this.getLogsPath();
  }
}
