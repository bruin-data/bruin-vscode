<template>
  <div class="divide-y overflow-hidden rounded-lg shadow w-full">
    <div class="px-4 py-5 sm:px-6">
      <h2 class="text-lg font-semibold font-mono leading-6 text-gray-300">
        {{ name }}
      </h2>
    </div>
    <div class="px-4 py-5 sm:p-6">
      <div class="flex flex-col p-4 space-y-4">
        <div class="flex flex-col space-y-3">
          <div class="flex flex-wrap gap-y-4">
            <DateInput class="px-2 w-full sm:w-1/2" label="Start Date" v-model="startDate" />
            <DateInput class="px-2 w-full sm:w-1/2" label="End Date" v-model="endDate" />
          </div>
          <div>
            <CheckboxGroup :checkboxItems="checkboxItems" />
          </div>
        </div>
        <div class="flex justify-end space-x-4">
          <CommandButton
            :isDisabled="isError || isNotAsset"
            :defaultAction="handleBruinValidateCurrentAsset"
            :status="validateButtonStatus"
            buttonLabel="Validate"
            :menuItems="['Pipeline']"
            @exec-choice="validateChoice"
          />
          <CommandButton
            :isDisabled="isError || isNotAsset"
            :defaultAction="runSql"
            :menuItems="['Downstream']"
            buttonLabel="Run"
            @exec-choice="runWithOptions"
          />
        </div>
        <ErrorAlert v-if="isError" :errorMessage="errorMessage!" />
        <div v-if="language === 'sql'">
          <SqlEditor v-show="!isError" :code="code" :copied="false" :language="language" />
        </div>
        <div v-else>
          <pre class="white-space"></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { vscode } from "@/utilities/vscode";
import { computed, onBeforeUnmount, onMounted, ref, defineProps } from "vue";
import { watch } from "vue";
import ErrorAlert from "@/components/ErrorAlert.vue";
import { handleError, concatCommandFlags } from "@/utilities/helper";
import "@/assets/index.css";
import CommandButton from "@/components/ui/buttons/ActionButton.vue";
import DateInput from "@/components/DateInput.vue";
import SqlEditor from "@/components/SqlEditor.vue";
import CheckboxGroup from "@/components/CheckboxGroup.vue";
import { updateValue, resetStates, determineValidationStatus } from "@/utilities/helper";

const errorState = computed(() => handleError(validationError.value, renderSQLAssetError.value));
const isError = computed(() => errorState.value?.errorCaptured);
const errorMessage = computed(() => errorState.value?.errorMessage);
const isNotAsset = computed(() => (renderAssetAlert.value ? true : false));

const props = defineProps<{
  name: string | null;
}>();

function handleBruinValidateAll() {
  vscode.postMessage({
    command: "bruin.validateAll",
  });
}

function handleBruinValidateCurrentAsset() {
  vscode.postMessage({
    command: "bruin.validate",
  });
}

const checkboxItems = ref([
  { name: "Full-Refresh", checked: false },
  { name: "Exclusive-End-Date", checked: false },
]);
const runOptions = ref(null as string | null);

function handleRunWithOptions(action: string) {
  runOptions.value = action;
  runSql(runOptions.value);
  console.log("Run options", runOptions.value);
}
const runWithOptions = computed(() => handleRunWithOptions);
const validateChoice = computed(() => handleBruinValidateAll);

function runSql(runOption?: string) {
  let payload = getCheckboxChangePayload();

  if (runOption == "Pipeline") {
    vscode.postMessage({
      command: "bruin.runAll",
    });
    return;
  } else if (runOption == "Downstream") {
    payload = payload + " --downstream";
  }
  vscode.postMessage({
    command: "bruin.runSql",
    payload: payload,
  });
}
const validationSuccess = ref(null);
const validationError = ref(null);
const renderSQLAssetSuccess = ref(null);
const renderPythonAsset = ref(null);
const renderSQLAssetError = ref(null);
const renderAssetAlert = ref(null);
const validateButtonStatus = ref("" as "validated" | "failed" | "loading" | null);
const tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
//startDate := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
//  endDate := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 999999999, time.UTC)

const yesterday = new Date(Date.now() - tzoffset - 86400000);

const startDate = ref(
  new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0))
    .toISOString()
    .slice(0, -1)
);
const endDate = ref(
  new Date(
    Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
  )
    .toISOString()
    .slice(0, -1)
);

//end date = endDate - 1microsecond
// endDate.value = new Date(new Date(endDate.value).getTime() - 1).toISOString().slice(0, -1);

// Using startDate and endDate in your application
console.log("start & endDates", startDate.value, endDate.value);

function getCheckboxChangePayload() {
  console.log("start date", startDate.value);
  console.log("end date", endDate.value);
  return concatCommandFlags(startDate.value, endDate.value, checkboxItems.value);
}

const language = ref("");
const code = ref(null);

function sendInitialMessage() {
  const initialPayload = getCheckboxChangePayload();
  console.log("Initial payload", initialPayload);
  vscode.postMessage({
    command: "checkboxChange",
    payload: initialPayload,
  });
}

onMounted(() => {
  window.addEventListener("message", receiveMessage);
  sendInitialMessage();
});

onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
});

watch(
  [checkboxItems, startDate, endDate],
  () => {
    const payload: string = getCheckboxChangePayload();
    console.log("Checkbox change payload", payload);
    vscode.postMessage({
      command: "checkboxChange",
      payload: payload,
    });
  },
  { deep: true }
);

function receiveMessage(event: { data: any }) {
  if (!event) return;

  const envelope = event.data;
  switch (envelope.command) {
    case "validation-message":
      validationSuccess.value = updateValue(envelope, "success");
      validationError.value = updateValue(envelope, "error");
      validateButtonStatus.value = updateValue(envelope, "loading");
      validateButtonStatus.value = determineValidationStatus(
        validationSuccess.value,
        validationError.value,
        validateButtonStatus.value
      );
      break;

    case "render-message":
      renderSQLAssetSuccess.value = updateValue(envelope, "success");
      renderSQLAssetError.value = updateValue(envelope, "error");
      renderPythonAsset.value = updateValue(envelope, "bruin-asset-alert");
      renderAssetAlert.value = updateValue(envelope, "non-asset-alert");
      code.value = renderSQLAssetSuccess.value || renderPythonAsset.value;
      language.value = renderSQLAssetSuccess.value ? "sql" : "python";

      resetStates([validationError, validationSuccess, validateButtonStatus]);
      console.log("Is not asset", isNotAsset.value);
      console.log("Error state", isError.value);
      console.log("Error message From Genearl", errorMessage.value);
      break;

    case "run-success":
      resetStates([renderSQLAssetError, validationError, validationSuccess, validateButtonStatus]);
      break;
    case "run-error":
      break;
  }
}
</script>
