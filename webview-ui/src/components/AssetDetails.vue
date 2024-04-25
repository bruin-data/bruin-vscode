<template>

    <div class="flex flex-col p-4 space-y-4">
      <div class="flex flex-col space-y-3">
        <div class="flex flex-wrap gap-y-4">
          <DateInput 
          class="px-2 w-full sm:w-1/2" label="Start Date" 
          v-model="startDate" 
          
          />
          <DateInput class="px-2 w-full sm:w-1/2" label="End Date"  v-model="endDate" />
        </div>
        <div>
          <CheckboxGroup :checkboxItems="checkboxItems" />
        </div>
      </div>
      <div class="flex justify-end space-x-4">
        <CommandButton
          :disabled="isError"
          @click="handleBruinValidate"
          BGColor="bg-blue-500"
          :status="validateButtonStatus"
          >Validate</CommandButton
        >
        <CommandButton
          :disabled="isError"
          @click="runSql"
          BGColor="bg-green-500"
        >
          Run
        </CommandButton>
      </div>
      <ErrorAlert v-if="isError" :errorMessage="errorMessage!" />
      <div v-if="language === 'sql'">
      <SqlEditor
        v-show="!isError"
        :code="code"
        :copied="false"
        :language="language"
      />
    </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { allComponents, provideVSCodeDesignSystem } from "@vscode/webview-ui-toolkit";
  import { vscode } from "@/utilities/vscode";
  import { computed, onBeforeUnmount, onMounted, ref } from "vue";
  import { watch } from 'vue';
  import ErrorAlert from "@/components/ErrorAlert.vue";
  import { handleError, concatCommandFlags } from "@/utilities/helper";
  import "@/assets/index.css";
  import CommandButton from "@/components/ui/buttons/ActionButton.vue";
  import DateInput from "@/components/DateInput.vue";
  import SqlEditor from "@/components/SqlEditor.vue";
  import CheckboxGroup from "@/components/CheckboxGroup.vue";
  provideVSCodeDesignSystem().register(allComponents);
           
  
  const errorState = computed(() => handleError(validationError.value, renderSQLAssetError.value));
  const isError = computed(() => errorState.value?.errorCaptured);
  const errorMessage = computed(() => errorState.value?.errorMessage);
  
  function handleBruinValidate() {
    vscode.postMessage({
      command: "bruin.validate",
    });
  }
  
  const checkboxItems = ref([
    { name: "Downstream", checked: false },
    { name: "Full-Refresh", checked: false },
    { name: "Exclusive-End-Date", checked: false },
  ]);
  
  
  
  function runSql() {
    const payload = getCheckboxChangePayload(); 
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
  const validateButtonStatus = ref("" as "validated" | "failed" | "loading" | null);
  const tzoffset = new Date().getTimezoneOffset() * 60000; //offset in milliseconds
  
  //startDate := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
    //  endDate := time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 999999999, time.UTC)
  
  const yesterday = new Date(Date.now() - tzoffset - 86400000);
  
  const startDate = ref(new Date(Date.UTC(
    yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0
  )).toISOString().slice(0, -1));
  const endDate = ref(new Date(Date.UTC(
    yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999
  )).toISOString().slice(0, -1));
  
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
      command: 'checkboxChange',
      payload: initialPayload
    });
  }
  
  onMounted(() => {
    window.addEventListener("message", receiveMessage);
    sendInitialMessage();
  });
  
  onBeforeUnmount(() => {
    window.removeEventListener("message", receiveMessage);
  });
  
  watch([checkboxItems, startDate, endDate], () => {
    const payload: string = getCheckboxChangePayload();
    console.log("Checkbox change payload", payload);
    vscode.postMessage({
      command: 'checkboxChange',
      payload: payload 
    });
  }, { deep: true });
  
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
        case "validation-loading":
        validateButtonStatus.value = 'loading';
        validationSuccess.value = null;
        validationError.value = null;
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