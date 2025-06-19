<template>
  <div class="relative bg-editorWidget-bg shadow sm:rounded-lg p-4 max-w-2xl mx-auto">
    <form @submit.prevent="submitForm" class="w-full" novalidate>
      <div class="space-y-6 w-full">
        <h3 class="text-lg font-medium text-editor-fg">
          {{ isEditing ? "Edit Connection" : "New Connection" }}
        </h3>
        <div class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-6">
          <FormField
            v-for="field in formFields"
            :key="field.id"
            v-bind="field"
            :modelValue="form[field.id]"
            @update:modelValue="updateField(field.id, $event)"
            :required="field.required"
            @fileSelected="handleFileSelected"
            @updateServiceAccountInputMethod="handleServiceAccountInputMethodChange"
            :isInvalid="!!validationErrors[field.id]"
            :errorMessage="validationErrors[field.id]"
            :defaultValue="getDefaultValue(field)"
            :serviceAccountInputMethod="field.id === 'service_account_json' ? serviceAccountInputMethod : undefined"
            :serviceAccountFile="field.id === 'service_account_json' ? selectedFile : undefined"
          />
        </div>
   <!--      <vscode-button
          appearance="secondary"
          @click="testConnection"
          class="p-1 text-sm font-semibold"
        >
          Test Connection
        </vscode-button> -->
      </div>
      <div class="mt-6 flex justify-end space-x-1 w-full">
        <vscode-button
          appearance="secondary"
          @click="$emit('cancel')"
          class="p-1 text-sm font-semibold"
        >
          Cancel
        </vscode-button>
        <vscode-button type="submit" class="p-1 text-sm font-semibold" @click="submitForm">
          {{ isEditing ? "Save Changes" : "Create" }}
        </vscode-button>
      </div>
    </form>
    <button
      @click="$emit('cancel')"
      class="absolute top-2 right-0 text-descriptionFg hover:text-editor-fg -mr-2 -pr-4"
    >
      <XMarkIcon class="h-6 w-6" />
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, defineEmits, defineProps, onMounted } from "vue";
import FormField from "./FormField.vue";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import { useConnectionsStore } from "@/store/bruinStore";
import { generateConnectionConfig } from "./connectionUtility";

const connectionsStore = useConnectionsStore();

const connectionSchema = connectionsStore.connectionsSchema;
const { connectionConfig, connectionTypes } = generateConnectionConfig(connectionSchema);

const orderedConnectionTypes = computed(() => {
  return connectionTypes.sort((a, b) => a.localeCompare(b));
});

const emit = defineEmits(["submit", "cancel"]);

