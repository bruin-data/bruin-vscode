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
  
  export interface ParsedErrorMessage {
    pipeline: string;
    issues: IssuesMap;
  }
  