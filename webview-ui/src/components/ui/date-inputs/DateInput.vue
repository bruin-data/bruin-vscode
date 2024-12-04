<template>
  <div class="flex flex-col w-full xs:w-32">
    <label class="text-xs mb-1 font-medium">{{ label }}
      <span class="text-3xs italic font-mono opacity-65 text-editor-fg">(UTC)</span>
    </label>
    <div class="relative">
      <input
        type="datetime-local"
        class="w-full text-2xs px-1 border-0 py-0.5 bg-dropdown-bg"
        :value="displayValue"
        @input="updateValue($event)"
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

// Convert the modelValue (assumed to be in UTC) to a format suitable for display in a datetime-local input
// The datetime-local input always expects a value in the format 'YYYY-MM-DDTHH:mm' without timezone info
const displayValue = computed(() => {
  const dt = DateTime.fromISO(props.modelValue, { zone: "utc" });
  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
});

const updateValue = (event: Event) => {
  const input = event.target as HTMLInputElement;
  // Get the selected datetime in local timezone
  const localDt = DateTime.fromISO(input.value);
  
  // Convert the local datetime to UTC
  const utcDt = localDt.toUTC();
  
  // Emit the UTC datetime in ISO format
  emit("update:modelValue", utcDt.toISO());
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