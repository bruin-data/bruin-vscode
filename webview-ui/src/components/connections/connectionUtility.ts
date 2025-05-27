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
        .filter((prop) => prop !== "name" && prop !== "service_account_file") // Exclude the 'name' field
        .map((prop) => {
          const propDef = connectionDef.properties[prop];
          let inputType = "text";
          if (prop === "players" && type === "chess") {
            inputType = "csv";
          } else if (prop === "password" || prop === "secret") {
            inputType = "password";
          } else if (propDef.type === "string") {
            inputType = "text";
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
            required: connectionDef.required.includes(prop),
            defaultValue: propDef.default,
            options: propDef.enum,
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

