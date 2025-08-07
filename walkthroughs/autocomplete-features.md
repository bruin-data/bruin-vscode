# Autocomplete & IntelliSense Features

Discover the powerful autocomplete features that help you write Bruin asset files (*.asset.yml) faster and with fewer errors.

## What Gets Autocompleted

### Asset Properties
When editing `.asset.yml` files, get suggestions for:
- `name` - Asset name
- `type` - Asset type (python, sf.sql, bq.sql, etc.)
- `owner` - Asset owner
- `description` - Asset description
- `depends` - Asset dependencies
- `materialization` - Materialization settings
- `columns` - Column definitions
- `custom_checks` - Custom validation checks

### Asset Types
After typing `type:`, get suggestions for all supported asset types:
- **SQL**: `sf.sql`, `bq.sql`, `pg.sql`, `rs.sql`, `ms.sql`
- **Python**: `python`
- **Seeds**: `sf.seed`, `bq.seed`, `pg.seed`
- **Sensors**: `sf.sensor.query`, `bq.sensor.table`
- **And many more!**

### Dependencies
When in the `depends:` section:
- Get suggestions for all available assets in your pipeline
- Automatic formatting with proper indentation
- Asset type and file path information in tooltips
- Go to definition of the asset by clicking on the asset name

### Materialization Options
Complete materialization configurations:
```yaml
materialization:
  type: |table|view|none|  # <- Get suggestions here
  strategy: |create+replace|delete+insert|merge|append|  # <- Strategy suggestions
  partition_by: |column_name|  # <- Column suggestions from asset definition
  cluster_by:   # <- Column suggestions from asset definition
    - |column_name|
  incremental_key: |column_name|  # <- Column suggestions from asset definition
```

**Smart Column Suggestions**: When defining `cluster_by`, `partition_by`, or `incremental_key`, you get autocomplete suggestions based on the actual columns defined in your asset's column schema.

### Column Schema
Define column schemas with autocomplete:
```yaml
columns:
  - name: # <- Column name suggestions
    type: # <- Data type suggestions
    description: # <- Documentation
```

## How It Works

### Context-Aware Suggestions
The autocomplete system understands where you are in the file:
- **Root level**: Shows asset properties
- **Inside `depends:`**: Shows available dependencies
- **Inside `materialization:`**: Shows materialization options
- **Inside `columns:`**: Shows column schema properties

### Smart Spacing
Autocomplete automatically handles spacing:
- Typing `type:` then selecting → `type: python`
- Typing `-` then selecting → `- asset_name`

### File Type Support
Smart autocomplete works in:
- **Asset YAML files**: `*.asset.yml` (full autocomplete features)
- **SQL files**: With Bruin asset metadata in comments
- **Python files**: With Bruin asset metadata in docstrings

*Note: `.bruin.yml` and `pipeline.yml` have schema validation but not smart autocomplete*

## Pro Tips

1. **Use manual trigger**: Press `Ctrl+Space` (or `Option+Esc` on Mac) anytime to see available options
2. **Let auto-trigger help**: Start typing `:` or `-` and suggestions appear automatically
3. **Read tooltips**: Hover over suggestions to see additional information
4. **Use filtering**: Keep typing to filter suggestions by name

## Try It Yourself

1. Open any `*.sql` file in your workspace
2. Try typing `materialization:` and see the materialization suggestions  
3. Try adding dependencies by typing `depends:` then `-`
4. Use `Ctrl+Space` or `Option+Esc` to trigger suggestions manually

## Next Steps

- Continue to **Supported File Types** to see what files work with Bruin
- Try **Query Preview Features** to test your SQL queries
- Review **Essential Keyboard Shortcuts** for productivity tips