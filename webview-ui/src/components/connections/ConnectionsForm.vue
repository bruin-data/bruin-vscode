<template>
  <div class="relative bg-editorWidget-bg shadow sm:rounded-lg p-4 max-w-2xl mx-auto">
    <form @submit.prevent="submitForm" class="w-full" novalidate>
      <div class="space-y-6 w-full">
        <h3 class="text-lg font-medium text-editor-fg">
          {{ isEditing ? "Edit Connection" : "New Connection" }}
        </h3>
        <div class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-6">
          <FormField
            id="connection_type"
            label="Connection Type"
            type="select"
            :options="connectionTypes"
            v-model="form.connection_type"
            :isInvalid="validationErrors.connection_type"
            required
          />

          <FormField
            id="connection_name"
            label="Connection Name"
            type="text"
            v-model="form.connection_name"
            :isInvalid="validationErrors.connection_name"
            required
          />

          <FormField
            id="environment"
            label="Environment"
            type="select"
            :options="environments"
            v-model="form.environment"
            :isInvalid="validationErrors.environment"
            required
          />

          <FormField
            v-for="field in connectionFields"
            :key="field.id"
            v-bind="field"
            v-model="form[field.id]"
            :required="field.required"
            :isInvalid="validationErrors[field.id]"
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
import { connectionTypes, connectionConfig } from "./connectionUtility";
import { vscode } from "@/utilities/vscode";
const emit = defineEmits(["submit", "cancel", "close"]);

const props = defineProps({
  connection: {
    type: Object,
    default: () => ({
      name: '',
      type: '',
      environment: '',
      credentials: {},
    }),
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  environments: {
    type: Array,
    required: true,
  },
});

const form = ref({
  connection_type: "",
  connection_name: "",
  environment: "",
});

const validationErrors = ref({});

const isEditing = computed(() => props.isEditing);

const connectionFields = computed(() => {
  const fields = connectionConfig[form.value.connection_type] || [];
  return fields.map((field) => ({
    ...field,
    modelValue: form.value[field.id] || field.defaultValue || "",
  }));
});

const validateForm = () => {
  const errors = {};
  const requiredFields = ['connection_type', 'connection_name', 'environment', ...connectionFields.value.filter(f => f.required).map(f => f.id)];
  
  requiredFields.forEach(field => {
    if (!form.value[field]) {
      errors[field] = true;
    }
  });

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

// Close the form after successful submission
const closeForm = () => {
    emit("close");
  };

  // Modify submitForm to use closeForm
  const submitForm = async () => {
  if (!validateForm()) {    
    console.error("Form validation failed");
    return;
  }

  try {
    const credentials = {};
    connectionFields.value.forEach((field) => {
      credentials[field.id] = form.value[field.id];
    });

    const connectionData = {
      name: form.value.connection_name,
      type: form.value.connection_type,
      environment: form.value.environment,
      credentials: credentials,
    };

    if (props.isEditing) {
      const oldConnection = {
        name: props.connection.name,
        type: props.connection.type,
        environment: props.connection.environment,
      };

      await vscode.postMessage({
        command: "bruin.editConnection",
        payload: JSON.parse(JSON.stringify({
          oldConnection,
          newConnection: connectionData,
        })),
      });
    } else {
      await vscode.postMessage({
        command: "bruin.createConnection",
        payload: JSON.parse(JSON.stringify(connectionData)),
      });
    }

    emit("close");
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};


watch(
  () => props.connection,
  (newConnection) => {
    form.value = {
      connection_type: newConnection.type || "",
      connection_name: newConnection.name || "",
      environment: newConnection.environment || "",
      ...newConnection.credentials, // Spread the credentials into the form
    };
    validationErrors.value = {};
  },
  { immediate: true }
);
</script>

<style scoped>
vscode-button::part(control) {
  border: none;
  outline: none;
}
</style>