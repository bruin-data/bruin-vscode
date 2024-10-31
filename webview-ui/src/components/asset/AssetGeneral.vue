<template>
  <!-- Container -->
  <div class="divide-y overflow-hidden w-full">
    <!-- Header Section -->
    <div class="flex flex-col space-y-4">
      <div class="flex flex-col">
        <!-- Checkbox and Date Controls Row -->
        <div class="flex flex-col xs:flex-row gap-2 w-full justify-between">
          <EnvSelectMenu
            :options="environments"
            @selected-env="setSelectedEnv"
            :selectedEnvironment="selectedEnvironment"
            class="flex-shrink-0 hidden xs:flex"
          />
          <!-- Date Controls and Checkbox Group -->
          <div id="controls" class="flex flex-col xs:w-1/2">
            <div class="flex gap-1 w-full justify-between  xs:justify-end">
              <DateInput label="Start Date" v-model="startDate" />
              <DateInput label="End Date" v-model="endDate" />
              <div class="flex items-center self-end">
                <button
                  type="button"
                  @click="resetDatesOnSchedule"
                  :title="`Reset Start and End Date`"
                  class="rounded-sm bg-editor-button-bg p-1 text-editor-button-fg hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowPathRoundedSquareIcon class="h-3 w-3" aria-hidden="true" />
                </button>
                <Menu as="div" class="relative">
                  <MenuButton class="flex items-center">
                    <EllipsisVerticalIcon class="h-5 -mr-2.5 text-2xs text-icon-forground"></EllipsisVerticalIcon>
                  </MenuButton>
                  <Transition
                    enter-active-class="transition ease-out duration-100"
                    enter-from-class="transform opacity-0 scale-95"
                    enter-to-class="transform opacity-100 scale-100"
                    leave-active-class="transition ease-in duration-75"
                    leave-from-class="transform opacity-100 scale-100"
                    leave-to-class="transform opacity-0 scale-95"
                  >
                    <MenuItems
                      class="absolute right-0 z-10 mt-2 w-40 origin-top-right bg-input-background border border-commandCenter-border rounded-sm focus:outline-none"
                    >
                      <div class="py-0.5 pl-1">
                        <MenuItem>
                          <vscode-checkbox @change="updateVisibility" :checked="showCheckboxGroup">
                            Run Options
                          </vscode-checkbox>
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>
        </div>

        <!-- Conditional rendering of CheckboxGroup -->
        <div v-if="showCheckboxGroup">
          <CheckboxGroup :checkboxItems="checkboxItems" label="Options" />
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex flex-wrap space-y-2 justify-between items-end">
        <div class="flex-1">
          <EnvSelectMenu
            :options="environments"
            @selected-env="setSelectedEnv"
            :selectedEnvironment="selectedEnvironment"
            class="flex-shrink-0 hidden xs:hidden 2xs:flex"
          />
        </div>
        
        <div class="flex justify-end items-center space-x-2 sm:space-x-4 sm:mt-0">
          <!-- Validate Button Group -->
          <div class="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              @click="handleBruinValidateCurrentAsset"
              :disabled="isNotAsset || isError"
              class="relative inline-flex items-center rounded-l-md bg-editor-button-bg px-1.5 py-0.5 text-sm font-medium text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed focus:z-10"
            >
              <template v-if="validateButtonStatus === 'validated'">
                <CheckCircleIcon class="h-4 w-4 mr-1 text-editor-button-fg" aria-hidden="true" />
              </template>
              <template v-else-if="validateButtonStatus === 'failed'">
                <XCircleIcon class="h-4 w-4 mr-1 text-editorError-foreground" aria-hidden="true" />
              </template>
              <template v-else-if="validateButtonStatus === 'loading'">
                <svg
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
              <template v-else>
                <SparklesIcon class="h-4 w-4 mr-1"></SparklesIcon>
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
              <!-- Dropdown Menu for Validate -->
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-2 z-10 -mr-1 w-56 origin-top-right rounded-md bg-editor-button-bg ring-1 ring-opacity-5 focus:outline-none"
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

          <!-- Run Button Group -->
          <div class="inline-flex rounded-md shadow-sm sm:mt-0">
            <button
              type="button"
              @click="runAssetOnly"
              :disabled="isNotAsset || isError"
              class="relative inline-flex items-center rounded-l-md bg-editor-button-bg px-3 py-2 text-sm font-medium text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon class="h-4 w-4 mr-1"></PlayIcon>
              Run
            </button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton
                :disabled="isNotAsset || isError"
                class="relative inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md bg-editor-button-bg px-2 py-2 text-editor-button-fg ring-1 ring-inset ring-editor-button-border hover:bg-editor-button-hover-bg focus:z-10"
              >
                <ChevronDownIcon class="h-5 w-5" aria-hidden="true" />
              </MenuButton>
              <!-- Dropdown Menu for Run -->
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
                    <MenuItem key="run-with-downstream" v-slot="{ active }">
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
                    <MenuItem key="run-current-pipeline" v-slot="{ active }">
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

      <!-- Alerts and Code Display Section -->
      <ErrorAlert
        v-if="hasCriticalErrors"
        :errorMessage="errorMessage!"
        class="mb-4"
        :errorPhase="errorPhase"
        @errorClose="handleErrorClose"
      />
      <WarningAlert
        v-if="hasWarnings"
        :warnings="warningMessages"
        @warningClose="handleWarningClose"
      />
      <div v-if="language === 'sql'" class="mt-4">
        <SqlEditor :code="code" :copied="false" :language="language" />
      </div>
      <div v-else class="overflow-hidden w-full h-20">
        <pre class="white-space"></pre>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
