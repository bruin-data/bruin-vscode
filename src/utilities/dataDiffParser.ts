export interface TableDiffSummary {
  rowCount: {
    source: number;
    target: number;
    diff: number;
  };
  columnCount: {
    source: number;
    target: number;
    diff: number;
  };
}

export interface ColumnDiff {
  name: string;
  type: {
    source: string;
    target: string;
    isDifferent: boolean;
  };
  nullable: {
    source: string;
    target: string;
    isDifferent: boolean;
  };
  constraints: {
    source: string;
    target: string;
    isDifferent: boolean;
  };
  status: 'added' | 'removed' | 'modified' | 'unchanged';
}

export interface DataStatistic {
  name: string;
  source: string | number;
  target: string | number;
  diff: string | number;
  diffPercent?: string;
  type: 'count' | 'percentage' | 'numeric' | 'text';
}

export interface ColumnStatistics {
  columnName: string;
  dataType: string;
  statistics: DataStatistic[];
}

export interface ParsedTableDiff {
  summary: TableDiffSummary;
  schemaDiffs: ColumnDiff[];
  columnStatistics: ColumnStatistics[];
  sourceTable: string;
  targetTable: string;
  hasSchemaChanges: boolean;
  hasDataChanges: boolean;
  isSchemaOnlyComparison: boolean;
  alterStatements: string;
}

/**
 * Parses the bruin data-diff output into structured data for modern UI visualization
 */
export class DataDiffParser {
  
  static parse(rawOutput: string, sourceTable: string, targetTable: string): ParsedTableDiff {
    const lines = rawOutput.split('\n');
    let summary: TableDiffSummary | null = null;
    let schemaDiffs: ColumnDiff[] = [];
    let columnStatistics: ColumnStatistics[] = [];
    
    // Parse summary section (first table with row/column counts)
    summary = this.parseSummarySection(lines);
    
    // Parse schema differences
    schemaDiffs = this.parseSchemaSection(lines);
    
    // Parse column statistics
    columnStatistics = this.parseColumnStatistics(lines);
    
    const hasSchemaChanges = schemaDiffs.some(col => col.status !== 'unchanged');
    const hasDataChanges = columnStatistics.length > 0;
    const isSchemaOnlyComparison = rawOutput.includes('--schema-only') || !hasDataChanges;
    
    // Extract ALTER TABLE statements from output
    const alterStatementsMatch = rawOutput.match(/-- ALTER TABLE[^]*$/);
    const alterStatements = alterStatementsMatch ? alterStatementsMatch[0].replace(/^-- /, '') : '';
    
    return {
      summary: summary || this.createDefaultSummary(),
      schemaDiffs,
      columnStatistics,
      sourceTable,
      targetTable,
      hasSchemaChanges,
      hasDataChanges,
      isSchemaOnlyComparison,
      alterStatements
    };
  }
  
  private static parseSummarySection(lines: string[]): TableDiffSummary | null {
    // Look for the first table that contains "Row Count" and "Column Count"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('Row Count')) {
        // Find the Row Count and Column Count lines
        const rowLine = line;
        let colLine = '';
        
        // Look for Column Count in the next few lines
        for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
          if (lines[j].includes('Column Count')) {
            colLine = lines[j].trim();
            break;
          }
        }
        
        if (!colLine) continue;
        
