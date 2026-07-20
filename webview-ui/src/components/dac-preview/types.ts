// Mirrors the shapes the extension posts from dac's JSON API (src/bruin/dacApi.ts).

export interface DacTableColumn {
  name: string;
  label?: string;
  format?: string;
}

export interface DacWidget {
  name: string;
  description?: string;
  type: string;
  col?: number;
  column?: string;
  prefix?: string;
  suffix?: string;
  format?: string;
  value?: string;
  chart?: string;
  x?: string;
  y?: string[];
  label?: string;
  stacked?: boolean;
  // gauge / candlestick fields
  target?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  columns?: DacTableColumn[];
  content?: string;
  src?: string;
  alt?: string;
}

export interface DacRow {
  tab?: string;
  widgets: DacWidget[];
}

export interface DacFilter {
  name: string;
  type: string;
  default?: unknown;
}

export interface DacDashboard {
  name: string;
  description?: string;
  connection?: string;
  filters?: DacFilter[];
  rows: DacRow[];
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

export interface DacDashboardData {
  widgets: Record<string, DacWidgetResult>;
}

/** Widget id used by dac's data endpoint: r{rowIndex}-w{widgetIndex}. */
export function widgetId(rowIndex: number, widgetIndex: number): string {
  return `r${rowIndex}-w${widgetIndex}`;
}
