const FIELD_PATTERN = /^(["'])([^"']+)\1\s+(.+)$/;

export const extractStructFieldsFromTypeString = (typeString: string): { name: string, type: string }[] => {
  if (!typeString) return [];
  
  try {
    const structMatch = typeString.match(/^STRUCT\s*\((.+)\)$/i);
    if (!structMatch) return [];
    
    const fieldsContent = structMatch[1];
    const fields: { name: string, type: string }[] = [];
    
    let depth = 0;
    let currentField = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < fieldsContent.length; i++) {
      const char = fieldsContent[i];
      const prevChar = i > 0 ? fieldsContent[i - 1] : '';
      
      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
        currentField += char;
        continue;
      }
      
      if (!inQuotes) {
        if (char === '(') {
          depth++;
          currentField += char;
        } else if (char === ')') {
          depth--;
          currentField += char;
        } else if (char === ',' && depth === 0) {
          const trimmed = currentField.trim();
          if (trimmed) {
            const fieldMatch = trimmed.match(FIELD_PATTERN);
            if (fieldMatch) {
              fields.push({
                name: fieldMatch[2],
                type: fieldMatch[3].trim()
              });
            }
          }
          currentField = '';
        } else {
          currentField += char;
        }
      } else {
        currentField += char;
      }
    }
    
    if (currentField.trim()) {
      const trimmed = currentField.trim();
      const fieldMatch = trimmed.match(FIELD_PATTERN);
      if (fieldMatch) {
        fields.push({
          name: fieldMatch[2],
          type: fieldMatch[3].trim()
        });
      }
    }
    
    return fields;
  } catch (e) {
    console.warn('Error extracting struct fields from type string:', e);
    return [];
  }
};

const flattenNestedStruct = (
  structValue: any,
  topLevelKeys: string[],
  prefix: string
): { columnName: string; value: any }[] => {
  const result: { columnName: string; value: any }[] = [];
  
  if (!structValue || typeof structValue !== 'object' || Array.isArray(structValue)) {
    return result;
  }
  
  for (const key of topLevelKeys) {
    const fieldValue = structValue[key];
    const columnName = prefix ? `${prefix}.${key}` : key;
    
    if (fieldValue !== null && fieldValue !== undefined && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
      const nestedKeys = Object.keys(fieldValue);
      if (nestedKeys.length > 0) {
        const nestedResult = flattenNestedStruct(fieldValue, nestedKeys, columnName);
        result.push(...nestedResult);
      } else {
        result.push({ columnName, value: fieldValue });
      }
    } else {
      result.push({ columnName, value: fieldValue });
    }
  }
  
  return result;
};

const QUERY_FIELD_PATTERN = /(?:\S+\s+)?AS\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;

export const extractStructFieldNamesFromQuery = (query: string, structColumnName: string): string[] => {
  if (!query || !structColumnName) return [];
  
  try {
    const escapedColumnName = structColumnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const structPattern = new RegExp(
      `struct\\s*\\(([^)]+)\\)\\s+(?:AS\\s+)?[\`'"]?${escapedColumnName}[\`'"]?|[\`'"]?${escapedColumnName}[\`'"]?\\s*=\\s*struct\\s*\\(([^)]+)\\)`,
      'i'
    );
    
    const match = query.match(structPattern);
    if (!match) return [];
    
    const structContent = match[1] || match[2];
    if (!structContent) return [];
    
    const fieldNames: string[] = [];
    let fieldMatch;
    
    QUERY_FIELD_PATTERN.lastIndex = 0;
    while ((fieldMatch = QUERY_FIELD_PATTERN.exec(structContent)) !== null) {
      fieldNames.push(fieldMatch[1]);
    }
    
    return fieldNames;
  } catch (e) {
    console.warn('Error extracting struct field names from query:', e);
    return [];
  }
};

