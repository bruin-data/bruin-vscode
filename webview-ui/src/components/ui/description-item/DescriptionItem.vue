<template>
  <div class="px-4 py-2 items-center mt-2 mb-2 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-0">
    <dt>
      <span class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono">
        {{ props.title }}
      </span>
    </dt>
    <dd class="mt-1 text-sm text-gray-300 leading-6 sm:col-span-3 sm:mt-0 font-mono">
      <span
        :class="props.className">
        {{ props.value }}
      </span>
    </dd>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";

const props = defineProps<{
  title: string;
  value: string;
  className?: string;
}>();


</script>