        try {
          // Extract numbers from lines like: "│ Row Count    │                    5 │                    5 │    0 │"
          const rowNumbers = this.extractNumbers(rowLine);
          const colNumbers = this.extractNumbers(colLine);
          
          if (rowNumbers.length >= 3 && colNumbers.length >= 3) {
            return {
              rowCount: {
                source: rowNumbers[0],
                target: rowNumbers[1], 
                diff: rowNumbers[2]
              },
              columnCount: {
                source: colNumbers[0],
                target: colNumbers[1],
                diff: colNumbers[2]
              }
            };
          }
        } catch (error) {
          console.warn('Error parsing summary section:', error);
        }
      }
    }
    return null;
  }
  
  private static parseSchemaSection(lines: string[]): ColumnDiff[] {
    const columns: ColumnDiff[] = [];
    let inSchemaTable = false;
    let currentColumn: Partial<ColumnDiff> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect the start of the schema comparison table
      if (line.includes('COLUMN') && line.includes('PROP') && line.includes('│')) {
        inSchemaTable = true;
        continue;
      }
      
      // Stop parsing if we hit the end of the schema table or start of column statistics
      if (inSchemaTable && (line.includes('Columns that exist in both tables') || 
          line.includes('Schema differences detected') ||
          (line.includes('(') && line.includes('|') && line.match(/^\w+\s*\(/)))) {
        // Finalize any pending column
        if (currentColumn) {
          this.finalizeColumn(currentColumn, columns);
          currentColumn = null;
        }
        break;
      }
      
      if (!inSchemaTable) continue;
      
      // Skip header rows and separator rows
      if (line.includes('─') || line.includes('COLUMN') || line.includes('PROP') || 
          line.startsWith('├') || line.startsWith('╰') || line.startsWith('╭')) {
        continue;
      }
      
      if (line.includes('│')) {
        // Split by pipe, keeping all parts (including empty ones)
        const allParts = line.split('│').map(p => p.trim());
        const parts = allParts.filter(p => p.length > 0);
        
        if (parts.length >= 3) {
          const columnName = parts[0];
          const prop = parts[1];
          const sourceValue = parts[2] || '-';
          const targetValue = parts.length >= 4 ? (parts[3] || '-') : '-';
          
          // The column name appears on the Type row, not on a separate row
          // Format: | columnName | Type | source | target |
          if (prop === 'Type' && columnName && columnName.length > 0 && !columnName.includes('─')) {
            // Finalize previous column if exists
            if (currentColumn) {
              this.finalizeColumn(currentColumn, columns);
            }
            // Start new column with the name from the Type row
            currentColumn = { 
              name: columnName,
              type: {
                source: sourceValue,
                target: targetValue,
                isDifferent: sourceValue !== targetValue
              }
            };
          } else if (currentColumn && prop === 'Nullable') {
            // Nullable row: | (empty) | Nullable | source | target |
            // The column name column is empty, so we use the current column
            currentColumn.nullable = {
              source: sourceValue,
              target: targetValue,
              isDifferent: sourceValue !== targetValue
            };
          } else if (currentColumn && prop === 'Constraints') {
            // Constraints row: | (empty) | Constraints | source | target |
            currentColumn.constraints = {
              source: sourceValue,
              target: targetValue,
              isDifferent: sourceValue !== targetValue
            };
            // Finalize this column
            this.finalizeColumn(currentColumn, columns);
            currentColumn = null;
          }
        }
      }
    }
    
    // Finalize any remaining column
    if (currentColumn) {
      this.finalizeColumn(currentColumn, columns);
    }
    
    return columns;
  }
  
  private static finalizeColumn(column: Partial<ColumnDiff>, columns: ColumnDiff[]): void {
    if (!column.name) return;
    
    // Ensure all required properties exist
    const type = column.type || { source: '-', target: '-', isDifferent: false };
    const nullable = column.nullable || { source: '-', target: '-', isDifferent: false };
    const constraints = column.constraints || { source: '-', target: '-', isDifferent: false };
    
    // Determine status: added, removed, modified, or unchanged
    const status = this.determineColumnStatus({ type, nullable, constraints });
    
    columns.push({
      name: column.name,
      type,
      nullable,
      constraints,
      status
    } as ColumnDiff);
  }
  
  private static parsePropertyRow(line: string): { source: string; target: string; isDifferent: boolean } | null {
    const parts = line.split('│').map(p => p.trim()).filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      const source = parts[1] || '-';
      const target = parts[2] || '-';
      const isDifferent = source !== target;
      
      return { source, target, isDifferent };
    }
    
    return null;
  }
  
  private static parseColumnStatistics(lines: string[]): ColumnStatistics[] {
    const columnStats: ColumnStatistics[] = [];
    let inColumnStatsSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect the start of column statistics section
      if (line.includes('Columns that exist in both tables')) {
        inColumnStatsSection = true;
        continue;
      }
      
      // Stop parsing if we hit ALTER TABLE statements or end of output
      if (inColumnStatsSection && line.includes('-- ALTER TABLE')) {
        break;
      }
      
      if (!inColumnStatsSection) continue;
      
      // Look for lines that indicate column statistics (like "name (STRING | STRING)")
      // Also handle cases like "id (INT64 | INT64)" on its own line
      // Make regex more flexible to handle various whitespace and formats
      // Match: columnName (TYPE | TYPE) or columnName(TYPE|TYPE) etc.
      // Use a more permissive regex that handles trailing whitespace
      const columnMatch = line.match(/^(\w+)\s*\(([^|]+?)\s*\|\s*([^)]+?)\)/);
      
      if (columnMatch) {
        const columnName = columnMatch[1];
        const sourceType = columnMatch[2].trim();
        const targetType = columnMatch[3].trim();
        const dataType = sourceType; // Use source type as reference
        
        const stats: DataStatistic[] = [];
        let foundTableStart = false;
        let foundDataRow = false;
        
        // Parse the statistics table that follows
        // Skip the decorative table border lines
        for (let j = i + 1; j < lines.length && j < i + 50; j++) {
          const statLine = lines[j].trim();
          
          // Skip decorative lines
          if (statLine.includes('─') || statLine.startsWith('╭') || 
              statLine.startsWith('├') || statLine.startsWith('╰')) {
            continue;
          }
          
          // Skip header row (contains table names in columns)
          if (statLine.includes('│') && !foundTableStart) {
            const parts = statLine.split('│').map(p => p.trim()).filter(p => p.length > 0);
            // Header row typically has table names in columns 2 and 3
            if (parts.length >= 3 && (parts[1].includes(':') || parts[2].includes(':'))) {
              foundTableStart = true;
              continue;
            }
          }
          
          if (statLine.includes('│') && foundTableStart) {
            const statInfo = this.parseStatisticRow(statLine);
            if (statInfo && statInfo.name && statInfo.name.length > 0) {
              stats.push(statInfo);
              foundDataRow = true;
            }
          }
          
          // Stop when we hit another column or end of section
          if (statLine.match(/^\w+\s*\([^|]+\s*\|\s*[^)]+\)/) && j > i + 1) {
            break;
          }
          
          // Stop if we hit ALTER TABLE statements
          if (statLine.includes('-- ALTER TABLE')) {
            break;
          }
          
          // Stop if we hit an empty line after finding data (might be end of this column's stats)
          if (foundDataRow && statLine.length === 0 && j > i + 5) {
            // Check if next non-empty line is another column or ALTER TABLE
            for (let k = j + 1; k < j + 5 && k < lines.length; k++) {
              const nextLine = lines[k].trim();
              if (nextLine.length > 0) {
                if (nextLine.includes('-- ALTER TABLE') || 
                    nextLine.match(/^\w+\s*\([^|]+\s*\|\s*[^)]+\)\s*$/)) {
                  break;
                }
              }
            }
          }
        }
        
        // Always add the column even if stats are empty (they might all be "-" indicating no differences)
        // But we need at least some stats to be meaningful
        if (stats.length > 0) {
          columnStats.push({
            columnName,
            dataType,
            statistics: stats
          });
        }
      }
    }
    
    return columnStats;
  }
  
  private static parseStatisticRow(line: string): DataStatistic | null {
    // Split by pipe and keep all parts (including empty ones for alignment)
    const allParts = line.split('│').map(p => p.trim());
    
    // Filter out empty parts at the start/end, but keep structure
    // The format is typically: | Metric | Source | Target | Diff | Diff % |
    // So we need at least 5 parts (including empty first/last)
    if (allParts.length < 5) {
      return null;
    }
    
    // Skip header rows (rows that contain table names or column headers)
    const firstNonEmpty = allParts.find(p => p.length > 0);
    if (firstNonEmpty && (firstNonEmpty.includes(':') || 
        firstNonEmpty === 'DIFF' || firstNonEmpty === 'DIFF %' ||
        firstNonEmpty.includes('TABLE'))) {
      return null;
    }
    
    // Extract meaningful parts (skip first empty and last empty if present)
    const parts = allParts.filter(p => p.length > 0);
    
    if (parts.length >= 4) {
      const name = parts[0];
      
      // Skip if name is empty or looks like a header
      if (!name || name.length === 0) {
        return null;
      }
      
      const source = parts[1] === '-' ? '-' : parts[1];
      const target = parts[2] === '-' ? '-' : parts[2];
      const diff = parts[3] === '-' ? '-' : parts[3];
      const diffPercent = parts.length > 4 ? (parts[4] === '-' ? '-' : parts[4]) : undefined;
      
      // Determine type based on content
      let type: DataStatistic['type'] = 'text';
      if (name.toLowerCase().includes('count')) {
        type = 'count';
      } else if (source.includes('%') || target.includes('%')) {
        type = 'percentage';
      } else if (!isNaN(Number(source)) || !isNaN(Number(target))) {
        type = 'numeric';
      }
      
      return {
        name,
        source,
        target, 
        diff,
        diffPercent,
        type
      };
    }
    
    return null;
  }
  
  private static determineColumnStatus(column: Partial<ColumnDiff>): ColumnDiff['status'] {
    if (!column.type || !column.nullable || !column.constraints) {
      return 'unchanged';
    }
    
    // Check if column exists only in source (removed in target)
    if (column.type.source !== '-' && column.type.target === '-') {
      return 'removed';
    }
    
    // Check if column exists only in target (added in target)
    if (column.type.source === '-' && column.type.target !== '-') {
      return 'added';
    }
    
    // Check if column properties differ
    if (column.type.isDifferent || column.nullable.isDifferent || column.constraints.isDifferent) {
      return 'modified';
    }
    
    return 'unchanged';
  }
  
  private static extractNumbers(line: string): number[] {
    const matches = line.match(/-?\d+/g);
    return matches ? matches.map(Number) : [];
  }
  
  private static createDefaultSummary(): TableDiffSummary {
    return {
      rowCount: { source: 0, target: 0, diff: 0 },
      columnCount: { source: 0, target: 0, diff: 0 }
    };
  }
}