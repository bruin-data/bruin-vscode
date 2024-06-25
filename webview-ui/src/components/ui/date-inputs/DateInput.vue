<template>
  <div id="dateInput" class="flex flex-col space-y-1 max-w-md ">
    <label for="datetime-picker" class="block text-sm font-medium">
      {{ label }}
    </label>
    <input
      id="datetime-picker"
      type="datetime-local"
      class="p-2 block max-w-sm text-input-foreground bg-input-background rounded-md focus:border-inputOption-activeBorder sm:text-sm"
      :value="value"
      @input="updateValue(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from "vue";

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
  set: (val) => emit('update:modelValue', val)
});

const updateValue = (value: string) => {
  emit('update:modelValue', value);
};

</script>

<style>

</style>
