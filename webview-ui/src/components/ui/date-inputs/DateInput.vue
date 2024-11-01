<template>
  <div class="flex flex-col w-full xs:w-32">
    <label class="text-xs mb-1 font-medium">{{ label }}</label>
    <div class="relative">
      <input
        type="datetime-local"
        class="w-full text-2xs text-dropdown-fg px-1 border-0 py-0.5 bg-dropdown-bg focus:border-input-border"
        :value="modelValue"
        @input="updateValue($event)"
      />
   </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";

defineProps({
  label: String,
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const updateValue = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
};
</script>

<style scoped>
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
</style>