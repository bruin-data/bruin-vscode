<template>
  <div class="flex flex-col w-36">
    <span class="text-xs mb-1 font-medium text-editor-fg">Variant</span>
    <div class="relative">
      <vscode-dropdown
        @change="handleSelect"
        class="w-full"
        :value="selectedVariant"
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

defineProps<{
  options: string[];
  selectedVariant: string;
}>();

const emit = defineEmits(['selectedVariant']);

function handleSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  emit('selectedVariant', value);
}
</script>

<style scoped>
vscode-dropdown {
  @apply h-5 rounded-none;
}
vscode-dropdown::part(control) {
  @apply px-1 py-0.5 text-2xs border-0;
}
vscode-dropdown::part(listbox) {
  bottom: auto!important;
  top: 100%!important;
  left: 0!important;
}
</style>
