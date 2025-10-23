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
              <DateInput label="Start Date" v-model="startDate" :disabled="isFullRefreshChecked && isPipelineStartDateAvailable" />
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
          <div class="mt-2 flex items-center gap-2" ref="tagFilterContainer">
            <div class="flex items-center gap-[1px]">
              <label class="text-xs text-editor-fg">Tags</label>
              <vscode-button
                appearance="icon"
                class="h-3.5 w-auto p-0 opacity-70 hover:opacity-100 inline-flex items-center"
                id="tag-filter-button"
                title="Edit tag filters"
                @click="toggleTagFilterOpen"
              >
                <span
                  :class="[
                    'codicon',
                    hasActiveTagFilters ? 'codicon-filter-filled' : 'codicon-filter',
                    'text-[9px]',
                  ]"
                ></span>
              </vscode-button>

              <!-- Dropdown -->
              <div
                v-if="isTagFilterOpen"
                class="fixed z-[99999] w-[220px] max-w-[90vw] bg-dropdown-bg border border-commandCenter-border shadow-md rounded overflow-hidden tag-filter-dropdown"
                :style="tagDropdownStyle"
                @mousedown.stop
              >
                <div
                  class="sticky top-0 bg-dropdown-bg border-b border-commandCenter-border px-2 py-1"
                >
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
                  <div v-if="filteredTags.length === 0" class="px-2 py-2 text-2xs opacity-60">
                    No tags found
                  </div>
                </div>
                <div class="flex justify-end gap-2 p-1 border-t border-commandCenter-border">
                  <vscode-button
                    class="text-[10px] h-4 px-2 opacity-80 hover:opacity-100"
                    appearance="secondary"
                    @click="clearAllTagFilters"
                    >Clear</vscode-button
                  >
                  <vscode-button
                    class="text-[10px] h-4 px-2 opacity-80 hover:opacity-100"
                    @click="closeTagFilter"
                    >Done</vscode-button
                  >
                </div>
              </div>
            </div>
            <!-- Variables Section -->
            <div class="flex items-center gap-[1px]">
              <label class="text-xs text-editor-fg">Variables</label>
              <!-- Variables count indicator -->
              <span
                v-if="pipelineVariables && Object.keys(pipelineVariables).length > 0"
                class="text-3xs text-editor-fg opacity-60"
              >
                ({{ Object.keys(pipelineVariables).length }})
              </span>
              <vscode-button
                appearance="icon"
                class="h-3.5 w-auto p-0 opacity-70 hover:opacity-100 inline-flex items-center"
                id="variables-button"
                title="Manage pipeline variables"
                @click="toggleVariablesOpen"
              >
                <span class="codicon codicon-settings-gear text-[9px]"></span>
              </vscode-button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex flex-col xs:flex-row gap-2 justify-end items-start xs:items-end">
        <div
          class="flex flex-col 2xs:flex-row flex-wrap gap-2 justify-start xs:justify-end items-stretch 2xs:items-center w-full xs:w-auto"
        >
          <!-- Format Button Group -->
          <ButtonGroup
            label="Format"
            codicon="codicon-list-tree"
            codicon-class="codicon codicon-list-tree text-[9px] mr-1"
            :dropdown-items="[{ key: 'format-all', label: 'Format All' }]"
            @main-click="formatAsset"
            @dropdown-click="handleFormatDropdown"
          />
          <!-- Validate Button Group -->
          <div class="inline-flex">
            <vscode-button
              @click="handleBruinValidateCurrentAsset"
              :disabled="isNotAsset || isError"
              class="text-xs h-7"
            >
              <div class="flex items-center justify-center">
                <template v-if="validateButtonStatus === 'validated'">
                  <CheckCircleIcon class="h-4 w-4 mr-1 text-editor-button-fg" aria-hidden="true" />
                </template>
                <template v-else-if="validateButtonStatus === 'failed'">
                  <XCircleIcon
                    class="h-4 w-4 mr-1 text-editorError-foreground"
                    aria-hidden="true"
                  />
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
                class="relative h-7 border border-transparent inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-editor-button-bg px-1 text-editor-button-fg hover:bg-editor-button-hover-bg focus:z-10"
              >
                <ChevronDownIcon class="h-3 w-3" aria-hidden="true" />
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
                  class="absolute left-0 xs:right-0 xs:left-auto z-[99999] w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]"
                >
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
          <ButtonGroup
            label="Run"
            :icon="PlayIcon"
            icon-class="h-3 w-3 mr-1"
            :disabled="isNotAsset || isError"
            :dropdown-items="[
              { key: 'run-with-downstream', label: 'Run with downstream' },
              { key: 'run-current-pipeline', label: 'Run the whole pipeline' },
              { key: 'run-with-continue', label: 'Continue from last failure' }
            ]"
            @main-click="runAssetOnly"
            @dropdown-click="handleRunDropdown"
          />
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

      <!-- Pipeline Information -->
      <div v-if="isPipelineData" class="mt-4 bg-editorWidget-bg rounded p-2">
        <h4 class="text-xs font-medium text-editor-fg mb-2 opacity-80">Pipeline Configuration</h4>
        <table class="w-full text-xs">
          <tbody>
            <tr v-if="pipelineInfo.start_date">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">
                Start Date
              </td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.start_date }}</td>
            </tr>
            <tr v-if="pipelineInfo.retries !== undefined">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Retries</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.retries }}</td>
            </tr>
            <tr v-if="pipelineInfo.concurrency !== undefined">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">
                Concurrency
              </td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.concurrency }}</td>
            </tr>
            <tr v-if="pipelineInfo.catchup !== undefined">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Catchup</td>
              <td class="py-0.5 text-editor-fg font-mono">
                {{ pipelineInfo.catchup ? "Enabled" : "Disabled" }}
              </td>
            </tr>
            <tr v-if="pipelineInfo.assets && pipelineInfo.assets.length > 0">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Assets</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.assets.length }}</td>
            </tr>
            <tr
              v-if="
                pipelineInfo.default_connections &&
                Object.keys(pipelineInfo.default_connections).length > 0
              "
            >
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap align-top">
                Default Connection
              </td>
              <td class="py-0.5">
                <div class="space-y-0.5">
                  <div
                    v-for="(connection, type) in pipelineInfo.default_connections"
                    :key="type"
                    class="text-xs font-mono text-editor-fg opacity-80"
                  >
                    {{ type }}: {{ connection }}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="">
        <div v-if="props.assetType === 'ingestr' && !isError" class="mt-1">
          <IngestrAssetDisplay
            :parameters="ingestrParameters"
            :columns="props.columns"
            @save="handleIngestrSave"
          />
        </div>
        <div v-else-if="code && !renderSQLAssetError" class="mt-1">
          <!-- SqlEditor handles both success and error cost display in its header -->
          <SqlEditor
            :code="code"
            :copied="false"
            :language="language"
            :showIntervalAlert="showIntervalAlert"
            :bigqueryMetadata="bigqueryMetadata"
            :bigqueryError="props.assetMetadataError"
          />
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
    message="Do you want to run with full refresh? This may drop the table"
    confirm-text="Continue"
    @confirm="confirmFullRefresh"
    @cancel="cancelFullRefresh"
  />

  <!-- Variables Panel Component -->
  <VariablesPanel
    :is-open="isVariablesOpen"
    :variables="pipelineVariables"
    trigger-element-id="variables-button"
    @close="closeVariablesPanel"
    @save-variable="handleSaveVariable"
    @delete-variable="deleteVariable"
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
import VariablesPanel from "@/components/ui/variables-panel/VariablesPanel.vue";
import ButtonGroup from "@/components/ui/ButtonGroup.vue";
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
import { useConnectionsStore } from "@/store/bruinStore";

