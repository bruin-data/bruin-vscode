<template>
  <div class="flex items-center">
    <div>
      <span class="text-sm font-semibold text-editor-fg"> Environment </span>
    </div>
    <div class="p-4">
      <vscode-dropdown @change="handleSelect" >
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
}>();

const emit = defineEmits(['selectedEnv']);

function handleSelect(event: Event) {
  const selectedEnv = (event.target as HTMLSelectElement).value;
  emit('selectedEnv', selectedEnv);
}
</script>
