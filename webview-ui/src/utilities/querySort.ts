// Pure helpers for the query-preview results table sorting.
// Kept framework-free so the multi-column sort behaviour can be unit-tested
// without mounting the (large) QueryPreview component.

export interface SortState {
  column: string;
  direction: "asc" | "desc";
  priority: number;
}

// Normalise the `priority` field to match array order.
const reindex = (state: SortState[]): SortState[] =>
  state.map((entry, i) => ({ ...entry, priority: i }));

const columnIndexOf = (columns: any[], name: string): number =>
  columns.findIndex((c: any) => (typeof c === "string" ? c : c?.name) === name);

/**
 * Header-click behaviour: the most recently clicked column becomes the PRIMARY
 * sort key and previously sorted columns are kept as tie-breakers. This means
 * every click visibly re-orders the table while still accumulating a
 * multi-column sort (no modifier key required). Re-clicking a column already in
 * the sort cycles its direction asc -> desc, then removes it.
 */
export function toggleSortColumn(sortState: SortState[], colName: string): SortState[] {
  const existing = sortState.find((s) => s.column === colName);
  if (!existing) {
    return reindex([{ column: colName, direction: "asc", priority: 0 }, ...sortState]);
  }
  if (existing.direction === "asc") {
    return reindex(
      sortState.map((s) => (s.column === colName ? { ...s, direction: "desc" } : s))
    );
  }
  return reindex(sortState.filter((s) => s.column !== colName));
}

/** Flip a single column's direction (used by the sort-bar chip arrows). */
export function flipSortDirection(sortState: SortState[], colName: string): SortState[] {
  return sortState.map((s) =>
    s.column === colName
      ? { ...s, direction: s.direction === "asc" ? "desc" : "asc" }
      : s
  );
}

/** Remove a single column from the sort group. */
export function removeSortColumn(sortState: SortState[], colName: string): SortState[] {
  return reindex(sortState.filter((s) => s.column !== colName));
}

/**
 * Return a new array of rows sorted by every column in `sortState`, in priority
 * order. Type-aware: numbers compare numerically, parseable dates by time, and
 * everything else by locale string compare. Nulls sort first (as -Infinity).
 */
export function sortRows(rows: any[], columns: any[], sortState: SortState[]): any[] {
  if (!sortState.length) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const sort of sortState) {
      const colIndex = columnIndexOf(columns, sort.column);
      if (colIndex === -1) continue;

      let valA = a[colIndex];
      let valB = b[colIndex];

      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else if (!isNaN(Date.parse(valA)) && !isNaN(Date.parse(valB))) {
        comparison = new Date(valA).getTime() - new Date(valB).getTime();
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      }

      if (comparison !== 0) {
        return sort.direction === "asc" ? comparison : -comparison;
      }
    }
    return 0;
  });
  return sorted;
}
