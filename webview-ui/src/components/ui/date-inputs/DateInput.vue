<template>
  <div id="dateInput" class="flex flex-col space-y-1 max-w-md">
    <label for="datetime-picker" class="block text-sm font-medium">
      {{ label }}
    </label>
    <div class="relative mt-2 flex items-center">
      <input
        id="datetime-picker"
        type="datetime-local"
        class="block px-1 py-0.5 w-full text-xs text-input-foreground bg-input-background rounded-sm focus:border-inputOption-activeBorder border border-commandCenter-border"
        :value="modelValue"
        @input="updateValue($event)"
      />
 <!--      <div class="absolute inset-y-0 right-0 flex px-1 items-center pointer-events-none">
        <CalendarIcon class="w-4 h-4 text-input-foreground" />
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import { CalendarIcon } from "@heroicons/vue/20/solid";

const props = defineProps({
  label: String,
  modelValue: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["update:modelValue"]);

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
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