/**
 * Define component props
 */
const props = defineProps<{
  schedule: string;
  startDate: string;
  environments: string[];
  selectedEnvironment: string;
  hasIntervalModifiers: boolean;
  assetType?: string;
  parameters: any;
  columns: any[];
  tags?: string[];
  assetMetadata?: any;
  assetMetadataError?: string;
  pipeline?: any;
  filePath?: string;
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

const isPipelineStartDateAvailable = computed(() => {
  const startDate = props.startDate;
  return startDate !== undefined && startDate !== null && startDate !== "";
});

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

const formatAsset = () => {
  vscode.postMessage({
    command: "bruin.formatAsset",
  });
};

const formatAll = () => {
  vscode.postMessage({
    command: "bruin.formatAll",
  });
};

const handleFormatDropdown = (key: string) => {
  if (key === 'format-all') {
    formatAll();
  }
};

const handleRunDropdown = (key: string) => {
  switch (key) {
    case 'run-with-downstream':
      runAssetWithDownstream();
      break;
    case 'run-current-pipeline':
      runCurrentPipeline();
      break;
    case 'run-with-continue':
      runPipelineWithContinue();
      break;
  }
};

const showFullRefreshConfirmation = (runAction: () => void) => {
  pendingRunAction.value = runAction;
  showFullRefreshAlert.value = true;
};

// Computed property for ingestr parameters
const ingestrParameters = computed(() => {
  return props.parameters || {};
});

// Computed property for BigQuery metadata
const bigqueryMetadata = computed(() => {
  return props.assetMetadata?.bigquery || null;
});

const isPipelineData = computed(() => {
  if (
    !props.pipeline ||
    typeof props.pipeline !== "object" ||
    Object.keys(props.pipeline).length === 0
  ) {
    return false;
  }
  return props.pipeline.type === "pipelineConfig";
});

const pipelineInfo = computed(() => {
  return props.pipeline?.raw || props.pipeline || {};
});

const fetchedVariables = ref({});

const pipelineVariables = computed(() => {
  const filePath = props.filePath || "";

  if (filePath && fetchedVariables.value[filePath]) {
    try {
      const storeData = fetchedVariables.value[filePath];
      const parsedData = typeof storeData === "string" ? JSON.parse(storeData) : storeData;
      const variables = parsedData?.variables || parsedData?.pipeline?.variables || {};

      if (Object.keys(variables).length > 0) {
        // Ensure the variables object is serializable
        const serializedVars = JSON.parse(JSON.stringify(variables));
        return serializedVars;
      }
    } catch (error) {
      console.error("Error parsing pipeline variables:", error);
    }
  }

  // Safely return pipeline variables from props
  try {
    const pipelineVars = props.pipeline?.variables || {};
    const serializedVars = JSON.parse(JSON.stringify(pipelineVars));
    return serializedVars;
  } catch (error) {
    console.error("Error serializing pipeline variables from props:", error);
    return {};
  }
});

const needsPipelineVariables = computed(() => {
  if (isPipelineData.value) return false;

  const filePath = props.filePath;
  if (!filePath) return false;

  const hasPropsVariables =
    props.pipeline?.variables && Object.keys(props.pipeline.variables).length > 0;
  const hasFetchedVariables =
    fetchedVariables.value[filePath] && Object.keys(fetchedVariables.value[filePath]).length > 0;

  if (hasPropsVariables || hasFetchedVariables) return false;

  const hasBasicPipelineData = props.pipeline && (props.pipeline.name || props.pipeline.schedule);
  return hasBasicPipelineData;
});

const isRequestingVariables = ref(false);

const requestPipelineVariables = () => {
  const filePath = props.filePath;
  if (!filePath || isRequestingVariables.value) return;

  isRequestingVariables.value = true;
  vscode.postMessage({
    command: "bruin.parsePipelineForVariables",
    payload: {},
  });
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

// Tag filter state
const includeTags = ref<string[]>([]);
const excludeTags = ref<string[]>([]);
const availableTags = computed(() => (Array.isArray(props.tags) ? props.tags : []));
const isTagFilterOpen = ref(false);
const tagFilterContainer = ref<HTMLElement | null>(null);
const tagDropdownStyle = ref<Record<string, string>>({});
const tagFilterSearch = ref("");
const hasActiveTagFilters = computed(
  () => includeTags.value.length > 0 || excludeTags.value.length > 0
);

// Variables management state
const isVariablesOpen = ref(false);

// Computed property to track full-refresh checkbox state
const isFullRefreshChecked = computed(() => {
  return checkboxItems.value.find((item) => item.name === "Full-Refresh")?.checked || false;
});


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

// Close panels when clicking outside or on window resize
function onWindowClick(e: MouseEvent) {
  if (isTagFilterOpen.value) {
    const container = tagFilterContainer.value;
    if (container && !container.contains(e.target as Node)) {
      isTagFilterOpen.value = false;
    }
  }
}

function onWindowResize() {
  if (isTagFilterOpen.value) {
    updateTagDropdownPosition();
  }
}

onMounted(() => {
  window.addEventListener("click", onWindowClick, true);
  window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", onWindowClick, true);
  window.removeEventListener("resize", onWindowResize);
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
  // When full-refresh is checked, don't include start-date
  const effectiveStartDate = isFullRefreshChecked.value && isPipelineStartDateAvailable.value ? "" : startDate.value;

  return concatCommandFlags(
    effectiveStartDate,
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
    const checkboxState = checkboxItems.value.reduce(
      (acc, item) => {
        acc[String(item.name)] = Boolean(item.checked);
        return acc;
      },
      {} as Record<string, boolean>
    );

    const payload = {
      flags: getCheckboxChangePayload(),
      checkboxState,
      tagFilters: {
        include: [...includeTags.value].map((tag) => String(tag)),
        exclude: [...excludeTags.value].map((tag) => String(tag)),
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

watch(
  () => props.filePath,
  (newPath, oldPath) => {
    if (oldPath && requestTimeout) {
      clearTimeout(requestTimeout);
      requestTimeout = null;
    }
    isRequestingVariables.value = false;
  }
);

let requestTimeout: NodeJS.Timeout | null = null;

watch(
  needsPipelineVariables,
  (needsVariables) => {
    if (requestTimeout) {
      clearTimeout(requestTimeout);
      requestTimeout = null;
    }

    if (needsVariables) {
      requestTimeout = setTimeout(() => {
        requestPipelineVariables();
        requestTimeout = null;
      }, 100);
    }
  },
  { immediate: true }
);
function sendInitialMessage() {
  const checkboxState = checkboxItems.value.reduce(
    (acc, item) => {
      acc[String(item.name)] = Boolean(item.checked);
      return acc;
    },
    {} as Record<string, boolean>
  );

  const initialPayload = {
    flags: getCheckboxChangePayload(),
    checkboxState,
    tagFilters: {
      include: [...includeTags.value].map((tag) => String(tag)),
      exclude: [...excludeTags.value].map((tag) => String(tag)),
    },
  };

  vscode.postMessage({
    command: "checkboxChange",
    payload: initialPayload,
  });
}

function toggleTag(tag: string, list: "include" | "exclude") {
  if (list === "include") {
    const idx = includeTags.value.indexOf(tag);
    if (idx >= 0) {
      // Remove from include list
      includeTags.value = includeTags.value.filter((_, i) => i !== idx);
    } else {
      // Remove from exclude list if present
      const excludeIdx = excludeTags.value.indexOf(tag);
      if (excludeIdx >= 0) {
        excludeTags.value = excludeTags.value.filter((_, i) => i !== excludeIdx);
      }
      // Add to include list
      includeTags.value = [...includeTags.value, tag];
    }
  } else {
    const idx = excludeTags.value.indexOf(tag);
    if (idx >= 0) {
      // Remove from exclude list
      excludeTags.value = excludeTags.value.filter((_, i) => i !== idx);
    } else {
      // Remove from include list if present
      const includeIdx = includeTags.value.indexOf(tag);
      if (includeIdx >= 0) {
        includeTags.value = includeTags.value.filter((_, i) => i !== includeIdx);
      }
      // Add to exclude list
      excludeTags.value = [...excludeTags.value, tag];
    }
  }
}

/**
 * Initialize stores
 */
const connectionsStore = useConnectionsStore();
function setSelectedEnv(env: string) {
  selectedEnv.value = env;
  connectionsStore.setDefaultEnvironment(env);
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
  const fullRefreshChecked = checkboxItems.value.find(
    (item) => item.name === "Full-Refresh"
  )?.checked;

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
  const fullRefreshChecked = checkboxItems.value.find(
    (item) => item.name === "Full-Refresh"
  )?.checked;

  if (fullRefreshChecked) {
    showFullRefreshConfirmation(() => {
      const payload = buildCommandPayload(stripIncludeTagFlags(getCheckboxChangePayload()), {
        downstream: true,
      });
      vscode.postMessage({
        command: "bruin.runSql",
        payload,
      });
    });
    return;
  }

  const payload = buildCommandPayload(stripIncludeTagFlags(getCheckboxChangePayload()), {
    downstream: true,
  });

  vscode.postMessage({
    command: "bruin.runSql",
    payload,
  });
}

function runPipelineWithContinue() {
  const fullRefreshChecked = checkboxItems.value.find(
    (item) => item.name === "Full-Refresh"
  )?.checked;

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
  const fullRefreshChecked = checkboxItems.value.find(
    (item) => item.name === "Full-Refresh"
  )?.checked;

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

// Variables management methods
function toggleVariablesOpen() {
  isVariablesOpen.value = !isVariablesOpen.value;
}

function closeVariablesPanel() {
  isVariablesOpen.value = false;
}

function handleSaveVariable(event: { name: string; config: any; oldName?: string }) {
  const { name, config, oldName } = event;

  // Create a clean copy of current variables to avoid any non-serializable data
  const currentVariables = JSON.parse(JSON.stringify(pipelineVariables.value || {}));

  // If we're editing an existing variable and the name changed, remove the old one
  if (oldName && oldName !== name) {
    delete currentVariables[oldName];
  }

  currentVariables[name] = config;

  // Ensure the payload is serializable - following the same pattern as AssetColumns
  try {
    const formattedVariables = formatVariablesForPayload(currentVariables);
    const payload = { variables: formattedVariables };

    // Test serialization to catch any issues (same pattern as AssetColumns)
    const payloadStr = JSON.stringify(payload);
    const safePayload = JSON.parse(payloadStr);

    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: safePayload,
      source: "variables-save",
    });
  } catch (error) {
    console.error("Error serializing variables data:", error);

    // Fallback: send a minimal payload
    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: { variables: {} },
      source: "variables-save",
    });
  }
}

function deleteVariable(varName: string) {
  // Create a clean copy of current variables to avoid any non-serializable data
  const currentVariables = JSON.parse(JSON.stringify(pipelineVariables.value || {}));

  delete currentVariables[varName];

  // Ensure the payload is serializable - following the same pattern as AssetColumns
  try {
    const formattedVariables = formatVariablesForPayload(currentVariables);
    const payload = { variables: formattedVariables };

    // Test serialization to catch any issues (same pattern as AssetColumns)
    const payloadStr = JSON.stringify(payload);
    const safePayload = JSON.parse(payloadStr);

    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: safePayload,
      source: "variables-delete",
    });
  } catch (error) {
    console.error("Error serializing variables data:", error);

    // Fallback: send a minimal payload
    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: { variables: {} },
      source: "variables-delete",
    });
  }
}

