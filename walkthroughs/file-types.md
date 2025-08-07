# Supported File Types

Learn which file types have Bruin extension support and what features are available for each.

## Fully Supported File Types

### YAML Configuration Files
| File Type | Features | Description |
|-----------|----------|-------------|
| **`.bruin.yml`** | ✅ Schema validation<br/>✅ Syntax highlighting | Bruin project configuration |
| **`pipeline.yml`** | ✅ Schema validation<br/>✅ Syntax highlighting | Pipeline definitions |
| **`*.asset.yml`** | ✅ Schema validation<br/>✅ Smart autocomplete<br/>✅ Syntax highlighting<br/>✅ Dependency linking | Asset definitions |

### SQL Files
| File Type | Features | Description |
|-----------|----------|-------------|
| **`*.sql`** | ✅ Autocomplete in Bruin blocks<br/>✅ Query preview<br/>✅ Syntax highlighting | SQL assets with Bruin metadata |

### Python Files  
| File Type | Features | Description |
|-----------|----------|-------------|
| **`*.py`** | ✅ Autocomplete in Bruin blocks<br/>✅ Syntax highlighting | Python assets with Bruin metadata |

## Feature Details

### Schema Validation
- **Real-time validation** as you type in all YAML files and SQL files
- **Error highlighting** with helpful messages
- **IntelliSense** based on JSON schemas
- **Property suggestions** from schema definitions

### Smart Autocomplete (Asset Files Only)
- **Asset properties**: name, type, owner, description
- **Asset types**: All supported Bruin asset types  
- **Dependencies**: Other assets in your pipeline
- **Materialization options**: table, view, none, strategy types
- **Column-based suggestions**: `cluster_by`, `partition_by`, and `incremental_key` suggest actual column names from your asset definition
- **Column schemas**: name, type, description, checks

### Query Preview
- **Preview SQL results** without running full pipeline
- **Dependency lineage** visualization
- **Multi-tab support** for multiple queries
- **Export options** for results

### Asset Metadata in Code Files

#### SQL Files
Add Bruin metadata in SQL comments:
```sql
/*
name: my_asset
type: sf.sql
owner: data-team
depends:
  - raw_data
*/

SELECT * FROM raw_data;
```

#### Python Files
Add Bruin metadata in Python docstrings:
```python
"""
name: my_python_asset  
type: python
owner: data-team
depends:
  - input_data
"""

def main():
    # Your Python code here
    pass
```

## File Organization

### Recommended Structure
```
my-bruin-project/
├── .bruin.yml              # Project config
├── pipeline.yml            # Pipeline definition
├── assets/
│   ├── raw/
│   │   ├── users.asset.yml
│   │   └── orders.asset.yml
│   ├── staging/
│   │   ├── clean_users.sql
│   │   └── clean_orders.sql
│   └── marts/
│       └── user_metrics.py
```

### File Detection
The extension automatically activates when it detects:
- `.bruin.yml` in workspace
- `pipeline.yml` in workspace  
- Any `*.asset.yml` files

## Language Association

VS Code automatically recognizes these patterns:
- **YAML**: `.yml`, `.yaml` extensions
- **SQL**: `.sql` extension  
- **Python**: `.py` extension

## Getting Started

1. **Create a new Bruin project** with `.bruin.yml`
2. **Add asset files** (`.asset.yml`, `.sql`, or `.py`)
3. **Start typing** - autocomplete will activate automatically
4. **Use schema validation** to catch errors early

## Next Steps

- Try **Query Preview Features** to test your SQL queries
- Review **Essential Keyboard Shortcuts** for productivity tips
- Learn **Autocomplete & IntelliSense** for smart suggestions