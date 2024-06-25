<template>
  <div id="dateInput" class="flex flex-col space-y-1 max-w-md">
    <label for="datetime-picker" class="block text-sm font-medium">
      {{ label }}
    </label>
    <input
      id="datetime-picker"
      type="datetime-local"
      class="p-2 block  max-w-sm rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      :value="formattedValue" 
      @input="updateValue(($event.target as HTMLInputElement).value)"
      />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, ref } from "vue";

const props = defineProps({
  label: String,
  modelValue: {
    type: String,
    required: true
  }
});
const emit = defineEmits(['update:modelValue']);

const formattedValue = computed(() => {
  return props.modelValue.slice(0, 16);
});

const updateValue = (value: string) => {
  emit('update:modelValue', value);
};


</script>

<style>
#dateInput {
  color: var(--vscode-foreground);
}
#datetime-picker {
  color: var(--vscode-foreground);
  background-color: var(--vscode-input-background);
}
</style>