// Format variables for payload - following the same pattern as AssetColumns formatColumnsForPayload
function formatVariablesForPayload(variables: any) {
  const formattedVariables: any = {};

  Object.keys(variables).forEach((varName) => {
    const variable = variables[varName];

    // Ensure all values are serializable (same pattern as AssetColumns)
    const safeVariable: any = {
      type: String(variable.type || "string"),
      default: variable.default !== undefined ? variable.default : null,
    };

    // Add optional fields if they exist
    if (variable.description) {
      safeVariable.description = String(variable.description);
    }

    if (variable.items) {
      safeVariable.items = variable.items;
    }

    if (variable.properties) {
      safeVariable.properties = variable.properties;
    }

    // Test serialization to catch any issues (same pattern as AssetColumns)
    try {
      JSON.stringify(safeVariable);
      formattedVariables[varName] = safeVariable;
    } catch (error) {
      console.error(`Error serializing variable ${varName}:`, error);
      // Return a safe fallback
      formattedVariables[varName] = {
        type: "string",
        default: null,
      };
    }
  });

  return formattedVariables;
}

/**
 * Event listener for message receiving
 */
onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);

  // Clean up any pending request timeout
  if (requestTimeout) {
    clearTimeout(requestTimeout);
    requestTimeout = null;
  }
});

