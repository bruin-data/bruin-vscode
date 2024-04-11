<template>
  <div id="dateInput" class="flex flex-col space-y-4">
    <label for="datetime-picker" class="block text-sm font-medium">
      {{ label }}
    </label>
    <input 
      id="datetime-picker" 
      type="datetime-local" 
      class="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      v-model="dateTime"
      @input="updateDateTime"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const dateTime = ref('2018-07-22');
const updateDateTime = (event) => {
  console.debug(event.target.value); 
};
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