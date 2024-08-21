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