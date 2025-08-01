// Bruin asset schema definitions and constants

export interface BruinSchemaKeyInfo {
    key: string;
    insertText: string;
    description: string;
}

export interface BruinSchema {
    topLevelKeys: BruinSchemaKeyInfo[];
    assetTypes: string[];
    materializationTypes: string[];
    tableStrategies: string[];
    materializationKeys: string[];
}

export const BRUIN_SCHEMA: BruinSchema = {
    topLevelKeys: [
        { key: 'type', insertText: 'type: ', description: 'Asset type' },
        { key: 'description', insertText: 'description: ', description: 'Human-readable description' }, 
        { key: 'materialization', insertText: 'materialization:\n  ', description: 'Materialization config' },
        { key: 'depends', insertText: 'depends:\n  - ', description: 'Dependencies' },
        { key: 'columns', insertText: 'columns:\n  - name: ', description: 'Column definitions' }
    ],
    assetTypes: ['bq.sql', 'sf.sql', 'pg.sql', 'rs.sql', 'ms.sql', 'synapse.sql', 'python', 'ingestr'],
    materializationTypes: ['table', 'view', 'none'],
    tableStrategies: [
        'create+replace', 'delete+insert', 'append', 'merge',
        'time_interval', 'ddl', 'scd2_by_time', 'scd2_by_column'
    ],
    materializationKeys: [
        'type', 'strategy', 'partition_by', 'cluster_by', 'incremental_key', 'time_granularity'
    ]
};