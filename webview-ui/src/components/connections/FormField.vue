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
        :class="[
          'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
          isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border'
        ]"
        :placeholder="`Enter ${label.toLowerCase()}`"
        :required="required"
      />
      <div v-if="type === 'textarea'" class="flex flex-col">
        <textarea
          :id="id"
          :value="defaultValue ? defaultValue : modelValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border'
          ]"
          :placeholder="`Enter ${label.toLowerCase()}`"
          :required="required"
          :rows="rows"
          :cols="cols"
        />
        <!-- File input label remains unchanged -->
      </div>
      <template v-if="type === 'select'">
        <select
          :id="id"
          :value="modelValue"
          :required="required"
          @change="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm appearance-none pr-8',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border'
          ]"
        >
          <option value="" disabled selected hidden>Please Select</option>
          <option v-for="option in options" :key="option" :value="option">
            {{ formatConnectionName(option) }}
          </option>
        </select>
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDownIcon class="w-4 h-4 text-input-foreground" aria-hidden="true" />
        </div>
      </template>
      <p v-if="isInvalid" class="mt-1 text-sm text-inputValidation-errorBorder">This field is required</p>
    </div>
  </div>
</template>

<script setup>
import { ChevronDownIcon, DocumentPlusIcon } from "@heroicons/vue/24/outline";
import { defineProps, defineEmits } from "vue";
import { formatConnectionName } from "./connectionUtility";

const props = defineProps({
  id: String,
  label: String,
  type: String,
  modelValue: [String, Number],
  options: Array,
  defaultValue: [String, Number],
  rows: Number,
  cols: Number,
  required: Boolean,
  isInvalid: Boolean, // New prop for validation
});

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
</script>