import * as assert from "assert";

import { findCustomCheckQueries } from "../utilities/customCheckQueries";

suite("Custom check query ranges", () => {
  test("finds block and inline queries in a SQL asset header", () => {
    const text = [
      "/* @bruin",
      "name: analytics.orders",
      "custom_checks:",
      "  - name: no future orders",
      "    query: |",
      "      SELECT COUNT(*)",
      "",
      "      FROM analytics.orders",
      "",
      "    value: 0",
      "  - name: has rows",
      "    query: SELECT COUNT(*) > 0 FROM analytics.orders",
      "@bruin */",
      "",
      "SELECT 1",
    ].join("\n");

    const { blockLines, inlineSpans } = findCustomCheckQueries(text, "sql");

    assert.deepStrictEqual(blockLines, [5, 6, 7]);
    assert.deepStrictEqual(inlineSpans, [{ line: 11, start: 11, end: 52 }]);
  });

  test("ignores queries outside custom_checks and inside other block values", () => {
    const text = [
      "name: raw.customers",
      "custom_checks:",
      "- query: >-",
      "    SELECT 1",
      "  description: |",
      "    query: just prose",
      "columns:",
      "  - name: id",
      "query: SELECT not_a_check",
    ].join("\n");

    const { blockLines, inlineSpans } = findCustomCheckQueries(text, "yaml");

    assert.deepStrictEqual(blockLines, [3]);
    assert.deepStrictEqual(inlineSpans, []);
  });

  test("only searches the @bruin header of a Python asset", () => {
    const text = [
      "custom_checks:",
      "  - query: SELECT 1",
      '""" @bruin',
      "custom_checks:",
      "  - query: SELECT 2",
      '@bruin """',
    ].join("\n");

    const { inlineSpans } = findCustomCheckQueries(text, "python");

    assert.deepStrictEqual(inlineSpans, [{ line: 4, start: 11, end: 19 }]);
  });

  test("comment-only lines don't end the custom_checks section", () => {
    const text = [
      "custom_checks:",
      "- query: SELECT 1",
      "# another check",
      "- query: SELECT 2",
      "  # indented comment",
      "- name: third",
      "  query: SELECT 3",
    ].join("\n");

    const { inlineSpans } = findCustomCheckQueries(text, "yaml");

    assert.deepStrictEqual(
      inlineSpans.map((span) => span.line),
      [1, 3, 6]
    );
  });

  test("ignores custom_checks examples inside a top-level block value", () => {
    const text = [
      "description: |",
      "  custom_checks:",
      "  - query: SELECT 1",
      "name: raw.customers",
    ].join("\n");

    const { blockLines, inlineSpans } = findCustomCheckQueries(text, "yaml");

    assert.deepStrictEqual(blockLines, []);
    assert.deepStrictEqual(inlineSpans, []);
  });

  test("treats BigQuery assets like SQL assets", () => {
    const text = ["/* @bruin", "custom_checks:", "  - query: SELECT 1", "@bruin */", "query: SELECT 2"].join("\n");

    const { inlineSpans } = findCustomCheckQueries(text, "sql-bigquery");

    assert.deepStrictEqual(inlineSpans, [{ line: 2, start: 11, end: 19 }]);
  });
});
