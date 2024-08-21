export const formatConnectionName = (option) => {
    const map = {
      mongo_db: "MongoDB",
      amazon_web_services: "Amazon Web Services (AWS)",
      ms_sql: "MsSQL",
      mysql: "MySQL",
      google_cloud_platform: "Google Cloud Platform",
      azure_synapse: "Azure Synapse",
      databricks: "Databricks",
      postgresql: "PostgreSQL",
      redshift: "Redshift",
      snowflake: "Snowflake",
      shopify: "Shopify",
      gorgias: "Gorgias",
      notion: "Notion",
      generic_secret: "Generic Secret",
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
    "amazon_web_services",
    "azure_synapse",
    "databricks",
    "google_cloud_platform",
    "mongo_db",
    "ms_sql",
    "mysql",
    "postgresql",
    "redshift",
    "snowflake",
    "shopify",
    "gorgias",
    "notion",
    "generic_secret",
  ];
  
  export const connectionConfig = {
    databricks: [
      { id: "personal_token", label: "Personal Token", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number" },
      { id: "path", label: "Path", type: "text" },
      { id: "catalog", label: "Catalog", type: "text" },
      { id: "schema", label: "Schema", type: "text" },
    ],
    postgresql: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number" },
      { id: "schema", label: "Schema", type: "text" },
    ],
    amazon_web_services: [
      { id: "access_key_id", label: "Access Key ID", type: "text" },
      { id: "secret_access_key", label: "Secret Access Key", type: "password" },
    ],
    google_cloud_platform: [
      { id: "project_id", label: "Project ID", type: "text" },
      { id: "bigquery_schema", label: "BigQuery Schema", type: "text" },
      { id: "bigquery_location", label: "BigQuery Location", type: "text" },
      { id: "service_account_json", label: "Service Account JSON", type: "textarea" },
    ],
    ms_sql: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number" },
      { id: "database", label: "Database", type: "text" },
    ],
    mysql: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number" },
      { id: "database", label: "Database", type: "text" },
      { id: "driver", label: "Driver", type: "text" },
    ],
    redshift: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number", defaultValue: 5439 },
      { id: "database", label: "Database", type: "text" },
      { id: "schema", label: "Schema", type: "text" },
      { id: "ssl_mode", label: "SSL Mode", type: "select", options: ["disable", "require"] },
    ],
    snowflake: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "account", label: "Account", type: "text" },
      { id: "warehouse", label: "Warehouse", type: "text" },
      { id: "database", label: "Database", type: "text" },
      { id: "schema", label: "Schema", type: "text" },
      { id: "role", label: "Role", type: "text" },
      { id: "region", label: "Region", type: "text" },
    ],
    azure_synapse: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number" },
      { id: "database", label: "Database", type: "text" },
    ],
    mongo_db: [
      { id: "username", label: "Username", type: "text" },
      { id: "password", label: "Password", type: "password" },
      { id: "host", label: "Host", type: "text" },
      { id: "port", label: "Port", type: "number" },
      { id: "database", label: "Database", type: "text" },
    ],
    notion: [{ id: "api_key", label: "API Key", type: "password" }],
    shopify: [
      { id: "api_key", label: "API Key", type: "password" },
      { id: "url", label: "URL", type: "text" },
    ],
    gorgias: [
      { id: "api_key", label: "API Key", type: "password" },
      { id: "domain", label: "domain", type: "text" },
      { id: "email", label: "Email", type: "text" },
    ],
    generic_secret: [{ id: "value", label: "Value", type: "text" }],
  };