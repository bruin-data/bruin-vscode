<template>
  <div class="divide-y overflow-hidden rounded-lg w-full">
    <div class="">
      <div class="flex flex-col space-y-4">
        <div class="flex flex-col space-y-3">
          <div>
            <div class="flex space-x-2 items-center">
              <DateInput class="w-2/5" label="Start Date" v-model="startDate" />
              <DateInput class="w-2/5" label="End Date" v-model="endDate" />
              <button
                type="button"
                class="rounded-md bg-editor-button-bg p-2 mt-6 text-editor-button-fg hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                @click="resetStartEndDate"
                :title="isCron ? `Schedule not supported yet` : `Reset Start and End Date`"
                :disabled="isCron"
              >
                <ArrowPathRoundedSquareIcon class="sm:h-5 sm:w-5 h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <CheckboxGroup :checkboxItems="checkboxItems" />
          </div>
        </div>
        <div class="flex flex-wrap justify-between items-center"> 
       <EnvSelectMenu :options="environments" @selected-env="setSelectedEnv" :selectedEnvironment="selectedEnvironment" /> 
        <div class="flex justify-end items-center space-x-2 sm:space-x-4 mt-2 sm:mt-0">
          <div class="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              class="relative inline-flex items-center rounded-l-md bg-editor-button-bg px-3 py-2 text-sm font-medium text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed focus:z-10"
              @click="handleBruinValidateCurrentAsset"
              :disabled="isNotAsset || isError"
            >
              <SparklesIcon v-if="!validateButtonStatus" class="h-4 w-4 mr-1"></SparklesIcon>
              <template v-else>
                <CheckCircleIcon
                  v-if="validateButtonStatus === 'validated'"
                  class="h-4 w-4 mr-1 text-editor-button-fg"
                  aria-hidden="true"
                />
                <XCircleIcon
                  v-else-if="validateButtonStatus === 'failed'"
                  class="h-4 w-4 mr-1 text-editorError-foreground"
                  aria-hidden="true"
                />
                <svg
                  v-else-if="validateButtonStatus === 'loading'"
                  class="animate-spin mr-1 h-4 w-4 text-editor-bg"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </template>
              Validate
            </button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton
                :disabled="isNotAsset || isError"
                class="relative inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md bg-editor-button-bg px-2 py-2 text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg focus:z-10"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </MenuButton>
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 z-10 -mr-1 mt-2 w-56 origin-top-right rounded-md bg-editor-button-bg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <div class="py-1">
                    <MenuItem key="validate-current" v-slot="{ active }">
                      <button
                        :class="[
                          active
                            ? 'bg-editor-button-hover-bg text-editor-button-fg'
                            : 'bg-editor-button-bg',
                          'block w-full text-left px-4 py-2 text-sm',
                        ]"
                        @click="handleBruinValidateCurrentPipeline"
                      >
                        Validate current pipeline
                      </button>
                    </MenuItem>
                    <MenuItem key="validate-all" v-slot="{ active }">
                      <button
                        :class="[
                          active
                            ? 'bg-editor-button-hover-bg text-editor-button-fg'
                            : 'bg-editor-button-bg',
                          'block w-full text-left px-4 py-2 text-sm',
                        ]"
                        @click="handleBruinValidateAllPipelines"
                        >
                        Validate all pipelines
                      </button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>

          <div class="inline-flex rounded-md shadow-sm sm:mt-0">
            <button
              type="button"
              :disabled="isNotAsset || isError"
              class="relative inline-flex items-center rounded-l-md bg-editor-button-bg px-3 py-2 text-sm font-medium text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="runAssetOnly"
            >
              <PlayIcon class="h-4 w-4 mr-1"></PlayIcon>
              Run
            </button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton
                :disabled="isNotAsset || isError"
                class="relative inline-flex items-center rounded-r-md bg-editor-button-bg px-2 py-2 text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </MenuButton>
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-editor-button-bg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                >
                  <div class="py-1">
                    <MenuItem key="validate-current" v-slot="{ active }">
                      <button
                        :class="[
                          active
                            ? 'bg-editor-button-hover-bg text-editor-button-fg'
                            : 'bg-editor-button-bg',
                          'block w-full text-left px-4 py-2 text-sm',
                        ]"
                        @click="runAssetWithDownstream"
                      >
                        Run with downstream
                      </button>
                    </MenuItem>
                    <MenuItem key="validate-all" v-slot="{ active }">
                      <button
                        :class="[
                          active
                            ? 'bg-editor-button-hover-bg text-editor-button-fg'
                            : 'bg-editor-button-bg',
                          'block w-full text-left px-4 py-2 text-sm',
                        ]"
                        @click="runCurrentPipeline"
                      >
                        Run the whole pipeline
                      </button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>
        </div>
             </div>
 
        <ErrorAlert v-if="isError" :errorMessage="errorMessage!" />
        <div v-if="language === 'sql'">
          <SqlEditor v-show="!isError" :code="code" :copied="false" :language="language" />
        </div>
        <div v-else class="overflow-hidden w-full h-20">
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
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";
import { handleError, concatCommandFlags, adjustEndDateForExclusive } from "@/utilities/helper";
import "@/assets/index.css";
import DateInput from "@/components/ui/date-inputs/DateInput.vue";
import SqlEditor from "@/components/asset/SqlEditor.vue";
import CheckboxGroup from "@/components/ui/checkbox-group/CheckboxGroup.vue";
import EnvSelectMenu from "@/components/ui/select-menu/EnvSelectMenu.vue";
import { updateValue, resetStates, determineValidationStatus } from "@/utilities/helper";

