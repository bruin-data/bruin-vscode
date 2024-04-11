<template>
  <div id="dateInput" class="flex flex-col space-y-1">
    <label for="datetime-picker" class="block text-sm font-medium">
      {{ label }}
    </label>
    <input
      id="datetime-picker"
      type="datetime-local"
      class="p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      v-model="dateTime"
      @input="updateDateTime"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from "vue";

const tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
const dateTime = ref(new Date(Date.now() - tzoffset).toISOString().slice(0, -1));

//const dateTime = ref(new Date().toISOString().slice(0, 23)); // 'YYYY-MM-DDTHH:MM' format

const emit = defineEmits(["update:modelValue"]);

function updateDateTime(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (target) {
    emit("update:modelValue", target.value);
  }
}

const props = defineProps({
  label: String,
});
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
