# Bruin Completion Providers

This directory contains modular completion providers for the Bruin VS Code extension, organized by functionality.

## Structure

### `materializationCompletions.ts`
Handles materialization-related completions that use internal parse commands:
- `cluster_by` - column clustering
- `partition_by` - column partitioning  
- `incremental_key` - incremental processing keys
- Materialization types (table, view, time_interval)
- Strategy values (delete+insert, merge, replace, append, scd2)

### `columnCompletions.ts`
Handles column schema completions:
- Column property templates (full and simple)
- Column properties (name, type, description, primary_key, etc.)
- Data types (string, integer, float, boolean, timestamp, etc.)
- Column validation checks (unique, not_null, positive, etc.)

### `topLevelCompletions.ts`
Handles top-level asset property completions:
- Basic asset properties (name, type, description, depends, etc.)
- Asset type completions (python, sf.sql, bq.sql, etc.)

### `assetCompletions.ts`
Handles asset-related completions using internal parse:
- Column completions from parsed asset data
- Upstream asset completions
- Asset references and dependencies

## Usage

The main `BruinCompletionsWithCommands` class orchestrates these providers:

```typescript
// Initialize providers
this.materializationCompletions = new MaterializationCompletions(this.getAssetData.bind(this));
this.columnCompletions = new ColumnCompletions();
this.topLevelCompletions = new TopLevelCompletions();
this.assetCompletions = new AssetCompletions(this.getAssetData.bind(this));

// Use in completion provider
const materializationCompletions = await this.languageServer.getMaterializationCompletions(document, position, document.fileName);
const columnCompletions = this.languageServer.getColumnCompletions(document, position);
const topLevelCompletions = this.languageServer.getTopLevelCompletions();
```

## Benefits

1. **Separation of Concerns**: Each provider handles a specific type of completion
2. **Maintainability**: Easier to modify and extend individual completion types
3. **Reusability**: Providers can be used independently
4. **Testability**: Each provider can be tested in isolation
5. **Organization**: Materialization completions stay together as they all use internal parse commands 