<template>
  <div class="flex flex-col p-4 space-y-4">
    <div class="flex flex-col space-y-3">
      <div class="flex flex-wrap gap-y-4">
        <DateInput class="px-2 w-full sm:w-1/2" label="Start Date" v-model="startDate"/>
        <DateInput class="px-2 w-full sm:w-1/2" label="End Date" v-model="endDate" />
      </div>
      <div>
        <CheckboxGroup :checkboxItems="checkboxItems" />
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
    <ErrorAlert v-if="handleError()?.errorCaptured" :errorMessage="handleError()?.errorMessage!" />
    <SqlEditor :code="code" :copied="false" :language="language"/>
  </div>
</template>

<script setup lang="ts">
import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
import { vscode } from "@/utilities/vscode";
import { onBeforeUnmount, onMounted, ref } from "vue";
import ErrorAlert from "@/components/ErrorAlert.vue";
import "@/assets/index.css";
import CommandButton from "@/components/ui/buttons/ActionButton.vue";
import DateInput from "@/components/DateInput.vue";
import SqlEditor from "@/components/SqlEditor.vue";
import CheckboxGroup from "@/components/CheckboxGroup.vue";
import { concatCommandFlags } from "./utilities/helper";
provideVSCodeDesignSystem().register(allComponents);

function handleBruinValidate() {
  vscode.postMessage({
    command: "bruin.validate",
  });
}

function handleError() {
  if (validationError.value || renderSQLAssetError.value) {
    return {
      errorCaptured: true,
      errorMessage: validationError.value || renderSQLAssetError.value || "An error occurred",
    };
  }
}

function runSql() {
  console.log("Running SQL");
  vscode.postMessage({
    command: "bruin.runSql",
    payload: concatCommandFlags(startDate.value, endDate.value, checkboxItems.value)
  });
}
const checkboxItems = ref([
  { name: "Downstream", checked: false },
  { name: "Full-Refresh", checked: false },
  { name: "Exclusive-End-Date", checked: false },
]);

const validationSuccess = ref(null);
const validationError = ref(null);
const renderSQLAssetSuccess = ref(null);
const renderPythonAsset = ref(null);
const renderSQLAssetError = ref(null);
const validateButtonStatus = ref("" as "validated" | "failed" | null);
const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
const startDateTime = ref((new Date(Date.now() - tzoffset)).toISOString().slice(0, -1));
const endDateTime = ref((new Date(Date.now() - tzoffset)).toISOString().slice(0, -1));
const language = ref('');
const startDate = ref(startDateTime);
const endDate = ref(endDateTime);
const code = ref(null);
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
      renderSQLAssetSuccess.value = envelope.payload;
      code.value = renderSQLAssetSuccess.value;
      language.value = "sql";
      [renderSQLAssetError, validationError, validationSuccess, validateButtonStatus].forEach(
        (state) => (state.value = null)
      );
      break;
      case "render-alert":
      renderPythonAsset.value = envelope.payload;
      code.value = renderPythonAsset.value;
      language.value = "python";

      [renderSQLAssetError, validationError, validationSuccess, validateButtonStatus].forEach(
        (state) => (state.value = null)
      );
      break;
    
    case "render-error":
      renderSQLAssetError.value = envelope.payload;
      renderSQLAssetSuccess.value = null;
      break;
    
      case "run-success":
      console.log("Run success");
      [renderSQLAssetError, validationError, validationSuccess, validateButtonStatus].forEach(
        (state) => (state.value = null)
      );
      break;
    case "run-error":
      console.log("Run error");
      break;

  }
}
</script>
