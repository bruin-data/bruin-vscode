<template>
  <div class="relative bg-editorWidget-bg shadow sm:rounded-lg p-4 max-w-2xl mx-auto">
    <form @submit.prevent="submitForm" class="w-full">
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
          />

          <FormField
            id="connection_name"
            label="Connection Name"
            type="text"
            v-model="form.connection_name"
          />

          <FormField
            id="environment"
            label="Environment"
            type="select"
            :options="environments"
            v-model="form.environment"
          />

          <FormField
            v-for="field in connectionFields"
            :key="field.id"
            v-bind="field"
            v-model="form[field.id]"
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
        <vscode-button type="submit" class="rounded-md px-4 py-2 text-sm font-semibold">
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

const emit = defineEmits(["submit", "cancel"]);

const props = defineProps({
  connection: {
    type: Object,
    default: () => ({
      connection_type: "",
      connection_name: "",
      environment: "",
    }),
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

const isEditing = computed(() => !!props.connection.name);

const connectionFields = computed(() => {
  const fields = connectionConfig[form.value.connection_type] || [];
  return fields.map((field) => ({
    ...field,
    modelValue: form.value[field.id] || field.defaultValue || "",
  }));
});

const submitForm = () => {
  console.log("Form submitted:", form.value);
  emit("submit", {
    name: form.value.connection_name,
    type: form.value.connection_type,
    environment: form.value.environment,
  });
};

watch(
  () => props.connection,
  (newConnection) => {
    form.value.connection_type = newConnection.type || "";
    form.value.connection_name = newConnection.name || "";
    form.value.environment = newConnection.environment || "";
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