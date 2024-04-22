<template>
  <button
    type="button"
    :class="`inline-flex items-center gap-x-1.5 
    rounded-md px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 
    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
     focus-visible:outline-indigo-600 ${BGColor}`"
  >
    <CheckCircleIcon v-if="status === 'validated'" class="-ml-0.5 h-5 w-5" aria-hidden="true" />
    <XCircleIcon v-if="status === 'failed'" class="-ml-0.5 h-5 w-5" aria-hidden="true" />
    <span v-if="status === 'loading'" class="-ml-0.5 h-5 w-5 spinner"></span>

    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  BGColor: string | null;
  status?: "validated" | "failed" | "loading" | null;
}>();
</script>

<style scoped>

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}
</style>