export const flattenStructColumns = (columns: any[], rows: any[][], query?: string | null): { columns: any[], rows: any[][] } => {
  if (!columns || !rows || rows.length === 0) {
    return { columns: columns || [], rows: rows || [] };
  }

  const flattenedColumns: any[] = [];
  const structExpansions = new Map<number, { 
    fieldPaths: string[]; 
    structName: string;
    isNested: boolean;
  }>();

  columns.forEach((column, colIndex) => {
    const columnName = typeof column === 'string' ? column : column.name;
    const columnType = typeof column === 'string' ? '' : (column.type || '');
    const columnTypeUpper = columnType.toUpperCase();
    
    const isStructArray = columnTypeUpper.includes('STRUCT(') && columnTypeUpper.includes('[]');
    const isStructType = !isStructArray && (
      columnTypeUpper === 'RECORD' || 
      columnTypeUpper === 'STRUCT' || 
      columnTypeUpper.startsWith('STRUCT(')
    );
    
    if (isStructType) {
      let fieldPaths: string[] = [];
      
      if (column.fields && Array.isArray(column.fields)) {
        fieldPaths = column.fields.map((f: any) => {
          const fieldName = typeof f === 'string' ? f : (f.name || '');
          return fieldName;
        }).filter(Boolean);
      }

      if (fieldPaths.length === 0 && columnTypeUpper.startsWith('STRUCT(')) {
        const parsedFields = extractStructFieldsFromTypeString(columnType);
        fieldPaths = parsedFields.map(f => f.name);
        
        const hasNestedStruct = parsedFields.some(f => 
          f.type.toUpperCase().includes('STRUCT(')
        );
        
        if (hasNestedStruct && rows.length > 0) {
          const firstRowValue = rows[0]?.[colIndex];
          if (firstRowValue && typeof firstRowValue === 'object' && !Array.isArray(firstRowValue)) {
            const nestedFlattened = flattenNestedStruct(firstRowValue, fieldPaths, columnName);
            fieldPaths = nestedFlattened.map(f => f.columnName.replace(`${columnName}.`, ''));
            structExpansions.set(colIndex, {
              fieldPaths,
              structName: columnName,
              isNested: true
            });
            
            nestedFlattened.forEach(({ columnName: flatName }) => {
              flattenedColumns.push({
                name: flatName,
                type: ''
              });
            });
            
            return;
          }
        }
      }

      if (fieldPaths.length === 0 && query) {
        const fieldNames = extractStructFieldNamesFromQuery(query, columnName);
        fieldPaths = fieldNames;
      }

      if (fieldPaths.length === 0 && rows.length > 0) {
        const firstRowValue = rows[0]?.[colIndex];
        
        if (firstRowValue !== null && firstRowValue !== undefined && typeof firstRowValue === 'object' && !Array.isArray(firstRowValue)) {
          const topLevelKeys = Object.keys(firstRowValue);
          const nestedFlattened = flattenNestedStruct(firstRowValue, topLevelKeys, columnName);
          fieldPaths = nestedFlattened.map(f => f.columnName.replace(`${columnName}.`, ''));
          
          if (fieldPaths.length > 0) {
            structExpansions.set(colIndex, {
              fieldPaths,
              structName: columnName,
              isNested: true
            });
            
            nestedFlattened.forEach(({ columnName: flatName }) => {
              flattenedColumns.push({
                name: flatName,
                type: ''
              });
            });
            
            return;
          }
        }
      }

      if (fieldPaths.length > 0) {
        structExpansions.set(colIndex, {
          fieldPaths,
          structName: columnName,
          isNested: false
        });

        fieldPaths.forEach((fieldPath) => {
          flattenedColumns.push({
            name: `${columnName}.${fieldPath}`,
            type: ''
          });
        });
      } else {
        flattenedColumns.push(column);
      }
    } else {
      flattenedColumns.push(column);
    }
  });

  const flattenedRows: any[][] = rows.map((row) => {
    const flattenedRow: any[] = [];
    
    columns.forEach((column, colIndex) => {
      const structExpansion = structExpansions.get(colIndex);
      
      if (structExpansion) {
        const structValue = row[colIndex];
        
        if (structExpansion.isNested) {
          const topLevelKeys = Object.keys(structValue || {});
          const nestedFlattened = flattenNestedStruct(structValue, topLevelKeys, structExpansion.structName);
          nestedFlattened.forEach(({ value }) => {
            flattenedRow.push(value);
          });
        } else {
          let structValues: any[] = [];
          
          if (Array.isArray(structValue)) {
            if (structValue.length > 0 && Array.isArray(structValue[0])) {
              structValues = structValue[0];
            } else {
              structValues = structValue;
            }
          } else if (structValue !== null && structValue !== undefined && typeof structValue === 'object') {
            structValues = structExpansion.fieldPaths.map(fieldPath => {
              const pathParts = fieldPath.split('.');
              let value = structValue;
              for (const part of pathParts) {
                value = value?.[part];
              }
              return value;
            });
          }

          for (let i = 0; i < structExpansion.fieldPaths.length; i++) {
            flattenedRow.push(structValues[i] !== undefined ? structValues[i] : null);
          }
        }
      } else {
        flattenedRow.push(row[colIndex]);
      }
    });
    
    return flattenedRow;
  });

  return {
    columns: flattenedColumns,
    rows: flattenedRows
  };
};