const props = defineProps({
  connection: {
    type: Object,
    default: () => ({}),
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  environments: {
    type: Array,
    required: true,
  },
  error: Object,
});

const defaultEnvironment = computed(() => connectionsStore.getDefaultEnvironment());

const getDefaultValue = (field) => {
  if (field.id === "environment") {
    return defaultEnvironment.value;
  }
  return field.defaultValue;
};

const form = ref({
  connection_type: "",
  connection_name: "",
  environment: defaultEnvironment.value, // Set default environment here
});

// Watch for changes in the default environment
watch(defaultEnvironment, (newDefault) => {
  if (!form.value.environment) {
    form.value.environment = newDefault; // Set it only if not already set
  }
});

const validationErrors = ref({});
const selectedFile = ref(null);
const serviceAccountInputMethod = ref("file");

// Determine the service account input method based on the connection data
const determineServiceAccountInputMethod = (connection) => {
  if (connection.service_account_file) {
    return "file";
  } else if (connection.service_account_json) {
    return "text";
  }
  return "file"; // default
};

// Get the service account file object for the FormField
const getServiceAccountFile = (connection) => {
  if (connection.service_account_file) {
    // Extract filename from path
    const pathParts = connection.service_account_file.split('/');
    const fileName = pathParts[pathParts.length - 1];
    return {
      name: fileName,
      path: connection.service_account_file
    };
  }
  return null;
};

// Update form fields to include environment
const formFields = computed(() => [
  {
    id: "connection_type",
    label: "Connection Type",
    type: "select",
    options: orderedConnectionTypes.value,
    required: true,
  },
  {
    id: "connection_name",
    label: "Connection Name",
    type: "text",
    required: true,
  },
  {
    id: "environment",
    label: "Environment",
    type: "select",
    options: props.environments,
    required: true,
  },
  ...(connectionConfig[form.value.connection_type] || []).map((field) => ({
    ...field,
    value: form.value[field.id] || "",
  })),
]);

watch(
  () => props.error,
  (newError) => {
    if (newError) {
      validationErrors.value = { [newError.field]: newError.message };
    } else {
      validationErrors.value = {};
    }
  },
  { deep: true }
);

// Watch for connection updates
watch(
  () => props.connection,
  (newConnection) => {
    console.log("Connection data received:", newConnection);
    if (Object.keys(newConnection).length > 0) {
      // Only update form if not already populated
      if (!form.value.connection_name) {
        form.value = {
          connection_type: newConnection.type || "",
          connection_name: newConnection.name || "",
          environment: newConnection.environment || defaultEnvironment.value,
          ...newConnection.credentials,
        };
      }
      
      if (newConnection.type === "google_cloud_platform") {
        serviceAccountInputMethod.value = determineServiceAccountInputMethod(newConnection);
        console.log("Service account input method set to:", serviceAccountInputMethod.value);
        
        if (newConnection.service_account_file) {
          selectedFile.value = getServiceAccountFile(newConnection);
          console.log("Service account file set to:", selectedFile.value);
          form.value.service_account_json = "";
        } else if (newConnection.service_account_json) {
          selectedFile.value = null;
          console.log("Service account JSON found, setting text input");
          form.value.service_account_json = newConnection.service_account_json;
        }
      }
    }
    
    validationErrors.value = {};
  },
  { immediate: true, deep: true }
);

watch(
  () => form.value.connection_type,
  (newType) => {
    if (newType) {
      const config = connectionConfig[newType] || [];
      config.forEach((field) => {
        if (field.defaultValue !== undefined) {
          form.value[field.id] = field.defaultValue;
        }
      });
    }
  },
  { immediate: true }
);

const handleFileSelected = (file) => {
  selectedFile.value = file; // Use file name

  // Clear the service_account_json field if a file is selected
  form.value.service_account_json = "";

  // Clear the error for service_account_json when a file is selected
  validationErrors.value.service_account_json = null;
};

const handleServiceAccountInputMethodChange = (newMethod) => {
  serviceAccountInputMethod.value = newMethod;
  
  if (newMethod === "file") {
    // Clear text input when switching to file
    form.value.service_account_json = "";
    selectedFile.value = null;
  } else {
    // Clear file when switching to text
    selectedFile.value = null;
  }
  
  // Clear validation errors
  validationErrors.value.service_account_json = null;
};

const updateField = (fieldId, value) => {
  form.value[fieldId] = value;
  // Clear the error for this field when it's updated
  if (validationErrors.value[fieldId]) {
    validationErrors.value[fieldId] = null;
  }
  // Clear the selected file if service_account_json is updated manually
  if (fieldId === "service_account_json" && value) {
    selectedFile.value = null;
  }
};

const validateForm = () => {
  const errors = {};
  formFields.value.forEach((field) => {
    if (field.required && !form.value[field.id]) {
      if (field.id === "service_account_json") {
        // For service_account_json, check if either file is selected OR text is provided
        if (!selectedFile.value && !form.value.service_account_json) {
          errors[field.id] = "This field is required";
        }
      } else {
        errors[field.id] = "This field is required";
      }
    }
    
    // Validate private key format for Snowflake connections
    if (field.id === "private_key" && form.value[field.id]) {
      const privateKey = form.value[field.id];
      const hasStandardKey = privateKey.includes("-----BEGIN PRIVATE KEY-----") && 
                            privateKey.includes("-----END PRIVATE KEY-----");
      const hasEncryptedKey = privateKey.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----") && 
                             privateKey.includes("-----END ENCRYPTED PRIVATE KEY-----");
      
      if (!hasStandardKey && !hasEncryptedKey) {
        errors[field.id] = "Private key must be in PEM format with BEGIN and END markers";
      }
    }
  });
  
  // Special validation for Snowflake connections - require either password or private_key
  if (form.value.connection_type === "snowflake") {
    const hasPassword = !!form.value.password;
    const hasPrivateKey = !!form.value.private_key;
    
    if (!hasPassword && !hasPrivateKey) {
      errors.password = "Either password or private key is required for Snowflake connections";
      errors.private_key = "Either password or private key is required for Snowflake connections";
    }
  }
  
  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const submitForm = () => {
  if (!validateForm()) {
    return;
  }

  const connectionData = {
    name: form.value.connection_name,
    type: form.value.connection_type,
    environment: form.value.environment,
    credentials: {},
  };

  // Preserve the id field if it exists (for editing existing connections)
  if (form.value.id) {
    connectionData.id = form.value.id;
  }

  formFields.value.forEach((field) => {
    if (
      field.id !== "connection_type" &&
      field.id !== "connection_name" &&
      field.id !== "environment" &&
      field.id !== "id" // Don't include id in credentials
    ) {
      // Special handling for Google Cloud Platform service account
      if (form.value.connection_type === "google_cloud_platform" && field.id === "service_account_json") {
        // If a file is selected, use the file path
        if (selectedFile.value) {
          connectionData.credentials.service_account_file = selectedFile.value.path;
        }
        // If text is provided, use the text content
        if (form.value.service_account_json) {
          connectionData.credentials.service_account_json = form.value.service_account_json;
        }
      } else {
        // For other connection types, add fields as before
        connectionData.credentials[field.id] = form.value[field.id];
      }
    }
  });

  console.log("============connection credentials============");
  console.log(connectionData.credentials);
  
  // Debug: Log private key if present
  if (connectionData.credentials.private_key) {
    console.log("============PRIVATE KEY BEING SENT============");
    console.log(connectionData.credentials.private_key);
    console.log("============PRIVATE KEY LENGTH============");
    console.log(connectionData.credentials.private_key.length);
  }
  
  // Debug: Log all Snowflake credentials
  if (connectionData.type === "snowflake") {
    console.log("============SNOWFLAKE CONNECTION DEBUG============");
    console.log("Account:", connectionData.credentials.account);
    console.log("Username:", connectionData.credentials.username);
    console.log("Has Password:", !!connectionData.credentials.password);
    console.log("Has Private Key:", !!connectionData.credentials.private_key);
    console.log("Role:", connectionData.credentials.role);
    console.log("Database:", connectionData.credentials.database);
    console.log("Warehouse:", connectionData.credentials.warehouse);
  }

  emit("submit", connectionData);
};


</script>
<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}
</style>
