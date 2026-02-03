/* eslint-disable @typescript-eslint/naming-convention */
// Types for bruin run log JSON files stored in logs/runs/<pipeline>/<run_id>.json

export interface RunLogParameters {
  downstream: boolean;
  startDate: string;
  endDate: string;
  workers: number;
  environment: string;
  force: boolean;
  pushMetadata: boolean;
  noLogFile: boolean;
  fullRefresh: boolean;
  useUV: boolean;
  tag: string;
  excludeTag: string;
  only: string[];
  output: string;
  configFilePath: string;
  sensorMode: string;
  applyIntervalModifiers: boolean;
  annotations: string;
}

export interface RunLogMetadata {
  version: string;
  os: string;
}

export type AssetRunStatus = "succeeded" | "failed" | "running" | "pending";

export interface AssetRunState {
  name: string;
  status: AssetRunStatus;
}

export interface RunLog {
  parameters: RunLogParameters;
  metadata: RunLogMetadata;
  state: AssetRunState[];
  version: string;
  timestamp: string;
  run_id: string;
  compatibility_hash: string;
}

export type RunStatus = "succeeded" | "failed" | "running";

export interface RunSummary {
  runId: string;
  pipeline: string;
  timestamp: string;
  status: RunStatus;
  totalAssets: number;
  succeededAssets: number;
  failedAssets: number;
  environment: string;
  filePath: string;
  duration?: string;
}

// Types for the new -o json output from bruin run
export interface RunJSONOutput {
  run_id: string;
  pipeline: string;
  start_date: string;
  end_date: string;
  environment: string;
  status: "success" | "failed";
  duration: string;
  timestamp: string;
  summary: {
    total_tasks: number;
    successful_tasks: number;
    failed_tasks: number;
    skipped_tasks: number;
  };
  assets: RunJSONAsset[];
}

export interface RunJSONAsset {
  name: string;
  type: string;
  status: "success" | "failed" | "skipped" | "upstream_failed";
  error?: string;
  checks?: RunJSONCheck[];
}

export interface RunJSONCheck {
  name: string;
  type: "column" | "custom";
  status: "success" | "failed";
  error?: string;
}

// Helper to convert RunJSONOutput to RunSummary
export function runJSONToSummary(json: RunJSONOutput): RunSummary {
  return {
    runId: json.run_id,
    pipeline: json.pipeline,
    timestamp: json.timestamp,
    status: json.status === "success" ? "succeeded" : "failed",
    totalAssets: json.summary.total_tasks,
    succeededAssets: json.summary.successful_tasks,
    failedAssets: json.summary.failed_tasks,
    environment: json.environment,
    filePath: "",
    duration: json.duration,
  };
}
