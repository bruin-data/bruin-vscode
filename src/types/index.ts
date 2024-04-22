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