/**
 * Import necessary dependencies
 */
import { vscode } from "@/utilities/vscode";
import { computed, onBeforeUnmount, onMounted, ref, defineProps, watch } from "vue";
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";
import WarningAlert from "@/components/ui/alerts/WarningAlert.vue";
import {
  handleError,
  concatCommandFlags,
  adjustEndDateForExclusive,
  resetStartEndDate,
} from "@/utilities/helper";
import "@/assets/index.css";
import DateInput from "@/components/ui/date-inputs/DateInput.vue";
import SqlEditor from "@/components/asset/SqlEditor.vue";
import CheckboxGroup from "@/components/ui/checkbox-group/CheckboxGroup.vue";
import EnvSelectMenu from "@/components/ui/select-menu/EnvSelectMenu.vue";
import { updateValue, resetStates, determineValidationStatus } from "@/utilities/helper";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/vue/24/solid";
import { SparklesIcon, PlayIcon, ArrowPathRoundedSquareIcon } from "@heroicons/vue/24/outline";
import type { FormattedErrorMessage } from "@/types";
import { EllipsisVerticalIcon } from "@heroicons/vue/20/solid";
import { Transition } from "vue";

/**
 * Define component props
 */
const props = defineProps<{
  schedule: string;
  environments: string[];
  selectedEnvironment: string;
}>();

/**
 * Reactive state variables
 */
const isNotAsset = computed(() => (renderAssetAlert.value ? true : false));
const errorPhase = ref<"Validation" | "Rendering" | "Unknown">("Unknown");
const validationSuccess = ref(null);
const validationError = ref(null);
const renderSQLAssetSuccess = ref(null);
const renderPythonAsset = ref(null);
const renderSQLAssetError = ref(null);
const renderAssetAlert = ref(null);
const validateButtonStatus = ref<"validated" | "failed" | "loading" | null>(null);
const showWarnings = ref(true);
const errorState = computed(() => handleError(validationError.value, renderSQLAssetError.value));
const isError = computed(() => errorState.value?.errorCaptured);
const errorMessage = computed(() => errorState.value?.errorMessage);
const toggled = ref(false);
/**
 * Computed properties for error handling and warnings
 */

const parsedErrorMessages = computed(() => {
  if (!errorMessage.value) return [];

  let errors;
  if (errorState.value?.isValidationError) {
    try {
      errors = JSON.parse(errorMessage.value);
    } catch {
      errors = [{ issues: [{ severity: "critical", message: errorMessage.value }] }];
    }
  } else {
    // Handle render errors (both JSON and plain text)
    let message = errorMessage.value;
    if (typeof message === "string" && message.startsWith("{")) {
      try {
        const parsedError = JSON.parse(message);
        message = parsedError.error || message;
      } catch {}
    }
    errors = [{ issues: [{ severity: "critical", message }] }];
  }

  return Array.isArray(errors) ? errors : [errors];
});

const handleErrorClose = () => {
  resetStates([validationError, renderSQLAssetError, errorPhase]);
};

const handleWarningClose = () => {
  showWarnings.value = false;
  warningMessages.value.splice(0, warningMessages.value.length);
};

const hasCriticalErrors = computed(() =>
  parsedErrorMessages.value.some(
    (error) =>
      error.issues &&
      Object.values(error.issues)
        .flat()
        .some((issue) => (issue as { severity: string }).severity === "critical")
  )
);

const hasWarnings = computed(
  () =>
    showWarnings.value &&
    parsedErrorMessages.value.some(
      (error: FormattedErrorMessage) =>
        error.issues &&
        Object.values(error.issues)
          .flat()
          .some((issue) => issue.severity === "warning")
    )
);

const warningMessages = computed(() =>
  parsedErrorMessages.value.filter(
    (error: FormattedErrorMessage) =>
      error.issues &&
      Object.values(error.issues)
        .flat()
        .some((issue) => issue.severity === "warning")
  )
);

