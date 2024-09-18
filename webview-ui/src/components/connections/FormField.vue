<template>
  <div class="sm:col-span-4">
    <label :for="id" class="block text-sm font-medium leading-6 text-editor-fg">
      {{ label }}{{ !required ? " (Optional)" : "" }}
    </label>
    <div class="mt-2 relative">
      <input
        v-if="type === 'text' || type === 'password' || type === 'number'"
        :id="id"
        :type="type"
        :value="internalValue"
        @input="updateValue"
        :class="[
          'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
          isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
        ]"
        :placeholder="defaultValue !== undefined ? String(defaultValue) : `Enter ${label.toLowerCase()}`"
        :required="required"
      />
      <div v-if="type === 'textarea'" class="flex flex-col">
        <textarea
          :id="id"
          :value="internalValue"
          @input="updateValue"
          :class="[
            'block bg-input-background w-full rounded-md border-0 py-1.5 text-input-foreground shadow-sm ring-1 ring-inset placeholder:text-editorInlayHint-fg focus:ring-2 focus:ring-inset focus:ring-accent sm:text-sm',
            isInvalid ? 'ring-inputValidation-errorBorder' : 'ring-editor-border',
          ]"
          :placeholder="defaultValue !== undefined ? String(defaultValue) : `Enter ${label.toLowerCase()}`"
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
      <p v-if="isInvalid" class="mt-1 text-sm text-inputValidation-errorBorder absolute">
        This field is required
      </p>
    </div>
  </div>
</template>

<script setup>
import { ChevronDownIcon } from "@heroicons/vue/24/outline";
import { defineProps, defineEmits, ref, watch } from "vue";
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
  required: {
    type: Boolean,
    default: false,
  },
  isInvalid: Boolean,
});

const emit = defineEmits(["update:modelValue"]);

const internalValue = ref(props.modelValue ?? props.defaultValue ?? "");

watch(() => props.modelValue, (newValue) => {
  internalValue.value = newValue ?? props.defaultValue ?? "";
});

const updateValue = (event) => {
  let value = event.target.value;
  if (props.type === "number") {
    value = Number(value);
  }
  internalValue.value = value;
  emit("update:modelValue", value);
};
</script>