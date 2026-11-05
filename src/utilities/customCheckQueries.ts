import { bruinDelimiterRegex } from "../constants";

export interface CustomCheckQueryRanges {
  /** Lines (0-based) holding the body of a block query (`query: |` / `query: >`). */
  blockLines: number[];
  /** Single-line spans holding an inline query value (`query: SELECT ...`). */
  inlineSpans: { line: number; start: number; end: number }[];
}

const CUSTOM_CHECKS_KEY = /^([ \t]*)custom_checks[ \t]*:(?=[ \t]|$)/;
const ENTRY_PREFIX = /^[ \t]*(-[ \t]+)?/;
const QUERY_KEY = /^[ \t]*(-[ \t]+)?query[ \t]*:(?=[ \t]|$)/;
const BLOCK_SCALAR_HEADER = /^[ \t]*[|>][1-9+-]*[ \t]*(#.*)?$/;
const BLOCK_SCALAR_ENTRY = /:[ \t]+[|>][1-9+-]*[ \t]*(#.*)?$/;
const SQL_LANGUAGES = ["sql", "sql-bigquery", "postgres"];
export const CUSTOM_CHECK_LANGUAGES = [...SQL_LANGUAGES, "python", "yaml"];

const indentOf = (line: string) => line.length - line.trimStart().length;
const isBlank = (line: string) => line.trim() === "";
const isComment = (line: string) => line.trimStart().startsWith("#");

/**
 * Finds the SQL of every `custom_checks[].query` in an asset. For SQL and Python assets only
 * the `@bruin` header is searched; any other language is treated as a plain YAML asset.
 * Keep in sync with syntaxes/bruin-custom-checks-injection.json, which highlights the same ranges.
 */
export const findCustomCheckQueries = (text: string, languageId: string): CustomCheckQueryRanges => {
  const lines = text.split(/\r?\n/);
  const ranges: CustomCheckQueryRanges = { blockLines: [], inlineSpans: [] };

  let from = 0;
  let to = lines.length;
  const isSql = SQL_LANGUAGES.includes(languageId);
  if (isSql || languageId === "python") {
    const start = isSql ? bruinDelimiterRegex.sqlStartDelimiter : bruinDelimiterRegex.pyStartDelimiter;
    const end = isSql ? bruinDelimiterRegex.sqlEndDelimiter : bruinDelimiterRegex.pyEndDelimiter;
    from = lines.findIndex((line) => start.test(line)) + 1;
    if (from === 0) {
      return ranges;
    }
    const endOffset = lines.slice(from).findIndex((line) => end.test(line));
    to = endOffset === -1 ? lines.length : from + endOffset;
  }

  let customChecksIndent = -1;
  for (let i = from; i < to; i++) {
    const line = lines[i];
    // Comment-only lines don't end a section, whatever their indentation.
    if (isBlank(line) || isComment(line)) {
      continue;
    }

    if (customChecksIndent !== -1) {
      const indent = indentOf(line);
      const isSiblingListItem = indent === customChecksIndent && /^[ \t]*-([ \t]|$)/.test(line);
      if (indent <= customChecksIndent && !isSiblingListItem) {
        customChecksIndent = -1;
      }
    }

    // An entry's value runs on for as long as lines are indented deeper than its key. Skipping
    // those lines keeps e.g. a `query:` line inside a `description: |` block from matching.
    const keyColumn = ENTRY_PREFIX.exec(line)![0].length;
    let last = i;
    for (let j = i + 1; j < to && (isBlank(lines[j]) || indentOf(lines[j]) > keyColumn); j++) {
      if (!isBlank(lines[j])) {
        last = j;
      }
    }

    const customChecks = CUSTOM_CHECKS_KEY.exec(line);
    if (customChecks) {
      customChecksIndent = customChecks[1].length;
      continue;
    }
    if (customChecksIndent === -1) {
      // Outside the section only block values need skipping, so prose like a top-level
      // `description: |` that mentions `custom_checks:` can't open one.
      if (BLOCK_SCALAR_ENTRY.test(line)) {
        i = last;
      }
      continue;
    }

    const query = QUERY_KEY.exec(line);
    if (!query) {
      i = last;
      continue;
    }

    const valueStart = query[0].length;
    const value = line.slice(valueStart);
    if (BLOCK_SCALAR_HEADER.test(value)) {
      for (let j = i + 1; j <= last; j++) {
        ranges.blockLines.push(j);
      }
    } else {
      if (value.trim() !== "") {
        const start = valueStart + indentOf(value);
        ranges.inlineSpans.push({ line: i, start, end: line.trimEnd().length });
      }
      // Plain or quoted values folded over several lines.
      for (let j = i + 1; j <= last; j++) {
        if (!isBlank(lines[j])) {
          ranges.inlineSpans.push({ line: j, start: indentOf(lines[j]), end: lines[j].trimEnd().length });
        }
      }
    }
    i = last;
  }

  return ranges;
};
