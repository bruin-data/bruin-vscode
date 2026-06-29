import { describe, it, expect } from "vitest";
import {
  type SortState,
  toggleSortColumn,
  flipSortDirection,
  removeSortColumn,
  sortRows,
} from "@/utilities/querySort";

const cols = ["country", "city", "revenue"];

describe("toggleSortColumn (header click)", () => {
  it("adds a column ascending when not present", () => {
    const next = toggleSortColumn([], "country");
    expect(next).toEqual([{ column: "country", direction: "asc", priority: 0 }]);
  });

  it("cycles asc -> desc -> removed on repeat clicks", () => {
    let s = toggleSortColumn([], "country"); // asc
    s = toggleSortColumn(s, "country"); // desc
    expect(s[0].direction).toBe("desc");
    s = toggleSortColumn(s, "country"); // removed
    expect(s).toEqual([]);
  });

  it("accumulates multiple columns with the newest as the primary key", () => {
    let s = toggleSortColumn([], "country");
    s = toggleSortColumn(s, "city"); // city should now be primary
    expect(s.map((x) => x.column)).toEqual(["city", "country"]);
    expect(s.map((x) => x.priority)).toEqual([0, 1]);

    s = toggleSortColumn(s, "revenue"); // revenue primary, then city, then country
    expect(s.map((x) => x.column)).toEqual(["revenue", "city", "country"]);
    expect(s.map((x) => x.priority)).toEqual([0, 1, 2]);
  });

  it("toggles direction of an existing column without dropping the others", () => {
    let s = toggleSortColumn([], "country");
    s = toggleSortColumn(s, "city"); // [city, country]
    s = toggleSortColumn(s, "country"); // country -> desc, still 2 columns
    expect(s.map((x) => x.column)).toEqual(["city", "country"]);
    expect(s.find((x) => x.column === "country")!.direction).toBe("desc");
  });
});

describe("removeSortColumn / flipSortDirection", () => {
  it("removeSortColumn drops one and reindexes priorities", () => {
    const start: SortState[] = [
      { column: "country", direction: "asc", priority: 0 },
      { column: "city", direction: "asc", priority: 1 },
      { column: "revenue", direction: "asc", priority: 2 },
    ];
    const s = removeSortColumn(start, "city");
    expect(s.map((x) => x.column)).toEqual(["country", "revenue"]);
    expect(s.map((x) => x.priority)).toEqual([0, 1]);
  });

  it("flipSortDirection flips only the target column", () => {
    const start: SortState[] = [
      { column: "country", direction: "asc", priority: 0 },
      { column: "city", direction: "asc", priority: 1 },
    ];
    const s = flipSortDirection(start, "city");
    expect(s.find((x) => x.column === "country")!.direction).toBe("asc");
    expect(s.find((x) => x.column === "city")!.direction).toBe("desc");
  });
});

describe("sortRows", () => {
  // country, city, revenue
  const rows = [
    ["US", "NYC", 30],
    ["US", "LA", 10],
    ["CA", "Toronto", 20],
    ["US", "LA", 5],
  ];

  it("returns rows unchanged when no sort state", () => {
    expect(sortRows(rows, cols, [])).toEqual(rows);
  });

  it("sorts by a single numeric column", () => {
    const sorted = sortRows(rows, cols, [{ column: "revenue", direction: "asc", priority: 0 }]);
    expect(sorted.map((r) => r[2])).toEqual([5, 10, 20, 30]);
  });

  it("sorts by two columns together (country asc, then revenue desc)", () => {
    const sorted = sortRows(rows, cols, [
      { column: "country", direction: "asc", priority: 0 },
      { column: "revenue", direction: "desc", priority: 1 },
    ]);
    // CA first, then US rows ordered by revenue descending
    expect(sorted).toEqual([
      ["CA", "Toronto", 20],
      ["US", "NYC", 30],
      ["US", "LA", 10],
      ["US", "LA", 5],
    ]);
  });

  it("uses later columns only as tie-breakers", () => {
    const sorted = sortRows(rows, cols, [
      { column: "city", direction: "asc", priority: 0 },
      { column: "revenue", direction: "asc", priority: 1 },
    ]);
    // LA ties broken by revenue ascending (5 before 10)
    expect(sorted).toEqual([
      ["US", "LA", 5],
      ["US", "LA", 10],
      ["US", "NYC", 30],
      ["CA", "Toronto", 20],
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...rows];
    sortRows(input, cols, [{ column: "revenue", direction: "asc", priority: 0 }]);
    expect(input).toEqual(rows);
  });

  it("sorts null values first", () => {
    const withNulls = [["US", "NYC", 30], ["US", "LA", null], ["CA", "X", 10]];
    const sorted = sortRows(withNulls, cols, [{ column: "revenue", direction: "asc", priority: 0 }]);
    expect(sorted[0][2]).toBe(null);
  });
});
