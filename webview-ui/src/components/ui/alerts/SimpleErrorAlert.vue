<template>
  <div
    v-if="errorMessage"
    class="rounded-md bg-red-50 p-4 my-4 overflow-hidden transition-all duration-300"
  >
    <div class="flex justify-between items-center">
      <div class="flex items-center flex-grow">
        <XCircleIcon class="h-5 w-5 text-red-500 mr-2" aria-hidden="true" />
        <h3 class="text-lg font-medium text-red-800">{{ errorPhase }} Error</h3>
      </div>
      <button @click="$emit('errorClose')" class="text-red-700">
        <XMarkIcon class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
    <div class="mt-2">
      <p class="text-sm text-red-600">{{ simpleErrorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { XCircleIcon, XMarkIcon } from "@heroicons/vue/20/solid";

const props = defineProps<{
  errorMessage: string | any | null;
  errorPhase?: string;
}>();

defineEmits(["errorClose"]);

const errorPhase = computed(() => props.errorPhase || "Error");

const simpleErrorMessage = computed(() => {
  if (typeof props.errorMessage === "string") {
    return props.errorMessage;
  }
  if (typeof props.errorMessage === "object" && props.errorMessage?.error) {
    return props.errorMessage.error;
  }
  return String(props.errorMessage);
});
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}
</style> 