<template>
  <div class="sm:col-span-4">
    <label :for="id" class="block text-sm font-medium leading-6 text-editor-fg">
      {{ label }}
    </label>
    <div class="mt-2 relative">
      <input
        v-if="type === 'text' || type === 'password' || type === 'number'"
        :id="id"
        :type="type"
        :value="defaultValue ? defaultValue : modelValue"
        @input="updateValue"
        class="block w-full rounded-md border-0 py-1.5 text-editor-bg shadow-sm ring-1 ring-inset ring-editor-border placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm"
        :placeholder="`Enter ${label.toLowerCase()}`"
        :required="id === 'connection_name'"
      />
      <div v-if="type === 'textarea'" class="flex flex-col">
        <textarea
          :id="id"
          :value="defaultValue ? defaultValue : modelValue"
          @input="updateValue"
          class="block w-full rounded-md border-0 py-1.5 text-editor-bg shadow-sm ring-1 ring-inset ring-editor-border placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm"
          :placeholder="`Enter ${label.toLowerCase()}`"
          :required="id === 'connection_name'"
          :rows="rows"
          :cols="cols"
        />
        <label for="file-input" class="mt-2 flex items-center cursor-pointer">
          <DocumentPlusIcon class="w-5 h-5 mr-2 text-editorInlayHint-fg" />
          <span class="text-editorInlayHint-fg-">Pick a JSON file</span>
          <input
            type="file"
            id="file-input"
            @change="handleFileUpload"
            class="sr-only"
            accept=".json"
          />
        </label>
      </div>
      <template v-if="type === 'select'">
        <select
          :id="id"
          :value="modelValue"
          @change="updateValue"
          class="block w-full rounded-md border-0 py-1.5 text-editor-bg shadow-sm ring-1 ring-inset ring-editor-border focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm appearance-none pr-8"
        >
          <option value="" disabled selected hidden>Please Select</option>
          <option v-for="option in options" :key="option" :value="option">
            {{ formatConnectionName(option) }}
          </option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDownIcon class="w-4 h-4 text-editor-bg" aria-hidden="true" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ChevronDownIcon, DocumentPlusIcon } from "@heroicons/vue/24/outline";
import { defineProps, defineEmits } from "vue";

const props = defineProps([
  "id",
  "label",
  "type",
  "modelValue",
  "options",
  "defaultValue",
  "rows",
  "cols",
]);
const emit = defineEmits(["update:modelValue"]);

const updateValue = (event) => {
  let value = event.target.value;
  if (props.type === "number") {
    value = Number(value);
  }
  emit("update:modelValue", value);
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (file && file.type === "application/json") {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target.result;
      emit("update:modelValue", fileContent);
    };
    reader.readAsText(file);
  } else {
    alert("Please upload a valid JSON file.");
  }
};

const formatConnectionName = (option) => {
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
</script>