/**
 * Checkbox items state
 */
const checkboxItems = ref([
  { name: "Full-Refresh", checked: false },
  { name: "Exclusive-End-Date", checked: true },
  { name: "Push-Metadata", checked: false },
]);

// State to control visibility of CheckboxGroup
const showCheckboxGroup = ref(false);

// Function to update visibility based on checkbox state
function updateVisibility() {
  showCheckboxGroup.value = !showCheckboxGroup.value;
  // This function can be used to perform additional actions if needed
}

/**
 * Selected environment state
 */
const selectedEnv = ref<string>("");

/**
 * Date state
 */
const timezone = new Date().getTimezoneOffset();
const today = new Date(Date.now() - timezone * 60000);

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

/**
 * Function to get checkbox change payload
 */
function getCheckboxChangePayload() {
  return concatCommandFlags(
    startDate.value,
    endDate.value,
    endDateExclusive.value,
    checkboxItems.value
  );
}

/**
 * Language and code state
 */
const language = ref("");
const code = ref(null);

/**
 * Lifecycle hooks
 */
onMounted(() => {
  if (props.selectedEnvironment) {
    selectedEnv.value = props.selectedEnvironment;
  }
  if ((vscode.getState() as { checkboxState?: { [key: string]: boolean } })?.checkboxState) {
    checkboxItems.value = checkboxItems.value.map((item) => ({
      ...item,
      checked:
        (vscode.getState() as { checkboxState: { [key: string]: boolean } }).checkboxState[
          item.name
        ] || item.checked,
    }));
  }

  sendInitialMessage();
  window.addEventListener("message", receiveMessage);
  sendInitialMessage();
});

/**
 * Watchers
 */
watch(
  () => props.selectedEnvironment,
  (newValue) => {
    selectedEnv.value = newValue;
  }
);

watch(
  [checkboxItems, startDate, endDate, endDateExclusive],
  () => {
    const checkboxState = checkboxItems.value.reduce((acc, item) => {
      acc[item.name] = item.checked;
      return acc;
    }, {});

    const payload = {
      flags: getCheckboxChangePayload(),
      checkboxState,
    };

    vscode.postMessage({
      command: "checkboxChange",
      payload: payload,
    });
  },
  { deep: true }
);

/**
 * Function to send initial message
 */
function sendInitialMessage() {
  const checkboxState = checkboxItems.value.reduce((acc, item) => {
    acc[item.name] = item.checked;
    return acc;
  }, {});

  const initialPayload = {
    flags: getCheckboxChangePayload(),
    checkboxState,
  };

  vscode.postMessage({
    command: "checkboxChange",
    payload: initialPayload,
  });
}

/**
 * Function to handle selected environment change
 */
function setSelectedEnv(env: string) {
  selectedEnv.value = env;
}

/**
 * Functions to handle run and validate actions
 */
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

function handleBruinValidateCurrentAsset() {
  vscode.postMessage({
    command: "bruin.validate",
  });
}

function handleBruinValidateCurrentPipeline() {
  vscode.postMessage({
    command: "bruin.validateCurrentPipeline",
  });
}

function handleBruinValidateAllPipelines() {
  vscode.postMessage({
    command: "bruin.validateAll",
  });
}

/**
 * Function to reset dates on schedule
 */
function resetDatesOnSchedule() {
  resetStartEndDate(props.schedule, today.getTime(), startDate, endDate);
}

/**
 * Event listener for message receiving
 */
onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
});

function receiveMessage(event: { data: any }) {
  if (!event) return;

  const envelope = event.data;
  switch (envelope.command) {
    case "validation-message":
      validationSuccess.value = updateValue(envelope, "success");
      validationError.value = updateValue(envelope, "error");
      const isLoading = updateValue(envelope, "loading");
      validateButtonStatus.value = isLoading
        ? "loading"
        : determineValidationStatus(
            validationSuccess.value,
            validationError.value,
            isLoading,
            hasCriticalErrors.value
          );
      errorPhase.value = validationError.value ? "Validation" : "Unknown";
      showWarnings.value = true;

      break;

    case "render-message":
      renderSQLAssetSuccess.value = updateValue(envelope, "success");
      renderSQLAssetError.value = updateValue(envelope, "error");
      renderPythonAsset.value = updateValue(envelope, "bruin-asset-alert");
      renderAssetAlert.value = updateValue(envelope, "non-asset-alert");
      code.value = renderSQLAssetSuccess.value || renderPythonAsset.value;
      language.value = renderSQLAssetSuccess.value ? "sql" : "python";
      errorPhase.value = renderSQLAssetError.value ? "Rendering" : "Unknown";

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
<style scoped>
vscode-checkbox::part(control) {
  @apply border-none outline-none w-3.5 h-3.5;
}
</style>