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
            class="flex-shrink-0"
          />
          <!-- Date Controls and Checkbox Group -->
          <div id="controls" class="flex flex-col xs:w-1/2">
            <div class="flex flex-col xs:flex-row gap-1 w-full justify-between xs:justify-end">
              <DateInput label="Start Date" v-model="startDate" />
              <DateInput label="End Date" v-model="endDate" />
              <div class="flex items-center gap-1 self-start xs:self-end">
                <button
                  type="button"
                  @click="resetDatesOnSchedule"
                  :title="`Reset Start and End Date`"
                  class="rounded-sm bg-editor-button-bg p-1 text-editor-button-fg hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowPathRoundedSquareIcon class="h-3 w-3" aria-hidden="true" />
                </button>
                <div class="relative" id="checkbox-group-chevron">
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
          <!-- Tag Filter Controls (subtle) -->
          <div class="mt-2 flex items-center gap-1" ref="tagFilterContainer">
            <label class="text-xs text-editor-fg ">Tags</label>
            <vscode-button
              appearance="icon"
              class="h-3.5 w-auto p-0 opacity-70 hover:opacity-100 inline-flex items-center"
              id="tag-filter-button"
              title="Edit tag filters"
              @click="toggleTagFilterOpen"
            >
              <span :class="['codicon', hasActiveTagFilters ? 'codicon-filter-filled' : 'codicon-filter', 'text-[9px]']"></span>
            </vscode-button>

            <!-- Dropdown -->
            <div
              v-if="isTagFilterOpen"
              class="fixed z-[9999] w-[220px] max-w-[90vw] bg-dropdown-bg border border-commandCenter-border shadow-md rounded overflow-hidden tag-filter-dropdown"
              :style="tagDropdownStyle"
              @mousedown.stop
            >
              <div class="sticky top-0 bg-dropdown-bg border-b border-commandCenter-border px-2 py-1">
                <input
                  v-model="tagFilterSearch"
                  placeholder="Search tags..."
                  class="w-full bg-dropdown-bg text-inputValidation-infoBorder text-[11px] border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6 px-2 rounded"
                  @click.stop
                  @mousedown.stop
                />
              </div>
              <div class="max-h-48 overflow-y-auto">
                <div
                  v-for="tag in filteredTags"
                  :key="tag"
                  class="flex items-center justify-between px-2 py-1 text-[11px] hover:bg-list-hoverBackground/60"
                >
                  <span class="font-mono truncate pr-2 opacity-80">{{ tag }}</span>
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center h-3.5 px-1 rounded-sm text-3xs opacity-70 hover:opacity-100"
                      :class="includeTags.includes(tag) ? 'bg-button-bg text-button-fg' : ''"
                      title="Include"
                      @click="toggleTag(tag, 'include')"
                    >
                      Inc
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center justify-center h-3.5 px-1 rounded-sm text-3xs opacity-70 hover:opacity-100"
                      :class="excludeTags.includes(tag) ? 'bg-button-bg text-button-fg' : ''"
                      title="Exclude"
                      @click="toggleTag(tag, 'exclude')"
                    >
                      Exc
                    </button>
                  </div>
                </div>
                <div v-if="filteredTags.length === 0" class="px-2 py-2 text-2xs opacity-60">No tags found</div>
              </div>
              <div class="flex justify-end gap-2 p-1 border-t border-commandCenter-border">
                <vscode-button class="text-[10px] h-4 px-2 opacity-80 hover:opacity-100" appearance="secondary" @click="clearAllTagFilters">Clear</vscode-button>
                <vscode-button class="text-[10px] h-4 px-2 opacity-80 hover:opacity-100" @click="closeTagFilter">Done</vscode-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex flex-col xs:flex-row gap-2 justify-end items-start xs:items-end">

        <div class="flex flex-col 2xs:flex-row flex-wrap gap-2 justify-start xs:justify-end items-stretch 2xs:items-center w-full xs:w-auto">
          <!-- Validate Button Group -->
          <div class="inline-flex">
            <vscode-button
              @click="handleBruinValidateCurrentAsset"
              :disabled="isNotAsset || isError"
            >
          <div class="flex items-center justify-center">
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
                <span>Validate</span>
              </div>
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
                <MenuItems class="absolute left-0 xs:right-0 xs:left-auto z-10 w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]">
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
          <div class="inline-flex">
            <vscode-button @click="runAssetOnly" :disabled="isNotAsset || isError">
              <div class="flex items-center justify-center">
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
                <MenuItems class="absolute left-0 xs:right-0 xs:left-auto z-10 w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]">
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
        <div v-if="props.assetType === 'ingestr' && !isError" class="mt-1">
          <IngestrAssetDisplay :parameters="ingestrParameters" :columns="props.columns" @save="handleIngestrSave" />
        </div>
        <div v-else-if="language === 'sql'" class="mt-1">
          <SqlEditor :code="code" :copied="false" :language="language" :showIntervalAlert="showIntervalAlert"/>
        </div>
        <div v-else class="overflow-hidden w-full h-20">
          <pre class="white-space"></pre>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Full Refresh Confirmation Dialog -->
  <AlertWithActions
    v-if="showFullRefreshAlert"
    message="Do you want to run with full refresh? This will drop the table"
    confirm-text="Continue"
    @confirm="confirmFullRefresh"
    @cancel="cancelFullRefresh"
  />
