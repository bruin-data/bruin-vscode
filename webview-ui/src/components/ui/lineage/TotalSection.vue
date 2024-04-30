<template>
    <h2 class="section-title mb-2 text-lg font-semibold">
      Total: <span class="text-opacity-65 text-blue-600 ms-3 text-lg font-medium">{{ total }}</span>
    </h2>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    total: Number
  });
  </script>