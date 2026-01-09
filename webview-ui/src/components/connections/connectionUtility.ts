export const generateConnectionConfig = (schema: any) => {
  if (
    !schema ||
    !schema.$defs ||
    !schema.$defs.Connections ||
    !schema.$defs.Connections.properties
  ) {
    throw new Error("Invalid schema format");
  }

  const connectionTypes = Object.keys(schema.$defs.Connections.properties);
  const connectionConfig = {};

  connectionTypes.forEach((type) => {
    const connectionRef = schema.$defs.Connections.properties[type].items.$ref;
    const connectionDefKey = connectionRef.split("/").pop();
    const connectionDef = schema.$defs[connectionDefKey];
    if (connectionDef) {
      connectionConfig[type] = Object.keys(connectionDef.properties)
        .filter((prop) =>
          prop !== "name" &&
          prop !== "service_account_file" &&
          prop !== "use_application_default_credentials" &&
          // Remove deprecated S3 fields only for S3 connections
          !(type === "s3" && (prop === "bucket_name" || prop === "path_to_file"))
        )
        .map((prop) => {
          const propDef = connectionDef.properties[prop];
          let inputType = "text";
          let rows: number | undefined = undefined;
          let cols: number | undefined = undefined;
          let required = connectionDef.required.includes(prop);

          // Endpoint URL and Layout are optional for S3 connections
          if (prop === "endpoint_url" || prop === "layout") {
            required = false;
          }
          
          if (prop === "players" && type === "chess") {
            inputType = "csv";
          } else if (prop === "password" || prop === "secret") {
            inputType = "password";
          } else if (propDef.type === "string") {
            inputType = "text";
          } else if (prop === "private_key") {
            inputType = "textarea";
            rows = 10;
            cols = 80;
          } else if (propDef.type === "integer") {
            inputType = "number";
          } else if (propDef.type === "array" && propDef.items.type === "string") {
            inputType = "multi-select";
          } else {
            inputType = propDef.type;
          }
          return {
            id: prop,
            label: prop.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            type: inputType,
            required: required,
            defaultValue: propDef.default,
            options: propDef.enum,
            rows: rows,
            cols: cols,
          };
        });
    }
  });

  return { connectionTypes, connectionConfig };
};
const titleCase = (str: string) : string => {
  return str.toLowerCase().split(' ')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');
}
export const formatConnectionName = (option) => {
  const map = {
    mongo: "MongoDB",
    aws: "Amazon Web Services (AWS)",
    mssql: "Microsoft SQL Server",
    mysql: "MySQL",
    google_cloud_platform: "Google Cloud Platform",
    synapse: "Azure Synapse",
    hana: "HANA",
    facebookads: "Facebook Ads",
    tiktokads: "TikTok Ads",
    linkedinads: "LinkedIn Ads",
    duckdb: "DuckDB",
    spanner: "Gcloud Spanner",
    google_sheets: "Google Sheets",
  };

  return map[option] || titleCase(option);
};

export const orderConnectionsAsc = (connections: any[]) => {
  connections.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
};

export const supportsApplicationDefaultCredentials = (connectionType: string, schema: any): boolean => {
  if (!connectionType) {
    return false;
  }

  if (schema && schema.$defs && schema.$defs.Connections && schema.$defs.Connections.properties) {
    const connectionTypeDef = schema.$defs.Connections.properties[connectionType];
    if (connectionTypeDef && connectionTypeDef.items && connectionTypeDef.items.$ref) {
      const connectionDefKey = connectionTypeDef.items.$ref.split("/").pop();
      const connectionDef = schema.$defs[connectionDefKey];
      
      if (connectionDef && connectionDef.properties) {
        if (connectionDef.properties.hasOwnProperty("use_application_default_credentials")) {
          return true;
        }
      }
    }
  }

  const gcpRelatedPatterns = [
    'google_cloud_platform',
    'gcp',
    'gcs',
    'dataproc',
    'spanner',
    'bigquery',
    'google'
  ];
  
  const normalizedType = connectionType.toLowerCase();
  return gcpRelatedPatterns.some(pattern => normalizedType.includes(pattern));
};

