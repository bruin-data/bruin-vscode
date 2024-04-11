<template>
  <div class="flex flex-col p-4 space-y-4">
    <div class="flex flex-col space-y-1">
      <div class="flex flex-wrap mx-2 my-2">
        <DateInput class="px-2 w-full sm:w-1/2" label="Start Date" v-model="startDate" />
        <DateInput class="px-2 w-full sm:w-1/2" label="End Date" v-model="endDate" />
      </div>
      <div class="flex flex-wrap space-x-4">
        <vscode-checkbox autofocus>Downstearm</vscode-checkbox>
        <vscode-checkbox autofocus>Full-Refresh</vscode-checkbox>
        <vscode-checkbox autofocus>Exclusive</vscode-checkbox>
      </div>
    </div>
    <div class="flex justify-end space-x-4">
      <CommandButton @click="handleBruinValidate" BGColor="bg-blue-500" :status="buttonStatus"
        >Validate</CommandButton
      >
      <CommandButton @click="runSql" BGColor="bg-green-500">Run</CommandButton>
    </div>
    <SqlEditor :code="renderSuccess" />
    <ErrorAlert v-if="validationError" :errorMessage="validationError" />
  </div>
</template>

<script setup lang="ts">
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { vscode } from "@/utilities/vscode";
import { onBeforeUnmount, onMounted, ref } from "vue";
import ErrorAlert from "@/components/ErrorAlert.vue";
import "@/assets/index.css";
import CommandButton from "@/components/CommandButton.vue";
import DateInput from "@/components/DateInput.vue";
import SqlEditor from "@/components/SqlEditor.vue";

provideVSCodeDesignSystem().register(allComponents);

function handleBruinValidate() {
  vscode.postMessage({
    command: "bruin.validate",
  });
}

function runSql() {
  vscode.postMessage({
    command: "run.sql",
  });
}
const today = new Date().toISOString().split('T')[0];

const validationSuccess = ref(null);
const validationError = ref(null);
const renderSuccess = ref(null);
const renderError = ref(null);
const buttonStatus = ref(null);
const startDate = ref(today);
const endDate = ref(today);
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
    case "validation-success":
      validationSuccess.value = envelope.payload;
      validationError.value = null;
      buttonStatus.value = "validated";
      break;
    case "validation-error":
      validationError.value = envelope.payload;
      validationSuccess.value = null;
      buttonStatus.value = "failed";
      break;
    case "render-success":
      renderSuccess.value = envelope.payload;
      buttonStatus.value = null;
      validationError.value = null;
      validationSuccess.value = null;
      break;
    case "render-error":
      renderError.value = envelope.payload;
      break;
  }
}
</script>
