<template>
  <div class="relative bg-editorWidget-bg shadow sm:rounded-lg p-4 max-w-2xl mx-auto">
    <form id="connection-form" @submit.prevent="submitForm" class="w-full" novalidate>
      <div class="space-y-6 w-full">
        <h3 id="connection-form-title" class="text-lg font-medium text-editor-fg">
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
            @updateUseApplicationDefaultCredentials="handleUseApplicationDefaultCredentialsChange"
            :isInvalid="!!validationErrors[field.id]"
            :errorMessage="validationErrors[field.id]"
            :defaultValue="getDefaultValue(field)"
            :serviceAccountInputMethod="field.id === 'service_account_json' ? serviceAccountInputMethod : undefined"
            :serviceAccountFile="field.id === 'service_account_json' ? selectedFile : undefined"
            :useApplicationDefaultCredentials="field.id === 'use_application_default_credentials' ? applyDefaultCredentials : undefined"
          />
        </div>
      </div>
      <div class="mt-6 flex justify-end space-x-1 w-full">
        <vscode-button
          id="cancel-connection-button"
          appearance="secondary"
          @click="$emit('cancel')"
          class="p-1 text-sm font-semibold"
        >
          Cancel
        </vscode-button>
        <vscode-button id="submit-connection-button" type="submit" class="p-1 text-sm font-semibold" @click="submitForm">
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
import { generateConnectionConfig, supportsApplicationDefaultCredentials } from "./connectionUtility";

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
  use_application_default_credentials: false,
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
  } else if (connection.use_application_default_credentials) {
    return "default";
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

const applyDefaultCredentials = (connection) => {
  return connection.use_application_default_credentials;
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
      
      if (supportsApplicationDefaultCredentials(newConnection.type, connectionSchema)) {
        const credentials = newConnection.credentials || newConnection;
        serviceAccountInputMethod.value = determineServiceAccountInputMethod(credentials);

        // Always preserve use_application_default_credentials for GCP connections
        if (credentials.use_application_default_credentials !== undefined) {
          form.value.use_application_default_credentials = credentials.use_application_default_credentials;
        }

        if (credentials.service_account_file) {
          selectedFile.value = getServiceAccountFile(credentials);
          form.value.service_account_json = "";
        } else if (credentials.service_account_json) {
          selectedFile.value = null;
          form.value.service_account_json = credentials.service_account_json;
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
    form.value.use_application_default_credentials = false;
    selectedFile.value = null;
  } else if (newMethod === "text") {
    // Clear file when switching to text
    form.value.use_application_default_credentials = false;
    selectedFile.value = null;
  } else if (newMethod === "default") {
    // Clear both file and text when switching to default
    form.value.service_account_json = "";
    form.value.use_application_default_credentials = true;
    selectedFile.value = null;
  }

  // Clear validation errors
  validationErrors.value.service_account_json = null;
};

const handleUseApplicationDefaultCredentialsChange = (value) => {
  form.value.use_application_default_credentials = value;
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
  
  // Special validation for Snowflake connections - require either password, private_key or private_key_path
  if (form.value.connection_type === "snowflake") {
    const hasPassword = !!form.value.password;
    const hasPrivateKey = !!form.value.private_key;
    const hasPrivateKeyPath = !!form.value.private_key_path;

    if (!hasPassword && !hasPrivateKey && !hasPrivateKeyPath) {
      const errorMsg = "Either password or private key is required for Snowflake connections";
      errors.password = errorMsg;
      errors.private_key = errorMsg;
      errors.private_key_path = errorMsg;
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

  const supportsDefaultCreds = supportsApplicationDefaultCredentials(form.value.connection_type, connectionSchema);
  // Handle both boolean true and string "true"
  const useDefaultCreds = form.value.use_application_default_credentials === true || form.value.use_application_default_credentials === "true";

  formFields.value.forEach((field) => {
    if (
      field.id !== "connection_type" &&
      field.id !== "connection_name" &&
      field.id !== "environment" &&
      field.id !== "id"
    ) {
      if (supportsDefaultCreds && field.id === "service_account_json") {
        if (!useDefaultCreds) {
          if (selectedFile.value) {
            connectionData.credentials.service_account_file = selectedFile.value.path;
          }
          if (form.value.service_account_json && form.value.service_account_json.trim() !== "") {
            connectionData.credentials.service_account_json = form.value.service_account_json;
          }
        }
      } else {
        connectionData.credentials[field.id] = form.value[field.id];
      }
    }
  });

  if (supportsDefaultCreds && useDefaultCreds) {
    connectionData.credentials.use_application_default_credentials = true;
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
