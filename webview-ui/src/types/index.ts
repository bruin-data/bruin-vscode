import type { Ref } from "vue";

export type CheckboxItems = {
  name: string;
  checked: boolean;
};

export interface Issue {
  asset: string | null;
  description: string;
  context: string[];
  severity: string;
}

export interface ParsedValidationErrorMessage {
  pipeline: string | null;
  issues: Record<string, Issue[]>;
}

export interface FormattedIssue {
  asset: string | null;
  description: string;
  context: string[];
  expanded: boolean;
  severity: string;
}

export interface FormattedErrorMessage {
  pipeline: string | null;
  issues: FormattedIssue[];
  expanded?: boolean;
}

export interface Asset {
  name: string;
  type: string;
  pipeline: string;
  path: string;
  upstreams: Array<{ type: string; value: string }>;
  downstreams: Array<{ type: string; value: string }>;
  hasUpstreams: boolean;
  hasDownstreams: boolean;
  isFocusAsset?: boolean;
  definition_file?: {path: string};
}

// Column lineage types for enhanced pipeline parsing
export interface ColumnInfo {
  entity_attribute?: string | null;
  name: string;
  type: string;
  description?: string;
  primary_key?: boolean;
  update_on_merge?: boolean;
  checks?: ColumnCheck[];
  upstreams?: ColumnUpstream[];
}

export interface ColumnUpstream {
  column: string;
  table: string;
}

export interface ColumnCheck {
  id?: string;
  name: string;
  value?: any;
  blocking?: boolean;
  description?: string;
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

export interface Project {
  name: string;
  id: string;
}

export interface BruinNodeProps {
  label: string;
  data: {
    [x: string]: any;
    type: string;
    asset?: Asset;
    project?: Project;
    hasUpstreamForClicking: boolean;
    hasDownstreamForClicking: boolean;
  };
  status?: string;
  onNodeDoubleClick?: Function;
  nodeProps?: any;
}

export interface AssetDataset {
  id: string;
  name: string;
  type: string;
  upstreams?: Upstream[];
  upstream?: Upstream[];
  downstream?: Downstream[];
  isFocusAsset: boolean;
}

export interface Upstream {
  name: string;
  type?: string;
  executable_file?: File;
  definition_file?: File;
  external?: boolean;
}

interface Downstream {
  name: string;
  type: string;
  executable_file: File;
  definition_file: File;
  external?: boolean;
}

interface File {
  name: string;
  path: string;
  content: string;
  type: string;
}

interface Environment {
  name: string;
}

export interface EnvironmentsList {
  selectedEnvironment: string;
  environments: Environment[];
}

export interface PipelineAssets {
  assets: SimpleAsset[];
}

export interface SimpleAsset {
  id: string;
  name: string;
  type: string;
  pipeline: string;
  path: string;
  upstreams: string[];
  downstream: string[];
  hasUpstreamForClicking?: boolean;
  hasDownstreamForClicking?: boolean;
  isFocusAsset?: boolean;
}


export interface CustomChecks {
  blocking?: boolean;
  description: string;
  id: string;
  name: string;
  value: number;
  count?: number;
  query: string;
}

export type ErrorPhase = "Validating" | "Rednering";

export interface Tab {
  id: string;
  label: string;
  parsedOutput: any;
  error: any;
  isLoading: boolean;
  searchInput: string;
  totalRowCount: number;
  filteredRowCount: number;
}

export interface TabData extends Tab {
  parsedOutput: any | undefined;
  error: string | null;
  isLoading: boolean;
  searchInput: string;
  filteredRows: any[];
  totalRowCount: number;
  filteredRowCount: number;
  isEditing: boolean;
  limit: number;
  environment: string;
  connectionName: string;
  showQuery: boolean;
  selectedQuery?: string;
  consoleMessages: Array<{type: 'stdout' | 'stderr' | 'info', message: string, timestamp: string}>;
}

export interface EditingState {
  tabId: string;
  originalLabel: string;
  currentLabel: string;
}
export interface IngestrParameters {
  source?: string;
  source_connection: string;
  source_table: string;
  destination: string;
  incremental_strategy?: string;
  incremental_key?: string;
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