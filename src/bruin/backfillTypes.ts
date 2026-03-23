export type IntervalUnit = 'hour' | 'day' | 'week' | 'month' | 'year';

export interface BackfillConfig {
  startDate: string;
  endDate: string;
  intervalUnit: IntervalUnit;
  intervalSize: number;
  environment?: string;
  flags?: string;
  assetPath: string;
}

export interface BackfillInterval {
  index: number;
  startDate: string;
  endDate: string;
}
