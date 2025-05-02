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
  isQueryExpanded: boolean;
}

export interface EditingState {
  tabId: string;
  originalLabel: string;
  currentLabel: string;
}
