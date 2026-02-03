import * as fs from "fs";
import * as path from "path";
import { RunLog, RunSummary, RunStatus } from "../types/runLog";

const LOGS_DIR = "logs/runs";

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

  async getAllRuns(limit = 50): Promise<RunSummary[]> {
    const pipelines = await this.getPipelines();
    const allRuns: RunSummary[] = [];

    for (const pipeline of pipelines) {
      const runs = await this.getRunsForPipeline(pipeline, limit);
      allRuns.push(...runs);
    }

    return allRuns.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
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
    };
  }

  getLogsDirectory(): string {
    return this.getLogsPath();
  }
}
