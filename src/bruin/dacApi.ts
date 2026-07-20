import * as http from "http";

/**
 * Thin JSON client for the `dac serve` HTTP API. The native dashboard preview
 * (Tier 2) fetches dashboard definitions and query results here — in the
 * extension host — and posts them to the webview, so the Vue renderer never
 * has to reach across the webview's CSP to talk to localhost.
 *
 * See dac's pkg/server for the shapes. We type only the fields the native
 * renderer consumes and keep the rest loose.
 */

export interface DacTableColumn {
  name: string;
  label?: string;
  format?: string;
}

export interface DacWidget {
  name: string;
  description?: string;
  type: string; // metric | chart | table | text | divider | image
  col?: number;
  // metric
  column?: string;
  prefix?: string;
  suffix?: string;
  format?: string;
  value?: string;
  // chart
  chart?: string;
  x?: string;
  y?: string[];
  label?: string;
  stacked?: boolean;
  target?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  // table
  columns?: DacTableColumn[];
  // text
  content?: string;
  // image
  src?: string;
  alt?: string;
}

export interface DacRow {
  tab?: string;
  height?: unknown;
  widgets: DacWidget[];
}

export interface DacFilter {
  name: string;
  type: string;
  multiple?: boolean;
  default?: unknown;
  options?: { values?: string[] } | null;
}

export interface DacDashboard {
  schema?: string;
  name: string;
  description?: string;
  connection?: string;
  filters?: DacFilter[];
  rows: DacRow[];
  file_type?: string;
}

export interface DacResultColumn {
  name: string;
  type?: string;
}

export interface DacWidgetResult {
  columns: DacResultColumn[];
  rows: unknown[][];
  query?: string;
  error?: string;
}

/** Maps widget id (`r{row}-w{widget}`) to its query result. */
export interface DacDashboardData {
  widgets: Record<string, DacWidgetResult>;
}

export interface DacDashboardSummary {
  name: string;
  description?: string;
  connection?: string;
  widget_count?: number;
}

function request<T>(
  baseUrl: string,
  path: string,
  method: "GET" | "POST",
  body?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        timeout: 30000,
        headers: payload
          ? { "Content-Type": "application/json", "Content-Length": payload.length }
          : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`dac API ${method} ${path} → ${status}: ${text.slice(0, 300)}`));
            return;
          }
          try {
            resolve(text ? (JSON.parse(text) as T) : ({} as T));
          } catch (err) {
            reject(new Error(`dac API ${method} ${path}: invalid JSON (${(err as Error).message})`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`dac API ${method} ${path}: timed out`));
    });
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

export async function fetchDashboardList(baseUrl: string): Promise<DacDashboardSummary[]> {
  const res = await request<{ dashboards?: DacDashboardSummary[] }>(
    baseUrl,
    "/api/v1/dashboards",
    "GET"
  );
  return res.dashboards ?? [];
}

export function fetchDashboard(baseUrl: string, name: string): Promise<DacDashboard> {
  return request<DacDashboard>(
    baseUrl,
    `/api/v1/dashboards/${encodeURIComponent(name)}`,
    "GET"
  );
}

export function fetchDashboardData(
  baseUrl: string,
  name: string,
  filters: Record<string, unknown> = {}
): Promise<DacDashboardData> {
  return request<DacDashboardData>(
    baseUrl,
    `/api/v1/dashboards/${encodeURIComponent(name)}/data`,
    "POST",
    { filters }
  );
}
