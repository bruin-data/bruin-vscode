# Test Pipeline

This directory contains a comprehensive test environment for integration testing the Bruin VS Code extension. It simulates a complete Bruin project with various asset types, connections, and environments.

## Structure

```
test-pipeline/
├── .bruin.yml              # Main Bruin project configuration
├── pipeline.yml            # Pipeline configuration
├── connections.yml         # Test connections definitions
├── environments.yml        # Environment configurations
├── assets/                 # Test assets directory
│   ├── example.sql         # Basic SQL asset for webview tests
│   ├── test-ingestr.asset.yml  # Ingestr asset for integration tests
│   ├── test-query.sql      # Generic SQL asset with metadata
│   ├── test-python.py      # Python asset example
│   └── test-bigquery.sql   # BigQuery-specific asset
└── README.md               # This documentation
```

## Test Assets

### SQL Assets
- **example.sql**: Basic SQL asset used by webview integration tests
- **test-query.sql**: SQL asset with full Bruin metadata annotations
- **test-bigquery.sql**: BigQuery-specific asset with platform features

### Python Assets
- **test-python.py**: Python asset with complete metadata and sample processing logic

### Ingestr Assets
- **test-ingestr.asset.yml**: YAML-based Ingestr asset for testing data ingestion flows

## Configuration Files

### .bruin.yml
Main project configuration defining:
- Project name and default connections
- Environment-specific connection mappings
- Multiple environments (default, test) with various connection types

### connections.yml
Comprehensive connection definitions for testing:
- Google Cloud Platform / BigQuery connections
- Snowflake connections
- PostgreSQL connections (local and remote)
- DuckDB connections (file and memory)
- AWS Redshift connections
- MySQL and SQLite connections

### environments.yml
Environment configurations for testing different scenarios:
- **development**: Local development with DuckDB and PostgreSQL
- **staging**: Cloud-based staging with GCP and BigQuery
- **production**: Production-like with multiple cloud providers
- **testing**: Dedicated testing environment with in-memory databases

## Usage in Integration Tests

This test-pipeline is used by:

1. **webview-tests.test.ts**: Opens `assets/example.sql` to test the SQL webview
2. **ingestr-asset-ui-integration.test.ts**: Opens `assets/test-ingestr.asset.yml` to test Ingestr UI
3. **connections-integration.test.ts**: Opens `.bruin.yml` to test connection management

## Test Coordination

The test environment supports coordinated testing through:
- Shared workspace directory for all tests
- Comprehensive asset collection covering different use cases
- Multiple connection and environment configurations
- Proper test isolation through the TestCoordinator

## Running Tests

### Individual Tests
```bash
npm run selenium:run-tests:webview      # Webview functionality tests
npm run selenium:run-tests:ingestr      # Ingestr asset UI tests  
npm run selenium:run-tests:connections  # Connection management tests
```

### Coordinated Test Suite
```bash
npm run selenium:run-tests-coordinated  # All tests in sequence
```

### All Tests (Parallel)
```bash
npm run selenium:run-tests              # All tests simultaneously
```

## Benefits of This Structure

1. **Realistic Environment**: Mimics a real Bruin project structure
2. **Comprehensive Coverage**: Tests multiple asset types and configurations
3. **Isolation**: Each test can focus on specific functionality
4. **Reusability**: Shared assets and configurations reduce duplication
5. **Maintainability**: Centralized test environment makes updates easier
6. **Scalability**: Easy to add new assets or connection types