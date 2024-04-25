<template>

    <div class="flex flex-col p-4 space-y-4">
      <div class="flex flex-col space-y-3">
        <div class="flex flex-wrap gap-y-4">
            <div v-if="lineageSuccess" class="flex flex-col space-y-2">
              <span v-for="(elt, index) in lineageSuccess" :key="index">
                {{ elt }}
              </span>
            </div>
            <div v-if="lineageError">
             <ErrorAlert :errorMessage="lineageError" />
            </div>
        </div>
    </div>
    </div>
  </template>

<script setup lang="ts">

import { vscode } from '@/utilities/vscode';
import { onBeforeUnmount, onMounted, ref } from "vue";
import ErrorAlert from "@/components/ErrorAlert.vue";

const lineageSuccess = ref(null);
const lineageError = ref(null);


onMounted(() => {
    window.addEventListener("message", receiveMessage);
  });
  
  onBeforeUnmount(() => {
    window.removeEventListener("message", receiveMessage);
  });
  function processLineageData(lineageString) {
    if (lineageString.startsWith('"') && lineageString.endsWith('"')) {
    lineageString = lineageString.substring(1, lineageString.length - 1);
  }
  return lineageString.split('\\n'); 

}

  function receiveMessage(event: { data: any }) {
    if (!event) return;
  
    const envelope = event.data;
    switch (envelope.command) {
      case "lineage-success":
        console.log('lineage-success from .vue')
        //formay payload and display it and respect the line breaks 
        const formatted =  JSON.stringify(envelope.payload);
        lineageSuccess.value = processLineageData(formatted);
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
  
  