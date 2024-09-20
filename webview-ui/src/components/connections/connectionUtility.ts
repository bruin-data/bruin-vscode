export const formatConnectionName = (option) => {
    const map = {
      mongo: "MongoDB",
      aws: "Amazon Web Services (AWS)",
      mssql: "Microsoft SQL Server",
      mysql: "MySQL",
      google_cloud_platform: "Google Cloud Platform",
      synapse: "Azure Synapse",
      databricks: "Databricks",
      postgres: "PostgreSQL",
      redshift: "Redshift",
      snowflake: "Snowflake",
      shopify: "Shopify",
      gorgias: "Gorgias",
      notion: "Notion",
      generic: "Generic Secret",
    };
  
    return (
      map[option] ||
      option
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  export const connectionTypes = [
    "aws",
    "synapse",
    "databricks",
    "google_cloud_platform",
    "mongo",
    "mssql",
    "mysql",
    "postgres",
    "redshift",
    "snowflake",
    "shopify",
    "gorgias",
    "notion",
    "generic",
  ];
  
  export const connectionConfig = {
    databricks: [
      { id: "token", label: "Personal Token", type: "password", required: true },
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", required: true, defaultValue: 443 },
      { id: "path", label: "Path", type: "text", required: false },
      { id: "catalog", label: "Catalog", type: "text", required: false }, // do we need it ? it's not in the cli config
      { id: "schema", label: "Schema", type: "text", required: false },
    ],
    postgres: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true},
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", required: true, defaultValue: 5432 },
      { id: "database", label: "Database", type: "text", required: false },
      { id: "schema", label: "Schema", type: "text", required: false },
      { id: "pool_max_conns", label: "Pool Max Connections", type: "number", required: false, defaultValue: 10 },
      { id: "ssl_mode", label: "SSL Mode", type: "select", options: ["disable", "require"], required: false },
    ],
    aws: [
      { id: "access_key", label: "Access Key ID", type: "text", required: true },
      { id: "secret_key", label: "Secret Access Key", type: "password", required: true },
    ],
    google_cloud_platform: [
      { id: "project_id", label: "Project ID", type: "text", required: true },
      { id: "bigquery_schema", label: "BigQuery Schema", type: "text", required: false }, // do we need it ? it's not in the cli config
      { id: "location", label: "BigQuery Location", type: "text", required: false },
      { id: "service_account_json", label: "Service Account JSON", type: "textarea", required: true },
    ],
    mssql: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true },
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", required: true, defaultValue: 1433 },
      { id: "database", label: "Database", type: "text", required: false },
    ],
    mysql: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true },
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", required: true, defaultValue: 3306 },
      { id: "database", label: "Database", type: "text", required: false },
      { id: "driver", label: "Driver", type: "text", required: false },
    ],
    redshift: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true },
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", defaultValue: 5439, required: false },
      { id: "database", label: "Database", type: "text", required: true },
      { id: "schema", label: "Schema", type: "text", required: false },
      { id: "pool_max_conns", label: "Pool Max Connections", type: "number", required: false, defaultValue: 10 },
      { id: "ssl_mode", label: "SSL Mode", type: "select", options: ["disable", "require"], required: false },
    ],
    snowflake: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true },
      { id: "account", label: "Account", type: "text", required: true },
      { id: "warehouse", label: "Warehouse", type: "text", required: true },
      { id: "database", label: "Database", type: "text", required: true },
      { id: "schema", label: "Schema", type: "text", required: false },
      { id: "role", label: "Role", type: "text", required: false },
      { id: "region", label: "Region", type: "text", required: false },
    ],
    synapse: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true },
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", required: true, defaultValue: 1433 },
      { id: "database", label: "Database", type: "text", required: false },
    ],
    mongo: [
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true },
      { id: "host", label: "Host", type: "text", required: true },
      { id: "port", label: "Port", type: "number", required: true, defaultValue: 27017 },
      { id: "database", label: "Database", type: "text" , required: false},
    ],
    notion: [{ id: "api_key", label: "API Key", type: "password" , required: true}],
    shopify: [
      { id: "api_key", label: "API Key", type: "password", required: true},
      { id: "url", label: "URL", type: "text", required: true },
    ],
    gorgias: [
      { id: "api_key", label: "API Key", type: "password", required: true },
      { id: "domain", label: "domain", type: "text", required: true },
      { id: "email", label: "Email", type: "text", required: true },
    ],
    generic: [{ id: "value", label: "Value", type: "text", required: true }],
  };