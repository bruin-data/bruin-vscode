<template>
  <div class="flex flex-col w-full xs:w-36">
    <label class="text-xs mb-1 font-medium">{{ label }}
      <span class="text-3xs italic font-mono opacity-65 text-editor-fg">(UTC)</span>
    </label>
    <div class="relative">
      <input
        type="datetime-local"
        class="w-full text-2xs px-1 border-0 py-0.5 bg-dropdown-bg"
        :value="utcModelValue"
        @input="updateValue"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from "vue";
import { DateTime } from "luxon";

const props = defineProps({
  label: String,
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

// Treat the modelValue as UTC for display
const utcModelValue = computed(() => {
  const dt = DateTime.fromISO(props.modelValue, { zone: "utc" });
  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
});

const updateValue = (event: Event) => {
  const input = event.target as HTMLInputElement;
  // Treat the input value as UTC without converting
  const dt = DateTime.fromFormat(input.value, "yyyy-MM-dd'T'HH:mm", { zone: "utc" });
  emit("update:modelValue", dt.toISO());
};
</script>

<style scoped>
/* Your styles remain the same */
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