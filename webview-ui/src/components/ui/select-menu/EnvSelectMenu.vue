<template>
  <div class="flex flex-col w-32">
    <span class="text-xs my-1 font-medium text-editor-fg">Environment</span>
    <div class="relative">
      <vscode-dropdown 
        @change="handleSelect"
        class="w-full"
      >
        <vscode-option 
          v-for="option in options" 
          :key="option" 
          :value="option"
        >
          {{ option }}
        </vscode-option>
      </vscode-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps<{
  options: string[];
  selectedEnvironment: string;
}>();

const emit = defineEmits(['selectedEnv']);

function handleSelect(event: Event) {
  const selectedEnv = (event.target as HTMLSelectElement).value;
  emit('selectedEnv', selectedEnv);
}
</script>

<style scoped>
vscode-dropdown {
  @apply text-2xs h-[1.4rem];
}
vscode-dropdown::part(control) {
  @apply pl-1;
}
</style>