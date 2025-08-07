# Query Preview Features

Discover the powerful query preview and lineage features to analyze and test your data pipeline.

## Query Preview

### How to Use
1. **Select SQL code** in any `.sql` file
2. **Press shortcut**:
   - **Windows/Linux**: `Ctrl+Shift+R`
   - **Mac**: `Cmd+Shift+R`
3. **View results** in the Query Preview panel

### Features
- ✅ **Preview results** without running full pipeline
- ✅ **Multiple tabs** for different queries  
- ✅ **Export options** for query results
- ✅ **Syntax highlighting** in preview
- ✅ **Error handling** with helpful messages

### Supported Query Types
- **Snowflake** (sf.sql)
- **BigQuery** (bq.sql)
- **PostgreSQL** (pg.sql)
- **Redshift** (rs.sql)
- **Microsoft SQL Server** (ms.sql)
- **And more database types**

## Pipeline Lineage

### Visualization
- **Interactive lineage graph** showing asset dependencies
- **Click on assets** to navigate to their files
- **Understand data flow** through your pipeline
- **Identify downstream impacts** of changes

### Features
- ✅ **Asset relationships** visualization
- ✅ **Clickable nodes** for navigation
- ✅ **Dependency tracking**
- ✅ **Impact analysis**

## Multi-Tab Functionality

### Working with Multiple Queries
- **Open multiple previews** simultaneously
- **Switch between tabs** to compare results
- **Independent execution** for each tab
- **Persistent results** until refresh

### Tab Management
- Each query opens in a **separate tab**
- **Tab titles** show query context
- **Close individual tabs** or all at once
- **Automatic cleanup** of unused tabs

## Command Palette Integration

Access features through Command Palette (`Ctrl/Cmd+Shift+P`):

- `Bruin: Preview Selected Query`
- `Bruin: Show Pipeline Lineage`
- `Bruin: Open Query Preview Panel`

## Best Practices

### Writing Previewable Queries
1. **Select specific portions** of SQL for targeted previews
2. **Use LIMIT clauses** for faster preview execution
3. **Test incremental changes** by previewing small sections
4. **Validate syntax** before running full pipeline

### Performance Tips
- **Limit result sets** for faster previews
- **Use sampling** for large datasets
- **Close unused tabs** to free resources
- **Preview incrementally** during development

## Troubleshooting

### Common Issues
| Issue | Solution |
|-------|----------|
| **No results showing** | Check database connection and credentials |
| **Query timeout** | Reduce query scope or add LIMIT clause |
| **Permission errors** | Verify database access permissions |
| **Syntax errors** | Review SQL syntax and asset configuration |

### Getting Help
1. **Check Output panel** for detailed error messages
2. **Verify asset configuration** in `.asset.yml` files
3. **Test database connection** outside VS Code
4. **Review Bruin CLI setup** and configuration

## Integration with Bruin CLI

The query preview feature integrates with:
- **Bruin CLI installation** and configuration
- **Database connections** from `.bruin.yml`
- **Asset definitions** from pipeline files
- **Environment variables** and secrets

## Try It Yourself

1. **Open a SQL file** in your Bruin project
2. **Select some SQL code** (or entire query)
3. **Press** `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
4. **View results** in the Query Preview panel
5. **Try opening multiple tabs** with different queries

## Next Steps

- Review **Essential Keyboard Shortcuts** for productivity tips
- Learn **Autocomplete & IntelliSense** for smart suggestions
- Check **Supported File Types** to see what files work with Bruin