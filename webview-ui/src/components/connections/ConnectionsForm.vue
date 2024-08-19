<template>
  <div class="bg-editorWidget-bg shadow sm:rounded-lg p-6 max-w-2xl mx-auto">
    <form @submit.prevent="submitForm" class="w-full">
      <div class="space-y-6 w-full">
        <div class="border-b border-editorInlayHint-fg pb-6">
          <h2 class="text-base font-semibold leading-7 text-editor-fg">New Connection</h2>
          <div class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-6">
            <FormField
              id="connection_type"
              label="Connection Type"
              type="select"
              :options="connectionTypes"
              v-model="form.connection_type"
            />

            <FormField
              id="connection_name"
              label="Connection Name"
              type="text"
              v-model="form.connection_name"
            />

            <template v-if="form.connection_type === 'slack'">
              <div class="sm:col-span-4">
                <vscode-button
                  @click="connectSlack"
                  class="rounded-md px-4 py-2 text-sm font-semibold"
                >
                  Connect to Slack
                </vscode-button>
              </div>
            </template>

            <template v-else>
              <FormField
                v-for="field in connectionFields"
                :key="field.id"
                v-bind="field"
                v-model="form[field.id]"
              />
            </template>
          </div>
        </div>
      </div>

      <div class="mt-6 flex justify-end w-full">
        <vscode-button type="submit" class="rounded-md px-4 py-2 text-sm font-semibold">
          Create
        </vscode-button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import FormField from "./FormField.vue";

const emit = defineEmits(['submit', 'cancel']);

const connectionTypes = [
  "amazone_web_services",
  "azure_synapse",
  "databricks",
  "google_cloud_platform",
  "gorgias",
  "mango_db",
  "ms_sql",
  "ms_teams",
  "mysql",
  "notion",
  "postgresql",
  "redshift",
  "snowflake",
  "shopify",
  /*   "slack",
   */
  "generic_secret",
];

const connectionConfig = {
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
  amazone_web_services: [
    { id: "access_key_id", label: "Access Key ID", type: "text" },
    { id: "secret_access_key", label: "Secret Access Key", type: "password" },
  ],
  google_cloud_platform: [
    { id: "project_id", label: "Project ID", type: "text" },
    { id: "bigquery_schema", label: "BigQuery Schema", type: "text" },
    { id: "bigquery_location", label: "BigQuery Location", type: "text" },
    { id: "service_account_json", label: "Service Account JSON", type: "text" },
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
  mango_db: [
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
  ms_teams: [{ id: "webhook_url", label: "Webhook Url", type: "text" }],
  generic_secret: [{ id: "value", label: "Value", type: "text" }],
};

const form = ref({
  connection_type: "",
  connection_name: "",
});

const connectionFields = computed(() => {
  const fields = connectionConfig[form.value.connection_type] || [];
  return fields.map((field) => ({
    ...field,
    modelValue: form.value[field.id] || field.defaultValue || "",
  }));
});

const submitForm = () => {
  console.log("Form submitted:", form.value);
  emit('submit', {
    name: form.value.connection_name,
    type: form.value.connection_type,
    // Add other relevant fields
  });
};

const connectSlack = () => {
  console.log("Connecting to Slack...");
  // Implement Slack connection logic here
};
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}
</style>
