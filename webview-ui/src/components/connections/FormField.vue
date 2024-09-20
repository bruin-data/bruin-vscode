<template>
  <div class="sm:col-span-4">
    <label :for="id" class="block text-sm font-medium leading-6 text-editor-fg">
      {{ label }}{{ !required ? " (Optional)" : "" }}
    </label>
    <div class="mt-2 relative">
      <div class="relative">
        <input
          v-if="type === 'text' || type === 'password' || type === 'number'"
          :id="id"
          :type="inputType"
          :value="internalValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          :placeholder="internalValue ? '' : `Enter ${label.toLowerCase()}`"
          :required="required"
        />
        <button
          v-if="type === 'password'"
          type="button"
          class="absolute inset-y-0 right-0 flex items-center pr-3"
          @click="togglePasswordVisibility"
        >
          <EyeIcon v-if="!showPassword" class="h-5 w-5 text-input-foreground" />
          <EyeSlashIcon v-else class="h-5 w-5 text-input-foreground" />
        </button>
      </div>

      <div v-if="type === 'textarea'" class="flex flex-col">
        <textarea
          :id="id"
          :value="internalValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          :placeholder="
            defaultValue !== undefined ? String(defaultValue) : `Enter ${label.toLowerCase()}`
          "
          :required="required"
          :rows="rows"
          :cols="cols"
        />
      </div>
      <template v-if="type === 'select'">
        <div class="relative">
          <select
            :id="id"
            :value="internalValue"
            :required="required"
            @change="updateValue"
            :class="[
              'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm appearance-none pr-8',
              isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
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
        </div>
      </template>
      <p v-if="isInvalid" class="mt-2 text-sm text-inputValidation-errorBorder">
        {{ formattedErrorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ChevronDownIcon, EyeIcon, EyeSlashIcon } from "@heroicons/vue/24/outline";
import { defineProps, defineEmits, ref, watch, computed } from "vue";
import { formatConnectionName } from "./connectionUtility";

const props = defineProps({
  errorMessage: String,
  id: String,
  label: String,
  type: String,
  modelValue: [String, Number],
  options: Array,
  defaultValue: [String, Number],
  rows: Number,
  cols: Number,
  required: {
    type: Boolean,
    default: false,
  },
  isInvalid: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const internalValue = ref(props.modelValue ?? props.defaultValue ?? "");

const showPassword = ref(false);

const inputType = computed(() => {
  if (props.type === "password") {
    return showPassword.value ? "text" : "password";
  }
  return props.type;
});

const formattedErrorMessage = computed(() => {
  if (!props.errorMessage) return "This field is required";
  try {
    const errorObj = JSON.parse(props.errorMessage);
    if (errorObj.error) {
      return errorObj.error.charAt(0).toUpperCase() + errorObj.error.slice(1);
    }
  } catch (e) {
    // If parsing fails, it's not a JSON string
  }
  return props.errorMessage;
});

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};

watch(
  () => props.modelValue,
  (newValue) => {
    internalValue.value = newValue ?? props.defaultValue ?? "";
  }
);

const updateValue = (event) => {
  let value = event.target.value;
  if (props.type === "number") {
    value = Number(value);
  }
  internalValue.value = value;
  emit("update:modelValue", value);
  emit("clearError");
};
</script>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
