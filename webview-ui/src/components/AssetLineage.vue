<template>

    <div class="flex flex-col p-4 space-y-4">
      <div class="flex flex-col space-y-3">
        <div class="flex flex-wrap gap-y-4">
            <div>
                {{ lineageSuccess ? lineageSuccess : lineageError}}
            </div>
        </div>
    </div>
    </div>
  </template>

<script setup lang="ts">

import { vscode } from '@/utilities/vscode';
import { onBeforeUnmount, onMounted, ref } from "vue";

const lineageSuccess = ref(null);
const lineageError = ref(null);

onMounted(() => {
    window.addEventListener("message", receiveMessage);
  });
  
  onBeforeUnmount(() => {
    window.removeEventListener("message", receiveMessage);
  });


  function receiveMessage(event: { data: any }) {
    if (!event) return;
  
    const envelope = event.data;
    switch (envelope.command) {
      case "lineage-success":
        console.log('lineage-success from .vue')
        lineageSuccess.value = envelope.payload;
        console.log('lineageSuccess.value', lineageSuccess.value)
        lineageError.value = null;
        break;
      case "lineage-error":
        lineageSuccess.value = null;
        lineageError.value = envelope.payload;
      break;
  }
}
</script>
  
  