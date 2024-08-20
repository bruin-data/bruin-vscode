<template>
  <div id="dateInput" class="flex flex-col space-y-1 max-w-md">
    <label for="datetime-picker" class="block text-sm font-medium">
      {{ label }}
    </label>
    <div class="relative mt-2 flex items-center">
      <input
        id="datetime-picker"
        type="datetime-local"
        class="p-2 block w-full text-input-foreground bg-input-background rounded-md focus:border-inputOption-activeBorder sm:text-sm border border-commandCenter-border"
        :value="value"
        @input="updateValue(($event.target as HTMLInputElement).value)"
      />
      <div class="absolute inset-y-0 right-0 flex py-1.5 pr-1.5 items-center">
        <CalendarIcon class="inline-flex items-center w-5 h-5 text-input-foreground" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from "vue";
import { CalendarIcon } from "@heroicons/vue/20/solid";

const props = defineProps({
  label: String,
  modelValue: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["update:modelValue"]);

const value = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const updateValue = (value: string) => {
  emit("update:modelValue", value);
};
</script>

<style>
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  display: none;
}

button {
  background: none;
  border: none;
  cursor: pointer;
}

input[type="datetime-local"] {
  padding-right: 2.5rem; /* Adjust space for the custom icon */
}
</style>
