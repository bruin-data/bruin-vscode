<template>
  <div class="flex flex-col p-4 space-y-4">
    <div class="flex flex-col space-y-1">
      <div class="flex flex-wrap mx-2 my-2">
        <DateInput class="px-2 w-full sm:w-1/2" label="Start Date" v-model="startDate" />
        <DateInput class="px-2 w-full sm:w-1/2" label="End Date" v-model="endDate" />
      </div>
      <div class="flex flex-wrap space-x-4">
        <vscode-checkbox v-for="(item, index) in checkboxItems" autofocus
          :key="index" 
          @change="handleCheckboxChange(item, $event)"
          :checked="item.checked">
          {{ item.name }}
        </vscode-checkbox>
      </div>
    </div>
    <div class="flex justify-end space-x-4">
      <CommandButton
        :disabled="handleError()?.errorCaptured"
        @click="handleBruinValidate"
        BGColor="bg-blue-500"
        :status="validateButtonStatus"
        >Validate</CommandButton
      >
      <CommandButton @click="runSql" BGColor="bg-green-500">Run</CommandButton>
    </div>
    <SqlEditor :code="renderSuccess" />
    <ErrorAlert v-if="handleError()?.errorCaptured" :errorMessage="handleError()?.errorMessage!" />
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

function handleError() {
  if (validationError.value || renderError.value) {
    return {
      errorCaptured: true,
      errorMessage: validationError.value || renderError.value || "An error occurred",
    };
  }
}

function runSql() {
  vscode.postMessage({
    command: "bruin.run",
    payload: {
      startDate: startDate.value,
      endDate: endDate.value,
      checkboxes: checkboxItems.value.filter((item) => item.checked).map((item) => item.name),
    },  
  });
}
const today = new Date().toISOString().split("T")[0];
const checkboxItems = ref([
  { name: "Downstearm", checked: false },
  { name: "Full-Refresh", checked: false },
  { name: "Exclusive-End-Date", checked: false },
]);
function handleCheckboxChange(item: { name: string; checked: boolean }, event: { target: { checked: boolean } }) {
  item.checked = event.target.checked;
}
const validationSuccess = ref(null);
const validationError = ref(null);
const renderSuccess = ref(null);
const renderError = ref(null);
const validateButtonStatus = ref("" as "validated" | "failed" | null);
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
      validateButtonStatus.value = "validated";
      break;
    case "validation-error":
      validationError.value = envelope.payload;
      validationSuccess.value = null;
      validateButtonStatus.value = "failed";
      break;
    case "render-success":
      renderSuccess.value = envelope.payload;
      [renderError, validationError, validationSuccess, validateButtonStatus].forEach(
        (state) => (state.value = null)
      );
      break;
    case "render-error":
      renderError.value = envelope.payload;
      renderSuccess.value = null;
      break;
  }
}
</script>