const errorState = computed(() => handleError(validationError.value, renderSQLAssetError.value));
const isError = computed(() => errorState.value?.errorCaptured);
const errorMessage = computed(() => errorState.value?.errorMessage);
const isNotAsset = computed(() => (renderAssetAlert.value ? true : false));

const props = defineProps<{
  schedule: string;
  environments: string [];
  selectedEnvironment: string;
}>();


import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/vue/24/solid";
import { SparklesIcon, PlayIcon, ArrowPathRoundedSquareIcon } from "@heroicons/vue/24/outline";

function handleBruinValidateAllPipelines() {
  vscode.postMessage({
    command: "bruin.validateAll",
  });
}

function handleBruinValidateCurrentPipeline() {
  vscode.postMessage({
    command: "bruin.validateCurrentPipeline",
  });
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

function runAssetOnly() {
  let payload = getCheckboxChangePayload();
  payload = payload + " --environment " + selectedEnv.value;
  vscode.postMessage({
    command: "bruin.runSql",
    payload: payload,
  });
}

function runAssetWithDownstream() {
  let payload = getCheckboxChangePayload();
  payload = payload + " --downstream" + " --environment " + selectedEnv.value;
  vscode.postMessage({
    command: "bruin.runSql",
    payload: payload,
  });
}

function runCurrentPipeline() {
  let payload = getCheckboxChangePayload();
  payload = payload + " --downstream" + " --environment " + selectedEnv.value;
  vscode.postMessage({
    command: "bruin.runCurrentPipeline",
    payload: payload,
  });
}

const selectedEnv = ref<string>("default");

function setSelectedEnv(env: string) {
  selectedEnv.value = env;
}
const isCron = ref(false);
const validationSuccess = ref(null);
const validationError = ref(null);
const renderSQLAssetSuccess = ref(null);
const renderPythonAsset = ref(null);
const renderSQLAssetError = ref(null);
const renderAssetAlert = ref(null);
const validateButtonStatus = ref("" as "validated" | "failed" | "loading" | null);

const today = new Date(Date.now());
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
    endDateExclusive.value = adjustEndDateForExclusive(newEndDate);
  },
  { immediate: true }
);

function resetStartEndDate() {
  switch (props.schedule) {
    case "daily":
      startDate.value = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 1, 0, 0, 0, 0)
      )
        .toISOString()
        .slice(0, -1);
      endDate.value = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
      )
        .toISOString()
        .slice(0, -1);
      break;
    case "weekly":
      const dayOfWeek = today.getUTCDay();
      const lastMonday = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek - 6, 0, 0, 0, 0)
      );

      const thisMonday = new Date(
        Date.UTC(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
          0,
          0,
          0,
          0
        )
      );
      startDate.value = lastMonday.toISOString().slice(0, -1);
      endDate.value = thisMonday.toISOString().slice(0, -1);
      break;
    case "monthly":
      const firstDayOfLastMonth = new Date(
        Date.UTC(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0)
      );
      const lastDayOfLastMonth = new Date(
        Date.UTC(today.getFullYear(), today.getMonth(), 0, 0, 0, 0, 0)
      );
      startDate.value = firstDayOfLastMonth.toISOString().slice(0, -1);
      endDate.value = lastDayOfLastMonth.toISOString().slice(0, -1);
      break;
    default:
      isCron.value = true;
  }
}
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
    const payload = getCheckboxChangePayload();
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
      console.debug(
        "-------------------------Validation result------------------------",
        validationSuccess.value
      );
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
