<template>
  <!-- Container -->
  <div class="divide-y overflow-hidden w-full">
    <!-- Header Section -->
    <div class="flex flex-col space-y-3">
      <div class="flex flex-col">
        <!-- Checkbox and Date Controls Row -->
        <div class="flex flex-col xs:flex-row gap-1 w-full justify-between">
          <EnvSelectMenu
            :options="environments"
            @selected-env="setSelectedEnv"
            :selectedEnvironment="selectedEnvironment"
            class="flex-shrink-0 hidden xs:flex"
          />
          <!-- Date Controls and Checkbox Group -->
          <div id="controls" class="flex flex-col xs:w-1/2">
            <div class="flex gap-1 w-full justify-between xs:justify-end">
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
                <div class="relative ml-1">
                  <ChevronUpIcon
                    v-if="showCheckboxGroup"
                    class="h-4 w-4"
                    @click="updateVisibility"
                  />
                  <ChevronDownIcon v-else class="h-4 w-4" @click="updateVisibility" />
                </div>
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
      <div class="flex flex-wrap justify-between items-end space-y-1">
        <div class="flex-1 relative">
          <EnvSelectMenu
            :options="environments"
            @selected-env="setSelectedEnv"
            :selectedEnvironment="selectedEnvironment"
            class="flex-shrink-0 hidden xs:hidden 2xs:flex"
          />
        </div>

        <div class="flex justify-end items-center space-x-2 sm:space-x-4 sm:mt-0">
          <!-- Validate Button Group -->
          <div class="inline-flex">
            <vscode-button
              @click="handleBruinValidateCurrentAsset"
              :disabled="isNotAsset || isError"
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
            </vscode-button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton
                :disabled="isNotAsset || isError"
                class="relative h-full border border-transparent inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-editor-button-bg p-1 text-editor-button-fg hover:bg-editor-button-hover-bg focus:z-10"
              >
                <ChevronDownIcon class="h-4 w-4" aria-hidden="true" />
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
                <MenuItems class="absolute right-2 z-10 -mr-1 w-48 origin-top-right">
                  <div class="p-1 bg-editorWidget-bg rounded-sm border border-commandCenter-border">
                    <MenuItem key="validate-current">
                      <vscode-button
                        class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                        @click="handleBruinValidateCurrentPipeline"
                      >
                        Validate current pipeline
                      </vscode-button>
                    </MenuItem>
                    <MenuItem key="validate-all">
                      <vscode-button
                        class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                        @click="handleBruinValidateAllPipelines"
                      >
                        Validate all pipelines
                      </vscode-button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>

          <!-- Run Button Group -->
          <div class="inline-flex sm:mt-0">
            <vscode-button @click="runAssetOnly" :disabled="isNotAsset || isError">
              <div class="flex items-center">
                <PlayIcon class="h-4 w-4 mr-1" aria-hidden="true" />
                <span>Run</span>
              </div>
            </vscode-button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton
                :disabled="isNotAsset || isError"
                class="relative h-full border border-transparent inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-editor-button-bg p-1 text-editor-button-fg hover:bg-editor-button-hover-bg focus:z-10"
              >
                <ChevronDownIcon class="h-4 w-4" aria-hidden="true" />
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
                <MenuItems class="absolute right-0 z-10 w-48 origin-top-right">
                  <div class="p-1 bg-editorWidget-bg rounded-sm border border-commandCenter-border">
                    <MenuItem key="run-with-downstream" v-slot="{ active }">
                      <vscode-button
                        class="block text-editor-fg border-0 rounded-sm w-full text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                        @click="runAssetWithDownstream"
                      >
                        Run with downstream
                      </vscode-button>
                    </MenuItem>
                    <MenuItem key="run-current-pipeline" v-slot="{ active }">
                      <vscode-button
                        class="block text-editor-fg border-0 rounded-sm w-full text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                        @click="runCurrentPipeline"
                      >
                        Run the whole pipeline
                      </vscode-button>
                    </MenuItem>
                    <MenuItem key="run-with-continue" v-slot="{ active }">
                      <vscode-button
                        class="block text-editor-fg border-0 rounded-sm w-full text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                        @click="runPipelineWithContinue"
                      >
                        Continue from last failure
                      </vscode-button>
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
      <div class="">
        <div v-if="language === 'sql'" class="mt-1">
          <SqlEditor :code="code" :copied="false" :language="language" :showIntervalAlert="showIntervalAlert"/>
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
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/vue/24/solid";
import { SparklesIcon, PlayIcon, ArrowPathRoundedSquareIcon } from "@heroicons/vue/24/outline";
import type { FormattedErrorMessage } from "@/types";
import { Transition } from "vue";
import RudderStackService from "@/services/RudderStackService";

/**
 * Define component props
 */
const props = defineProps<{
  schedule: string;
  environments: string[];
  selectedEnvironment: string;
  hasIntervalModifiers: boolean;
}>();

