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
            :menuItems="['Current Pipeline', 'All Pipelines']"
            @exec-choice="validateChoice"
          />
          <CommandButton
            :isDisabled="isError || isNotAsset"
            :defaultAction="runSql"
            :menuItems="['Downstream', 'Current Pipeline']"
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
import { handleError, concatCommandFlags, adjustEndDateForExclusive } from "@/utilities/helper";
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

function handleBruinValidateAll(action: string) {
  switch(action){
    case "All Pipelines":
      vscode.postMessage({
        command: "bruin.validateAll",
      }); 
      break;
    case "Current Pipeline":
      vscode.postMessage({
        command: "bruin.validateCurrentPipeline",
      });
      break;
  }
}

function handleBruinValidateCurrentAsset() {
  vscode.postMessage({
    command: "bruin.validate",
  });
}

const checkboxItems = ref([
  { name: "Full-Refresh", checked: false },
  { name: "Exclusive-End-Date", checked: true },
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

  if (runOption == "Current Pipeline") {
    vscode.postMessage({
      command: "bruin.runCurrentPipeline",
      payload: payload,
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

const today = new Date(Date.now() - tzoffset);
const startDate = ref(
  new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 1, 0, 0, 0, 0))
    .toISOString()
    .slice(0, -1)
);

const endDate = ref(
  new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0))
    .toISOString()
    .slice(0, -1)
);

const endDateExclusive = ref("");

watch(
  endDate,
  (newEndDate) => {
    const adjustedEndDate = new Date(newEndDate);
    adjustedEndDate.setUTCHours(adjustedEndDate.getUTCHours() + 1); // Adding one hour
    endDateExclusive.value = adjustEndDateForExclusive(adjustedEndDate.toISOString());
  },
  { immediate: true }
);

function getCheckboxChangePayload() {
  console.log("start date", startDate.value);
  console.log("end date", endDate.value);
  return concatCommandFlags(
    startDate.value,
    endDate.value,
    endDateExclusive.value,
    checkboxItems.value
  );
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
  [checkboxItems, startDate, endDate, endDateExclusive],
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
      console.debug("-------------------------Validation result------------------------", validationSuccess.value);
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
      break;

    case "run-success":
      resetStates([renderSQLAssetError, validationError, validationSuccess, validateButtonStatus]);
      break;
    case "run-error":
      break;
  }
}
</script>