watch(
  [startDate, endDate, selectedEnv],
  ([newStart, newEnd, newEnv]) => {
    vscode.postMessage({
      command: "bruin.updateQueryDates",
      payload: {
        startDate: String(newStart || ""),
        endDate: String(newEnd || ""),
        environment: String(newEnv || ""),
      },
    });

    // Also trigger asset metadata fetch with the current values
    vscode.postMessage({
      command: "bruin.getAssetMetadata",
      payload: {
        startDate: String(newStart || ""),
        endDate: String(newEnd || ""),
        environment: String(newEnv || ""),
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

      if (renderSQLAssetSuccess.value) {
        code.value = renderSQLAssetSuccess.value;
        language.value = "sql";
      } else if (!renderPythonAsset.value) {
        code.value = null;
        language.value = "";
      }

      errorPhase.value = renderSQLAssetError.value ? "Rendering" : "Unknown";
      resetStates([validationError, validationSuccess, validateButtonStatus]);
      break;

    case "pipeline-variables-message":
      isRequestingVariables.value = false;
      const filePath = props.filePath;

      if (!filePath) {
        console.log("No file path available for storing pipeline variables");
        return;
      }

      if (envelope.payload && envelope.payload.status === "success") {
        // Store the fetched pipeline variables locally, ensuring they're serializable
        try {
          const serializableData = JSON.parse(JSON.stringify(envelope.payload.message));
          fetchedVariables.value = {
            ...fetchedVariables.value,
            [filePath]: serializableData,
          };
        } catch (error) {
          console.error("Error serializing fetched variables:", error);
          // Store as string if serialization fails
          fetchedVariables.value = {
            ...fetchedVariables.value,
            [filePath]: JSON.stringify(envelope.payload.message),
          };
        }
      }
      break;

    case "patch-message":
      if (envelope.payload && envelope.payload.status === "success") {
        console.log("✅ Pipeline patch successful, re-requesting variables");
        // Re-request variables after successful patch
        if (props.filePath) {
          vscode.postMessage({
            command: "bruin.parsePipelineForVariables",
            payload: { filePath: props.filePath },
          });
        }
      } else if (envelope.payload && envelope.payload.status === "error") {
        console.error("❌ Pipeline patch failed:", envelope.payload.message);
      }
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

    case "file-changed":
      // When pipeline file changes, refresh variables only if variables panel is NOT open
      // (when panel is open, patch-message handles the refresh to avoid duplicates)
      if (envelope.filePath === props.filePath && props.filePath && !isVariablesOpen.value) {
        console.log("📝 Pipeline file changed, refreshing variables");
        // Clear cached variables for this file
        if (fetchedVariables.value[props.filePath]) {
          delete fetchedVariables.value[props.filePath];
        }
        // Re-request variables to get fresh data
        vscode.postMessage({
          command: "bruin.parsePipelineForVariables",
          payload: { filePath: props.filePath },
        });
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
  @apply border-none px-1.5;
}
</style>
