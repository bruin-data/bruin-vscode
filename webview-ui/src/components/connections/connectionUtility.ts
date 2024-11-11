export const generateConnectionConfig = (schema: any) => {
  if (!schema || !schema.$defs || !schema.$defs.Connections || !schema.$defs.Connections.properties) {
    throw new Error("Invalid schema format");
  }

  const connectionTypes = Object.keys(schema.$defs.Connections.properties);
  const connectionConfig = {};

  connectionTypes.forEach((type) => {
    const connectionRef = schema.$defs.Connections.properties[type].items.$ref;
    const connectionDefKey = connectionRef.split('/').pop();
    const connectionDef = schema.$defs[connectionDefKey];
if (connectionDef) {
      connectionConfig[type] = Object.keys(connectionDef.properties)
        .filter((prop) => prop !== 'name') // Exclude the 'name' field
        .map((prop) => {
          const propDef = connectionDef.properties[prop];
          let inputType = 'text';
          if (propDef.type === 'string') {
            inputType = 'text';
          } else if (propDef.type === 'integer') {
            inputType = 'number';
          } else if (propDef.type === 'array' && propDef.items.type === 'string') {
            inputType = 'multi-select';
          } else {
            inputType = propDef.type;
          }
          return {
            id: prop,
            label: prop.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            type: inputType,
            required: connectionDef.required.includes(prop),
            defaultValue: propDef.default,
            options: propDef.enum,
          };
        });
    }
  });

  return { connectionTypes, connectionConfig };
};

export const formatConnectionName = (option) => {
  const map = {
    mongo: "MongoDB",
    aws: "Amazon Web Services (AWS)",
    athena: "Athena",
    mssql: "Microsoft SQL Server",
    mysql: "MySQL",
    google_cloud_platform: "Google Cloud Platform",
    synapse: "Azure Synapse",
    databricks: "Databricks",
    chess: "Chess",
    hana: "HANA",
    shopify: "Shopify",
    gorgias: "Gorgias",
    klaviyo: "Klaviyo",
    adjust: "Adjust",
    generic: "Generic",
    facebookads: "Facebook Ads",
    stripe: "Stripe",
    appsflyer: "Appsflyer",
    kafka: "Kafka",
    duckdb: "DuckDB",
    hubspot: "Hubspot",
    google_sheets: "Google Sheets",
    airtable: "Airtable",
    zendesk: "Zendesk",
    s3: "S3",
    slack: "Slack",
  };

  return map[option] || option;
};