/**
 * Reactive state variables
 */
const isNotAsset = ref(false);
const errorPhase = ref<"Validation" | "Rendering" | "Unknown">("Unknown");
const validationSuccess = ref(null);
const validationError = ref(null);
const renderSQLAssetSuccess = ref(null);
const renderPythonAsset = ref(null);
const renderSQLAssetError = ref(null);
const renderAssetAlert = ref<string | null>(null);
const validateButtonStatus = ref<"validated" | "failed" | "loading" | null>(null);
const showWarnings = ref(true);
const errorState = computed(() => handleError(validationError.value, renderSQLAssetError.value));
const isError = computed(() => errorState.value?.errorCaptured);
const errorMessage = computed(() => errorState.value?.errorMessage);
const toggled = ref(false);
const rudderStack = RudderStackService.getInstance();
const showIntervalAlert = ref(false);
const dismissedIntervalAlert = ref(false);

// Method to dismiss the alert
const dismissIntervalAlert = () => {
  dismissedIntervalAlert.value = true;
  showIntervalAlert.value = false;
};
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
  { name: "Interval-modifiers", checked: false },
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

watch(
  () => props.hasIntervalModifiers,
  (newVal) => {
    console.warn("Child: Interval modifiers updated:", newVal);
  }
);

watch(
  [
    () => props.hasIntervalModifiers,
    () => checkboxItems.value.find((item) => item.name === "Interval-modifiers")?.checked,
  ],
  ([hasIntervalModifiers, isChecked]) => {
    console.warn("Has interval modifiers:", props.hasIntervalModifiers);
    console.warn("Interval modifiers checked:", isChecked);

    showIntervalAlert.value = hasIntervalModifiers && !isChecked && !dismissedIntervalAlert.value;
    console.warn("Has interval modifiers:", props.hasIntervalModifiers);
    console.warn("Interval modifiers checked:", isChecked);
  },
  { immediate: true }
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
  handleEnvironmentChange(env);
  vscode.postMessage({
    command: "bruin.setSelectedEnvironment",
    payload: env,
  });
}

const handleEnvironmentChange = (env) => {
  rudderStack.trackEvent("Environment Selected", {
    selectedEnvironment: env,
  });
};

function buildCommandPayload(
  basePayload,
  options: { downstream?: boolean; continue?: boolean } = {}
) {
  const { downstream = false, continue: continueFlag = false } = options;
  let payload = basePayload;

  if (downstream) {
    payload += " --downstream";
  }

  if (continueFlag) {
    payload += " --continue";
    return payload;
  }

  if (selectedEnv.value && selectedEnv.value.trim() !== "") {
    payload += " --environment " + selectedEnv.value;
  }

  return payload;
}

/**
 * Functions to handle run and validate actions
 */
function runAssetOnly() {
  const payload = buildCommandPayload(getCheckboxChangePayload());

  vscode.postMessage({
    command: "bruin.runSql",
    payload,
  });
}

function runAssetWithDownstream() {
  const payload = buildCommandPayload(getCheckboxChangePayload(), { downstream: true });

  vscode.postMessage({
    command: "bruin.runSql",
    payload,
  });
}

function runPipelineWithContinue() {
  const payload = buildCommandPayload(getCheckboxChangePayload(), { continue: true });

  vscode.postMessage({
    command: "bruin.runContinue",
    payload,
  });
}

function runCurrentPipeline() {
  const payload = buildCommandPayload(getCheckboxChangePayload(), { downstream: false });

  vscode.postMessage({
    command: "bruin.runCurrentPipeline",
    payload,
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

watch(
  [startDate, endDate],
  ([newStart, newEnd]) => {
    vscode.postMessage({
      command: "bruin.updateQueryDates",
      payload: {
        startDate: newStart,
        endDate: newEnd,
      },
    });
  },
  { immediate: true }
);

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
    case "non-asset-file":
      isNotAsset.value = true;
      break;
    case "render-message":
      renderSQLAssetSuccess.value = updateValue(envelope, "success");
      renderSQLAssetError.value = updateValue(envelope, "error");
      renderPythonAsset.value = updateValue(envelope, "bruin-asset-alert");
      renderAssetAlert.value = updateValue(envelope, "non-asset-alert");
      isNotAsset.value = !!renderAssetAlert.value;
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
    case "setDefaultCheckboxStates":
      if (envelope.payload) {
        checkboxItems.value = checkboxItems.value.map((item) => ({
          ...item,
          checked: envelope.payload[item.name] !== undefined ? envelope.payload[item.name] : item.checked,
        }));
      }
      break;
  }
}
</script>
<style scoped>
vscode-checkbox::part(control) {
  @apply border-none outline-none w-3.5 h-3.5;
}
vscode-button::part(control) {
  @apply border-none;
}
</style>
