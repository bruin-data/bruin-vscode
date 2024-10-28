<template>
  <div class="flex flex-col w-40">
    <label class="text-xs mb-1 font-medium">{{ label }}</label>
    <div class="relative">
      <input
        type="datetime-local"
        class="w-full text-xs p-1.5 border border-commandCenter-border rounded-sm bg-input-background focus:border-input-border"
        :value="modelValue"
        @input="updateValue($event)"
      />
      <CalendarIcon class="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-input-foreground" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import { CalendarIcon } from "@heroicons/vue/20/solid";

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