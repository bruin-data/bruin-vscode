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
import { updateValue } from "@/utilities/helper";

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
      case "lineage-message":
        lineageSuccess.value = updateValue(envelope, "success");
        lineageError.value = updateValue(envelope, "error");;
      break;
  }
}
</script>
  
  