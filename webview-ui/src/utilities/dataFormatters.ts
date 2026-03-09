/**
 * Data formatters for query results using Papa Parse for CSV/TSV
 */
import Papa from 'papaparse';

export type ExportFormat = 'csv' | 'tsv' | 'json';

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  tsv: 'TSV',
  json: 'JSON',
};

interface FormatOptions {
  columns: (string | { name: string })[];
  rows: any[][];
}

const getColumnName = (col: string | { name: string }): string =>
  typeof col === 'string' ? col : col.name;

const toObjects = ({ columns, rows }: FormatOptions): Record<string, any>[] => {
  const colNames = columns.map(getColumnName);
  return rows.map(row => {
    const obj: Record<string, any> = {};
    colNames.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
};

export const formatAsCSV = (options: FormatOptions): string => {
  const data = toObjects(options);
  return Papa.unparse(data, { delimiter: ',' });
};

export const formatAsTSV = (options: FormatOptions): string => {
  const data = toObjects(options);
  return Papa.unparse(data, { delimiter: '\t' });
};

export const formatAsJSON = (options: FormatOptions): string => {
  return JSON.stringify(toObjects(options), null, 2);
};

export const formatData = (format: ExportFormat, options: FormatOptions): string => {
  switch (format) {
    case 'csv': return formatAsCSV(options);
    case 'tsv': return formatAsTSV(options);
    case 'json': return formatAsJSON(options);
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
