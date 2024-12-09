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
            :isInvalid="!!validationErrors[field.id]"
            :errorMessage="validationErrors[field.id]"
            :defaultValue="getDefaultValue(field)"
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end w-full">
        <vscode-button
          appearance="secondary"
          @click="$emit('cancel')"
          class="mr-2 rounded-md px-4 py-2 text-sm font-semibold"
        >
          Cancel
        </vscode-button>
        <vscode-button
          type="submit"
          class="rounded-md px-4 py-2 text-sm font-semibold"
          @click="submitForm"
        >
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
import { ref, computed, watch, defineEmits, defineProps } from "vue";
import FormField from "./FormField.vue";
import { XMarkIcon } from "@heroicons/vue/20/solid";
import { useConnectionsStore } from "@/store/bruinStore";
import { generateConnectionConfig } from "./connectionUtility";
import { vscode } from "@/utilities/vscode";
const connectionsStore = useConnectionsStore();

const connectionSchema = connectionsStore.connectionsSchema;
const { connectionConfig, connectionTypes } = generateConnectionConfig(connectionSchema);

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

// Update form fields to include environment
const formFields = computed(() => [
  {
    id: "connection_type",
    label: "Connection Type",
    type: "select",
    options: connectionTypes,
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

// Watch for error updates
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
      form.value = {
        connection_type: newConnection.type || "",
        connection_name: newConnection.name || "",
        environment: newConnection.environment || defaultEnvironment.value,
        ...newConnection.credentials,
      };
    } else {
      // Reset form when creating a new connection
      form.value = {
        connection_type: "",
        connection_name: "",
        environment: defaultEnvironment.value,
      };
    }
    validationErrors.value = {};
    selectedFile.value = null;
  },
  { immediate: true, deep: true }
);

watch(
  () => form.value.connection_type,
  (newType) => {
    console.log(connectionConfig, connectionTypes);
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
      if (field.id === "service_account_json" && selectedFile.value) {
        // If a file is selected for service_account_json, it's valid
        return;
      }
      errors[field.id] = "This field is required";
    }
  });
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

  formFields.value.forEach((field) => {
    if (
      field.id !== "connection_type" &&
      field.id !== "connection_name" &&
      field.id !== "environment"
    ) {
      // Special handling for Google Cloud Platform service account
      if (form.value.connection_type === "google_cloud_platform") {
        if (selectedFile.value) {
          console.log("selected file =====", selectedFile.value);
          connectionData.credentials.service_account_file = selectedFile.value.path;
        }
        
        connectionData.credentials[field.id] = form.value[field.id];
      } else {
        // For other connection types, add fields as before
        connectionData.credentials[field.id] = form.value[field.id];
      }
    }
  });

  console.log("============connection credentials============");
  console.log(connectionData.credentials);

  emit("submit", connectionData);
};
</script>
<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}
</style>
