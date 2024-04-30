<template>
    <div>
      <h2 class="mb-2 text-lg font-semibold">{{ title }}</h2>
      <div v-if="dependencies.length === 0" class="text-gray-500 dark:text-gray-400">
        Asset has no {{ title.toLowerCase() }}.
      </div>
      <ul v-else class="max-w-md space-y-1 list-disc list-inside">
        <li v-for="dep in dependencies" :key="dep.name">
          {{ dep.name }}
        </li>
      </ul>
    </div>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    title: String,
    dependencies: Array
  });
  </script>