import * as vscode from 'vscode';
import { ASSET_TYPES } from './assetTypes';

// Human-readable platform names keyed by the connection prefix of an asset type
// (the part before the first dot, e.g. `bq` in `bq.sql`).
const PLATFORM_LABELS: Record<string, string> = {
    bq: 'BigQuery',
    sf: 'Snowflake',
    pg: 'PostgreSQL',
    rs: 'Redshift',
    ms: 'Microsoft SQL Server',
    synapse: 'Azure Synapse',
    fabric: 'Microsoft Fabric',
    duckdb: 'DuckDB',
    motherduck: 'MotherDuck',
    athena: 'Athena',
    clickhouse: 'ClickHouse',
    databricks: 'Databricks',
    oracle: 'Oracle',
    my: 'MySQL',
    trino: 'Trino',
    dremio: 'Dremio',
    vertica: 'Vertica',
    sail: 'Sail',
    fw: 'Microsoft Fabric',
    emr_serverless: 'EMR Serverless',
    dataproc_serverless: 'Dataproc Serverless',
    s3: 'S3',
    tableau: 'Tableau',
    looker: 'Looker',
    powerbi: 'Power BI',
    quicksight: 'Amazon QuickSight'
};

// Human-readable descriptions for the part of an asset type after its platform
// prefix (the "kind").
const KIND_LABELS: Record<string, string> = {
    sql: 'SQL asset',
    source: 'source asset',
    seed: 'seed asset',
    spark: 'Spark asset',
    pyspark: 'PySpark asset',
    dashboard: 'dashboard asset',
    dataset: 'dataset asset',
    datasource: 'datasource asset',
    workbook: 'workbook asset',
    worksheet: 'worksheet asset',
    'sensor.query': 'sensor query asset',
    'sensor.table': 'sensor table asset',
    'sensor.key_sensor': 'key sensor asset'
};

// Asset types with no platform/kind structure get an explicit label.
const STANDALONE_LABELS: Record<string, string> = {
    python: 'Python asset',
    r: 'R asset',
    ingestr: 'Ingestr asset',
    empty: 'Empty asset',
    tableau: 'Tableau asset',
    looker: 'Looker asset',
    looker_studio: 'Looker Studio asset',
    powerbi: 'Power BI asset',
    quicksight: 'Amazon QuickSight asset',
    metabase: 'Metabase asset',
    gooddata: 'GoodData asset',
    grafana: 'Grafana asset',
    redash: 'Redash asset',
    superset: 'Superset asset',
    modebi: 'Mode asset',
    qliksense: 'Qlik Sense asset',
    qlikview: 'QlikView asset',
    sisense: 'Sisense asset',
    domo: 'Domo asset',
    dynamodb: 'DynamoDB asset',
    elasticsearch: 'Elasticsearch asset',
    'agent.claude_code': 'Claude Code agent asset'
};

/**
 * Produce a human-readable description for an asset type string. The Bruin CLI
 * grows new asset types frequently, so descriptions are derived from the type's
 * `<platform>.<kind>` shape rather than maintained by hand.
 */
export function describeAssetType(type: string): string {
    if (Object.prototype.hasOwnProperty.call(STANDALONE_LABELS, type)) {
        return STANDALONE_LABELS[type];
    }
    const firstDot = type.indexOf('.');
    if (firstDot === -1) {
        return `${type} asset`;
    }
    const prefix = type.slice(0, firstDot);
    const kind = type.slice(firstDot + 1);
    const platform = PLATFORM_LABELS[prefix] ?? prefix;
    const kindLabel = KIND_LABELS[kind] ?? `${kind.replace(/[._]/g, ' ')} asset`;
    return `${platform} ${kindLabel}`;
}

export class TopLevelCompletions {
    /**
     * Get top-level asset property completions
     */
    public getTopLevelCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        const basicProperties = [
            { name: 'name', description: 'The name of the asset' },
            { name: 'type', description: 'The type of the asset' },
            { name: 'owner', description: 'The owner of the asset' },
            { name: 'description', description: 'A brief description of the asset' },
            { name: 'depends', description: 'Dependencies for this asset' },
            { name: 'materialization', description: 'Materialization details for this asset' },
            { name: 'columns', description: 'Columns for this asset' },
            { name: 'custom_checks', description: 'Custom checks for this asset' },
            { name: 'secrets', description: 'Secrets for this asset' }
        ];

        basicProperties.forEach(prop => {
            const completion = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
            completion.detail = prop.description;
            completion.documentation = new vscode.MarkdownString(`**${prop.name}**\n\n${prop.description}`);
            
            // Special handling for properties that need structured input
            if (prop.name === 'materialization') {
                completion.insertText = new vscode.SnippetString(`${prop.name}:\n  type: \${1|table,view,none|}`);
            } else if (prop.name === 'depends') {
                completion.insertText = new vscode.SnippetString(`${prop.name}:\n  - `);
            } else if (prop.name === 'columns') {
                completion.insertText = new vscode.SnippetString(`${prop.name}:\n  - name: `);
            } else if (prop.name === 'secrets') {
                completion.insertText = new vscode.SnippetString(`${prop.name}:\n  - key: \${1:connection_name}\n    inject_as: \${2:creds}`);
            } else {
                completion.insertText = `${prop.name}: `;
            }
            
            completions.push(completion);
        });

        return completions;
    }

    /**
     * Get asset type completions
     */
    public getAssetTypeCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];

        ASSET_TYPES.forEach(name => {
            const description = describeAssetType(name);
            const completion = new vscode.CompletionItem(name, vscode.CompletionItemKind.Value);
            completion.detail = description;
            completion.documentation = new vscode.MarkdownString(`**${name}**\n\n${description}`);
            completion.insertText = name;
            completions.push(completion);
        });

        return completions;
    }
} 