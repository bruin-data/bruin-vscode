<template>
  <main>
    <div v-show="validationError">
      <ErrorAlert :errorMessage="validationError"/>
    </div>
    <div>
      <br />
      
      <Button
        @click="handleBruinValidate"
        variant="secondary"
        size="lg"
      >
        Validate
      </Button>
      <div class="p">
      <highlightjs
        language="sql"
        :code="renderSuccess"
      />
    </div>
    </div>
    </main>
</template>

<script setup lang="ts">
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { vscode } from "@/utilities/vscode";
import { onBeforeUnmount, onMounted, ref } from "vue";
import  ErrorAlert from "@/components/ErrorAlert.vue";
import '@/assets/index.css';

import Button from "@/components/ui/button/Button.vue";

provideVSCodeDesignSystem().register(allComponents);

function handleBruinValidate() {
  vscode.postMessage({
    command: "bruin.validate",
  });
}

const validationSuccess = ref(null);
const validationError = ref(null);
const renderSuccess = ref(null);
const renderError = ref(null);


onMounted(() => {
  window.addEventListener('message', receiveMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener('message', receiveMessage);
});

function receiveMessage(event: { data: any; }) {
  if (!event) return;

  const envelope = event.data;
  switch (envelope.command) {
    case 'validation-success':
      validationSuccess.value = envelope.payload;
      validationError.value = null;
      break;
    case 'validation-error':
      validationError.value = envelope.payload;
      validationSuccess.value = null;
      break;
    case 'render-success':
    renderSuccess.value = envelope.payload;
      break;
    case 'render-error':
    renderError.value = envelope.payload;
      break;
  }
}


</script>


<style>
main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
}
</style>
