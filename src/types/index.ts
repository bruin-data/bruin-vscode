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

export interface ParseResponse {
  asset: {
    id: string;
    uri: string;
    name: string;
    type: string;
  } | null;
  pipeline?: any;
}