</template>
<script setup lang="ts">
import { vscode } from "@/utilities/vscode";
import { computed, onBeforeUnmount, onMounted, ref, defineProps, watch } from "vue";
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";
import WarningAlert from "@/components/ui/alerts/WarningAlert.vue";
import AlertWithActions from "@/components/ui/alerts/AlertWithActions.vue";
import {
  handleError,
  concatCommandFlags,
  adjustEndDateForExclusive,
  resetStartEndDate,
} from "@/utilities/helper";
import "@/assets/index.css";
import DateInput from "@/components/ui/date-inputs/DateInput.vue";
import SqlEditor from "@/components/asset/SqlEditor.vue";
import IngestrAssetDisplay from "@/components/asset/IngestrAssetDisplay.vue";
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
  assetType?: string;
  parameters: any;
  columns: any[];
  tags?: string[];
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

// Full refresh alert state
const showFullRefreshAlert = ref(false);
const pendingRunAction = ref<(() => void) | null>(null);

// Method to dismiss the alert
const dismissIntervalAlert = () => {
  dismissedIntervalAlert.value = true;
  showIntervalAlert.value = false;
};

// Full refresh alert methods
const confirmFullRefresh = () => {
  showFullRefreshAlert.value = false;
  if (pendingRunAction.value) {
    pendingRunAction.value();
    pendingRunAction.value = null;
  }
};

const cancelFullRefresh = () => {
  showFullRefreshAlert.value = false;
  pendingRunAction.value = null;
};

const showFullRefreshConfirmation = (runAction: () => void) => {
  pendingRunAction.value = runAction;
  showFullRefreshAlert.value = true;
};

// Computed property for ingestr parameters
const ingestrParameters = computed(() => {
  return props.parameters || {};
});

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

// Tag filter state
const includeTags = ref<string[]>([]);
const excludeTags = ref<string[]>([]);
const availableTags = computed(() => (Array.isArray(props.tags) ? props.tags : []));
const isTagFilterOpen = ref(false);
const tagFilterContainer = ref<HTMLElement | null>(null);
const tagDropdownStyle = ref<Record<string, string>>({});
const tagFilterSearch = ref("");
const hasActiveTagFilters = computed(() => includeTags.value.length > 0 || excludeTags.value.length > 0);
  const activeTagCount = computed(() => includeTags.value.length + excludeTags.value.length);
const filteredTags = computed(() => {
  const q = tagFilterSearch.value.toLowerCase().trim();
  const all = availableTags.value || [];
  if (!q) return all;
  return all.filter((t: string) => t.toLowerCase().includes(q));
});

function toggleTagFilterOpen() {
  isTagFilterOpen.value = !isTagFilterOpen.value;
  updateTagDropdownPosition();
}

function updateTagDropdownPosition() {
  try {
    const el = document.getElementById("tag-filter-button");
    if (!el) return;
    const rect = el.getBoundingClientRect();
    tagDropdownStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
    };
  } catch (_) {}
}

function closeTagFilter() {
  isTagFilterOpen.value = false;
}

// Close the tag panel when clicking outside
function onWindowClick(e: MouseEvent) {
  if (!isTagFilterOpen.value) return;
  const container = tagFilterContainer.value;
  if (container && !container.contains(e.target as Node)) {
    isTagFilterOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', onWindowClick, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', onWindowClick, true);
});

function clearAllTagFilters() {
  includeTags.value = [];
  excludeTags.value = [];
}

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
    checkboxItems.value,
    {
      include: includeTags.value,
      exclude: excludeTags.value,
    }
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
  const persistedState = vscode.getState() as {
    checkboxState?: { [key: string]: boolean };
    startDate?: string;
    endDate?: string;
    includeTags?: string[];
    excludeTags?: string[];
  };
  if (persistedState?.checkboxState) {
    checkboxItems.value = checkboxItems.value.map((item) => ({
      ...item,
      checked: persistedState.checkboxState![item.name] ?? item.checked,
    }));
  }
  if (persistedState?.startDate) {
    startDate.value = persistedState.startDate;
  }
  if (persistedState?.endDate) {
    endDate.value = persistedState.endDate;
  }
  try {
    if (Array.isArray(persistedState?.includeTags)) {
      includeTags.value = [...(persistedState.includeTags || [])];
    }
    if (Array.isArray(persistedState?.excludeTags)) {
      excludeTags.value = [...(persistedState.excludeTags || [])];
    }
  } catch (_) {}

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
  [checkboxItems, startDate, endDate, endDateExclusive, includeTags, excludeTags],
  () => {
    const checkboxState = checkboxItems.value.reduce((acc, item) => {
      acc[item.name] = item.checked;
      return acc;
    }, {});

    const payload = {
      flags: getCheckboxChangePayload(),
      checkboxState,
      tagFilters: {
        include: [...includeTags.value],
        exclude: [...excludeTags.value],
      },
    };

    vscode.postMessage({
      command: "checkboxChange",
      payload: payload,
    });

    try {
      const prevState = (vscode.getState() as Record<string, any>) || {};
      vscode.setState({
        ...prevState,
        checkboxState,
        startDate: startDate.value,
        endDate: endDate.value,
        includeTags: includeTags.value,
        excludeTags: excludeTags.value,
      });
    } catch (_) {}
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

    showIntervalAlert.value = hasIntervalModifiers && !isChecked && !dismissedIntervalAlert.value;
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
    tagFilters: {
      include: [...includeTags.value],
      exclude: [...excludeTags.value],
    },
  };

  vscode.postMessage({
    command: "checkboxChange",
    payload: initialPayload,
  });
}

