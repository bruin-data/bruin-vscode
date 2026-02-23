import * as vscode from 'vscode';

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

        const assetTypes = [
            { name: 'python', description: 'Python asset' },
            { name: 'sf.sql', description: 'Snowflake SQL asset' },
            { name: 'sf.source', description: 'Snowflake source asset' },
            { name: 'sf.sensor.query', description: 'Snowflake sensor query asset' },
            { name: 'bq.sql', description: 'BigQuery SQL asset' },
            { name: 'bq.source', description: 'BigQuery source asset' },
            { name: 'bq.sensor.table', description: 'BigQuery sensor table asset' },
            { name: 'bq.sensor.query', description: 'BigQuery sensor query asset' },
            { name: 'duckdb.sensor.query', description: 'DuckDB sensor query asset' },
            { name: 'pg.sensor.query', description: 'PostgreSQL sensor query asset' },
            { name: 'rs.sensor.query', description: 'Redshift sensor query asset' },
            { name: 'ms.sensor.query', description: 'Microsoft SQL Server sensor query asset' },
            { name: 'databricks.sensor.query', description: 'Databricks sensor query asset' },
            { name: 'synapse.sensor.query', description: 'Azure Synapse sensor query asset' },
            { name: 'clickhouse.sensor.query', description: 'ClickHouse sensor query asset' },
            { name: 'empty', description: 'Empty asset' },
            { name: 'pg.sql', description: 'PostgreSQL SQL asset' },
            { name: 'pg.source', description: 'PostgreSQL source asset' },
            { name: 'rs.sql', description: 'Redshift SQL asset' },
            { name: 'rs.source', description: 'Redshift source asset' },
            { name: 'ms.sql', description: 'Microsoft SQL Server SQL asset' },
            { name: 'ms.source', description: 'Microsoft SQL Server source asset' },
            { name: 'synapse.sql', description: 'Azure Synapse SQL asset' },
            { name: 'synapse.source', description: 'Azure Synapse source asset' },
            { name: 'ingestr', description: 'Ingestr asset' },
            { name: 'duckdb.sql', description: 'DuckDB SQL asset' },
            { name: 'duckdb.seed', description: 'DuckDB seed asset' },
            { name: 'duckdb.source', description: 'DuckDB source asset' },
            { name: 'emr_serverless.spark', description: 'EMR Serverless Spark asset' },
            { name: 'emr_serverless.pyspark', description: 'EMR Serverless PySpark asset' },
            { name: 'athena.sql', description: 'Athena SQL asset' },
            { name: 'athena.seed', description: 'Athena seed asset' },
            { name: 'athena.source', description: 'Athena source asset' },
            { name: 'bq.seed', description: 'BigQuery seed asset' },
            { name: 'clickhouse.sql', description: 'ClickHouse SQL asset' },
            { name: 'clickhouse.seed', description: 'ClickHouse seed asset' },
            { name: 'clickhouse.source', description: 'ClickHouse source asset' },
            { name: 'databricks.sql', description: 'Databricks SQL asset' },
            { name: 'databricks.seed', description: 'Databricks seed asset' },
            { name: 'databricks.source', description: 'Databricks source asset' },
            { name: 'ms.seed', description: 'Microsoft SQL Server seed asset' },
            { name: 'pg.seed', description: 'PostgreSQL seed asset' },
            { name: 'rs.seed', description: 'Redshift seed asset' },
            { name: 'sf.seed', description: 'Snowflake seed asset' },
            { name: 'synapse.seed', description: 'Azure Synapse seed asset' },
            { name: 'looker', description: 'Looker asset' },
            { name: 'powerbi', description: 'Power BI asset' },
            { name: 'qliksense', description: 'Qlik Sense asset' },
            { name: 'qlikview', description: 'QlikView asset' },
            { name: 'sisense', description: 'Sisense asset' },
            { name: 'domo', description: 'Domo asset' },
            { name: 'quicksight', description: 'Amazon QuickSight asset' },
            { name: 'oracle.sql', description: 'Oracle SQL asset' },
            { name: 'oracle.source', description: 'Oracle source asset' }
        ];

        assetTypes.forEach(type => {
            const completion = new vscode.CompletionItem(type.name, vscode.CompletionItemKind.Value);
            completion.detail = type.description;
            completion.documentation = new vscode.MarkdownString(`**${type.name}**\n\n${type.description}`);
            completion.insertText = type.name;
            completions.push(completion);
        });

        return completions;
    }
} 