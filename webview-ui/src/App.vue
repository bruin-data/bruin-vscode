<template>
  <main>
    <div v-show="errorMessage">
      <Error :errorMessage="errorMessage"/>
    </div>
    <div v-show="!errorMessage">
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
        :code="message"
      />
    </div>
    </div>
    </main>
</template>

<script setup lang="ts">
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { vscode } from "@/utilities/vscode";
import { onBeforeUnmount, onMounted, ref } from "vue";
import Error from "@/components/Error.vue";
import '@/assets/index.css';

import Button from "@/components/ui/button/Button.vue";

provideVSCodeDesignSystem().register(allComponents);

function handleBruinValidate() {
  vscode.postMessage({
    command: "bruin.validate",
    text: "",
  });
}

const message = ref(null);
const errorMessage = ref(null);

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
    case 'message':
      handleMessage(envelope.payload);
      break;
    case 'errorMessage':
      handleError(envelope.payload);
      break;
  }
}

function handleMessage(payload: any) {
  errorMessage.value = null;
  message.value = payload;
}

function handleError(payload: any) {
  message.value = null;
  errorMessage.value = payload;
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