function toggleTag(tag: string, list: 'include' | 'exclude') {
  const source = list === 'include' ? includeTags.value : excludeTags.value;
  const other = list === 'include' ? excludeTags.value : includeTags.value;
  const idx = source.indexOf(tag);
  if (idx >= 0) {
    source.splice(idx, 1);
  } else {
    const otherIdx = other.indexOf(tag);
    if (otherIdx >= 0) {
      other.splice(otherIdx, 1);
    }
    source.push(tag);
  }
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

// Single-asset runs cannot use --tag; strip them but keep --exclude-tag
function stripIncludeTagFlags(flags: string) {
  try {
    return flags.replace(/\s--tag\s+[^\s]+/g, "");
  } catch (_) {
    return flags;
  }
}

// Single-asset runs also cannot use --exclude-tag; strip them for plain Run
function stripExcludeTagFlags(flags: string) {
  try {
    return flags.replace(/\s--exclude-tag\s+[^\s]+/g, "");
  } catch (_) {
    return flags;
  }
}

/**
 * Functions to handle run and validate actions
 */
function runAssetOnly() {
  const fullRefreshChecked = checkboxItems.value.find(item => item.name === "Full-Refresh")?.checked;
  
  if (fullRefreshChecked) {
    showFullRefreshConfirmation(() => {
      const payload = buildCommandPayload(
        stripExcludeTagFlags(stripIncludeTagFlags(getCheckboxChangePayload()))
      );
      vscode.postMessage({
        command: "bruin.runSql",
        payload,
      });
    });
    return;
  }
  
  const payload = buildCommandPayload(
    stripExcludeTagFlags(stripIncludeTagFlags(getCheckboxChangePayload()))
  );

  vscode.postMessage({
    command: "bruin.runSql",
    payload,
  });
}

function runAssetWithDownstream() {
  const fullRefreshChecked = checkboxItems.value.find(item => item.name === "Full-Refresh")?.checked;
  
  if (fullRefreshChecked) {
    showFullRefreshConfirmation(() => {
      const payload = buildCommandPayload(stripIncludeTagFlags(getCheckboxChangePayload()), { downstream: true });
      vscode.postMessage({
        command: "bruin.runSql",
        payload,
      });
    });
    return;
  }
  
  const payload = buildCommandPayload(stripIncludeTagFlags(getCheckboxChangePayload()), { downstream: true });

  vscode.postMessage({
    command: "bruin.runSql",
    payload,
  });
}

function runPipelineWithContinue() {
  const fullRefreshChecked = checkboxItems.value.find(item => item.name === "Full-Refresh")?.checked;
  
  if (fullRefreshChecked) {
    showFullRefreshConfirmation(() => {
      const payload = buildCommandPayload(getCheckboxChangePayload(), { continue: true });
      vscode.postMessage({
        command: "bruin.runContinue",
        payload,
      });
    });
    return;
  }
  
  const payload = buildCommandPayload(getCheckboxChangePayload(), { continue: true });

  vscode.postMessage({
    command: "bruin.runContinue",
    payload,
  });
}

function runCurrentPipeline() {
  const fullRefreshChecked = checkboxItems.value.find(item => item.name === "Full-Refresh")?.checked;
  
  if (fullRefreshChecked) {
    showFullRefreshConfirmation(() => {
      const payload = buildCommandPayload(getCheckboxChangePayload(), { downstream: false });
      vscode.postMessage({
        command: "bruin.runCurrentPipeline",
        payload,
      });
    });
    return;
  }
  
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
 * Handle ingestr parameters save using setAssetDetails
 */
function handleIngestrSave(parameters) {
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      parameters: parameters,
    },
    source: "AssetGeneral_ingestrSave",
  });
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
        try {
          const payloadObj = envelope.payload as Record<string, boolean>;
          checkboxItems.value = checkboxItems.value.map((item) => ({
            ...item,
            checked: payloadObj[item.name] !== undefined ? payloadObj[item.name] : item.checked,
          }));
        } catch (_) {}

        // Sync persisted state with values coming from the extension side
        try {
          const prevState = (vscode.getState() as Record<string, any>) || {};
          vscode.setState({
            ...prevState,
            checkboxState: envelope.payload,
          });
        } catch (_) {}
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
