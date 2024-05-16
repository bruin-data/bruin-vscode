<template>
    <div class="rounded-md mt-4 bg-yellow-50 p-4 w-full">
      <div class="flex">
        <div class="flex-shrink-0">
          <ExclamationTriangleIcon class="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">Attention</h3>
          <div class="mt-2 text-sm text-yellow-700">
            <p>{{ props.message }}</p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ExclamationTriangleIcon } from '@heroicons/vue/20/solid'

    const props = defineProps<{
        message: string;
    }>();
  </script>