<template>
  <div class="flex flex-col w-full xs:w-36">
    <label class="text-xs mb-1 font-medium">{{ label }}
      <span class="text-3xs italic font-mono opacity-65 text-editor-fg">(UTC)</span>
    </label>
    <div class="relative flex items-center">
      <input
        type="text"
        class="w-full text-2xs px-1 border-0 py-0.5 bg-dropdown-bg pr-6"
        :value="displayValue"
        @input="handleTextInput"
        placeholder="YYYY-MM-DD HH:mm"
      />
      <input
        type="datetime-local"
        ref="dateTimeInput"
        class="absolute right-0 w-4 h-4 opacity-0 cursor-pointer"
        :value="utcModelValue"
        @input="updateFromPicker"
      />
      <div 
        class="absolute right-1 pointer-events-none"
        @click.stop="openPicker"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4 text-editor-fg opacity-65"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed, ref } from "vue";
import { DateTime } from "luxon";

const props = defineProps({
  label: String,
  modelValue: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const dateTimeInput = ref<HTMLInputElement | null>(null);

const displayValue = computed(() => {
  const dt = DateTime.fromISO(props.modelValue, { zone: "utc" });
  return dt.isValid ? dt.toFormat("yyyy-MM-dd HH:mm") : '';
});

const utcModelValue = computed(() => {
  const dt = DateTime.fromISO(props.modelValue, { zone: "utc" });
  return dt.isValid ? dt.toFormat("yyyy-MM-dd'T'HH:mm") : '';
});

const handleTextInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const dt = DateTime.fromFormat(input.value.trim(), "yyyy-MM-dd HH:mm", { zone: "utc" });
  
  if (dt.isValid) {
    emit("update:modelValue", dt.toISO());
  }
};

const updateFromPicker = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const dt = DateTime.fromISO(input.value, { zone: "utc" });
  
  if (dt.isValid) {
    emit("update:modelValue", dt.toISO());
  }
};

const openPicker = () => {
  if (dateTimeInput.value) {
    dateTimeInput.value.focus();
    dateTimeInput.value.click();
  }
};
</script>

<style scoped>
input[type="datetime-local"] {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  margin: auto;
  padding: 0;
  border: none;
  cursor: pointer;
}
</style>