export type BruinDelimiters = {
  pyStartDelimiter: RegExp;
  pyEndDelimiter: RegExp;
  sqlStartDelimiter: RegExp;
  sqlEndDelimiter: RegExp;
};

export type BruinCommandOptions = {
  flags?: string[];
  ignoresErrors?: boolean;
};

// Column lineage types for enhanced pipeline parsing
export interface ColumnInfo {
  name: string;
  type: string;
  description?: string;
  primary_key?: boolean;
  not_null?: boolean;
  checks?: ColumnCheck[];
  entity_attribute?: string;
}

export interface ColumnCheck {
  id?: string;
  name: string;
  value?: any;
  blocking?: boolean;
}

export interface ColumnLineage {
  column: string;
  source_columns: Array<{
    asset: string;
    column: string;
  }>;
}

export interface AssetColumnInfo {
  id: string;
  name: string;
  type: string;
  columns: ColumnInfo[];
  columnLineage: ColumnLineage[];
  upstreams: any[];
  downstreams: any[];
}

export interface PipelineColumnInfo {
  pipeline: {
    name: string;
    path: string;
  };
  assets: AssetColumnInfo[];
  globalColumnLineage: Record<string, ColumnLineage[]>;
}

export interface EnhancedPipelineData {
  name: string;
  schedule: string;
  description: string;
  assets: any[];
  columnLineage?: Record<string, ColumnLineage[]>;
  schemaInfo?: Record<string, any>;
  raw: any;
}
