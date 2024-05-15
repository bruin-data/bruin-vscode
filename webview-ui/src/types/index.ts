export type CheckboxItems = {
  name: string;
  checked: boolean;
};

interface Issue {
  asset: string;
  description: string;
  context: string[];
}

interface IssuesMap {
  [test: string]: Issue[];
}

export interface ParsedValidationErrorMessage {
  pipeline?: string;
  issues?: IssuesMap;
  error?: string;
}


export interface Asset {
  name: string;
  type: string;
  pipeline: string;
  project: string;
  description: string;
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
    hasUpstreamForClicking?: boolean;
    hasDownstreamForClicking?: boolean;
  };
  status?: string;
  onNodeDoubleClick?: Function;
  nodeProps?: any;
}
