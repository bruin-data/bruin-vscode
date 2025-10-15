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
              <DateInput label="Start Date" v-model="startDate" :disabled="isFullRefreshChecked" />
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
              class="fixed z-[99999] w-[220px] max-w-[90vw] bg-dropdown-bg border border-commandCenter-border shadow-md rounded overflow-hidden tag-filter-dropdown"
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

          <!-- Variables Section -->
          <div class="mt-2 flex items-center gap-1">
            <label class="text-xs text-editor-fg">Variables</label>
            <vscode-button
              appearance="icon"
              class="h-3.5 w-auto p-0 opacity-70 hover:opacity-100 inline-flex items-center"
              id="variables-button"
              title="Manage pipeline variables"
              @click="toggleVariablesOpen"
            >
              <span class="codicon codicon-settings-gear text-[9px]"></span>
            </vscode-button>
            
            <!-- Variables count indicator -->
            <span v-if="pipelineVariables && Object.keys(pipelineVariables).length > 0" 
                  class="text-2xs text-editor-fg opacity-60">
              ({{ Object.keys(pipelineVariables).length }})
            </span>
            <span v-else class="text-2xs text-editor-fg opacity-40">
              (none configured)
            </span>
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
                <MenuItems class="absolute left-0 xs:right-0 xs:left-auto z-[99999] w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]">
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
                <MenuItems class="absolute left-0 xs:right-0 xs:left-auto z-[99999] w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]">
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

      <!-- Pipeline Information -->
      <div v-if="isPipelineData" class="mt-4 bg-editorWidget-bg rounded p-2">
        <h4 class="text-xs font-medium text-editor-fg mb-2 opacity-80">Pipeline Configuration</h4>
        <table class="w-full text-xs">
          <tbody>
            <tr v-if="pipelineInfo.start_date">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Start Date</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.start_date }}</td>
            </tr>
            <tr v-if="pipelineInfo.retries !== undefined">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Retries</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.retries }}</td>
            </tr>
            <tr v-if="pipelineInfo.concurrency !== undefined">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Concurrency</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.concurrency }}</td>
            </tr>
            <tr v-if="pipelineInfo.catchup !== undefined">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Catchup</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.catchup ? 'Enabled' : 'Disabled' }}</td>
            </tr>
            <tr v-if="pipelineInfo.assets && pipelineInfo.assets.length > 0">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap">Assets</td>
              <td class="py-0.5 text-editor-fg font-mono">{{ pipelineInfo.assets.length }}</td>
            </tr>
            <tr v-if="pipelineInfo.default_connections && Object.keys(pipelineInfo.default_connections).length > 0">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap align-top">Default Connection</td>
              <td class="py-0.5">
                <div class="space-y-0.5">
                  <div v-for="(connection, type) in pipelineInfo.default_connections" :key="type" 
                       class="text-xs font-mono text-editor-fg opacity-80">
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
          <IngestrAssetDisplay :parameters="ingestrParameters" :columns="props.columns" @save="handleIngestrSave" />
        </div>
        <div v-else-if="code && !isError" class="mt-1">
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
    message="Do you want to run with full refresh? This will drop the table"
    confirm-text="Continue"
    @confirm="confirmFullRefresh"
    @cancel="cancelFullRefresh"
  />

  <!-- Variables Panel -->
  <div v-if="isVariablesOpen" class="mt-2 bg-editorWidget-bg rounded border border-commandCenter-border p-3">
    <div class="space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-medium text-editor-fg">Pipeline Variables</h4>
        <vscode-button
          appearance="icon"
          class="h-5 w-5 p-0 opacity-70 hover:opacity-100"
          title="Add variable"
          @click="addVariable"
        >
          <span class="codicon codicon-add text-[10px]"></span>
        </vscode-button>
      </div>

      <!-- Variables List -->
      <div v-if="pipelineVariables && Object.keys(pipelineVariables).length > 0" class="space-y-2">
        <div v-for="(variable, varName) in pipelineVariables" :key="varName" 
             class="flex items-center justify-between p-2 bg-editor-bg rounded border border-commandCenter-border">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-mono text-editor-fg font-medium">{{ varName }}</span>
              <span class="text-2xs px-1.5 py-0.5 bg-button-bg text-button-fg rounded">{{ variable.type }}</span>
            </div>
            <div v-if="variable.description" class="text-2xs text-editor-fg opacity-70 mb-1">
              {{ variable.description }}
            </div>
            <div class="text-2xs text-editor-fg opacity-60">
              Default: <span class="font-mono">{{ formatVariableValue(variable.default) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 ml-2">
            <vscode-button
              appearance="icon"
              class="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              title="Edit variable"
              @click="editVariable(String(varName), variable)"
            >
              <span class="codicon codicon-edit text-[10px]"></span>
            </vscode-button>
            <vscode-button
              appearance="icon"
              class="h-6 w-6 p-0 opacity-70 hover:opacity-100"
              title="Delete variable"
              @click="deleteVariable(String(varName))"
            >
              <span class="codicon codicon-trash text-[10px]"></span>
            </vscode-button>
          </div>
        </div>
      </div>

      <!-- No variables state -->
      <div v-else class="text-center py-4">
        <div class="text-2xs text-editor-fg opacity-60 mb-2">No variables configured</div>
        <vscode-button
          appearance="secondary"
          class="text-2xs h-6 px-3"
          @click="addVariable"
        >
          Add Variable
        </vscode-button>
      </div>
    </div>
  </div>

  <!-- Add/Edit Variable Form -->
  <div v-if="editingVariable" class="mt-2 bg-editorWidget-bg rounded border border-commandCenter-border p-3">
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-medium text-editor-fg">
          {{ editingVariable === 'new' ? 'Add Variable' : 'Edit Variable' }}
        </h4>
        <vscode-button
          appearance="icon"
          class="h-6 w-6 p-0 opacity-70 hover:opacity-100"
          title="Close"
          @click="cancelEdit"
        >
          <span class="codicon codicon-close text-[10px]"></span>
        </vscode-button>
      </div>
      
      <div class="space-y-3">
        <div>
          <label class="block text-2xs text-editor-fg mb-1">Variable Name</label>
          <input
            v-model="newVariableName"
            type="text"
            placeholder="e.g., env, users, config"
            class="w-full bg-editor-bg text-editor-fg text-xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
          />
        </div>
        
        <div>
          <label class="block text-2xs text-editor-fg mb-1">Type</label>
          <select
            v-model="newVariableType"
            class="w-full bg-editor-bg text-editor-fg text-xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
          >
            <option value="string">String</option>
            <option value="integer">Integer</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="array">Array</option>
            <option value="object">Object</option>
          </select>
        </div>
        
        <div>
          <label class="block text-2xs text-editor-fg mb-1">Default Value</label>
          <input
            v-model="newVariableDefault"
            type="text"
            :placeholder="getDefaultPlaceholder()"
            class="w-full bg-editor-bg text-editor-fg text-xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
          />
        </div>
        
        <div>
          <label class="block text-2xs text-editor-fg mb-1">Description (optional)</label>
          <input
            v-model="newVariableDescription"
            type="text"
            placeholder="What is this variable used for?"
            class="w-full bg-editor-bg text-editor-fg text-xs border border-commandCenter-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg"
          />
        </div>
      </div>
      
      <div class="flex justify-end gap-2 pt-2 border-t border-commandCenter-border">
        <vscode-button
          appearance="secondary"
          class="text-2xs h-6 px-2"
          @click="cancelEdit"
        >
          Cancel
        </vscode-button>
        <vscode-button
          class="text-2xs h-6 px-2"
          @click="saveVariable"
          :disabled="!newVariableName.trim() || !newVariableDefault.trim()"
        >
          {{ editingVariable === 'new' ? 'Add' : 'Save' }}
        </vscode-button>
      </div>
    </div>
  </div>
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
  assetMetadata?: any;
  assetMetadataError?: string;
  pipeline?: any;
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

// Computed property for BigQuery metadata
const bigqueryMetadata = computed(() => {
  return props.assetMetadata?.bigquery || null;
});

// Pipeline information computed properties  
const isPipelineData = computed(() => {
  // Only show for pipeline config files
  if (!props.pipeline || typeof props.pipeline !== 'object' || Object.keys(props.pipeline).length === 0) {
    return false;
  }
  
  const isPipelineConfig = props.pipeline.type === 'pipelineConfig' ||
                          (props.pipeline.raw && typeof props.pipeline.raw === 'object') ||
                          (props.pipeline.assets && Array.isArray(props.pipeline.assets)) ||
                          (props.pipeline.default_connections && typeof props.pipeline.default_connections === 'object');
  
  return isPipelineConfig;
});

const pipelineInfo = computed(() => {
  return props.pipeline?.raw || props.pipeline || {};
});

const pipelineVariables = computed(() => {
  return props.pipeline?.variables || {};
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

// Variables management state
const isVariablesOpen = ref(false);
const editingVariable = ref<string | null>(null);
const newVariableName = ref("");
const newVariableType = ref("string");
const newVariableDefault = ref("");
const newVariableDescription = ref("");

// Computed property to track full-refresh checkbox state
const isFullRefreshChecked = computed(() => {
  return checkboxItems.value.find(item => item.name === "Full-Refresh")?.checked || false;
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
  // When full-refresh is checked, don't include start-date
  const effectiveStartDate = isFullRefreshChecked.value ? "" : startDate.value;
  
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
    const checkboxState = checkboxItems.value.reduce((acc, item) => {
      acc[String(item.name)] = Boolean(item.checked);
      return acc;
    }, {} as Record<string, boolean>);

    const payload = {
      flags: getCheckboxChangePayload(),
      checkboxState,
      tagFilters: {
        include: [...includeTags.value].map(tag => String(tag)),
        exclude: [...excludeTags.value].map(tag => String(tag)),
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
    acc[String(item.name)] = Boolean(item.checked);
    return acc;
  }, {} as Record<string, boolean>);

  const initialPayload = {
    flags: getCheckboxChangePayload(),
    checkboxState,
    tagFilters: {
      include: [...includeTags.value].map(tag => String(tag)),
      exclude: [...excludeTags.value].map(tag => String(tag)),
    },
  };

  vscode.postMessage({
    command: "checkboxChange",
    payload: initialPayload,
  });
}

function toggleTag(tag: string, list: 'include' | 'exclude') {
  if (list === 'include') {
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

// Variables management methods
function toggleVariablesOpen() {
  isVariablesOpen.value = !isVariablesOpen.value;
}


function addVariable() {
  editingVariable.value = 'new';
  newVariableName.value = "";
  newVariableType.value = "string";
  newVariableDefault.value = "";
  newVariableDescription.value = "";
}

function editVariable(varName: string, variable: any) {
  editingVariable.value = varName;
  newVariableName.value = varName;
  newVariableType.value = variable.type || "string";
  newVariableDefault.value = formatVariableValue(variable.default);
  newVariableDescription.value = variable.description || "";
}

function deleteVariable(varName: string) {
  const currentVariables = { ...pipelineVariables.value };
  delete currentVariables[varName];
  
  vscode.postMessage({
    command: "bruin.setPipelineDetails",
    payload: { variables: currentVariables },
    source: "variables",
  });
}

function saveVariable() {
  if (!newVariableName.value.trim() || !newVariableDefault.value.trim()) {
    return;
  }

  const currentVariables = { ...pipelineVariables.value };
  const variableName = newVariableName.value.trim();
  
  // Parse the default value based on type
  let parsedDefault: any = newVariableDefault.value.trim();
  try {
    if (newVariableType.value === 'boolean') {
      parsedDefault = newVariableDefault.value.toLowerCase() === 'true';
    } else if (newVariableType.value === 'integer' || newVariableType.value === 'number') {
      parsedDefault = newVariableType.value === 'integer' 
        ? parseInt(newVariableDefault.value) 
        : parseFloat(newVariableDefault.value);
    } else if (newVariableType.value === 'array' || newVariableType.value === 'object') {
      parsedDefault = JSON.parse(newVariableDefault.value);
    }
  } catch (error) {
    console.error('Error parsing default value:', error);
    return;
  }

  const variableConfig: any = {
    type: newVariableType.value,
    default: parsedDefault
  };

  if (newVariableDescription.value.trim()) {
    variableConfig.description = newVariableDescription.value.trim();
  }

  // Add items schema for arrays
  if (newVariableType.value === 'array') {
    variableConfig.items = { type: 'string' }; // Default to string array
  }

  // Add properties schema for objects
  if (newVariableType.value === 'object') {
    variableConfig.properties = {}; // Empty object schema by default
  }

  currentVariables[variableName] = variableConfig;

  vscode.postMessage({
    command: "bruin.setPipelineDetails",
    payload: { variables: currentVariables },
    source: "variables",
  });

  cancelEdit();
}

function cancelEdit() {
  editingVariable.value = null;
  newVariableName.value = "";
  newVariableType.value = "string";
  newVariableDefault.value = "";
  newVariableDescription.value = "";
}

function formatVariableValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function getDefaultPlaceholder(): string {
  switch (newVariableType.value) {
    case 'string':
      return 'e.g., "dev", "production"';
    case 'integer':
      return 'e.g., 42, 100';
    case 'number':
      return 'e.g., 3.14, 2.5';
    case 'boolean':
      return 'e.g., true, false';
    case 'array':
      return 'e.g., ["alice", "bob"], [1, 2, 3]';
    case 'object':
      return 'e.g., {"name": "value", "key": 123}';
    default:
      return 'Enter default value';
  }
}


/**
 * Event listener for message receiving
 */
onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
});

watch(
  [startDate, endDate, selectedEnv],
  ([newStart, newEnd, newEnv]) => {
    vscode.postMessage({
      command: "bruin.updateQueryDates",
      payload: {
        startDate: String(newStart || ''),
        endDate: String(newEnd || ''),
        environment: String(newEnv || ''),
      },
    });
    
    // Also trigger asset metadata fetch with the current values
    vscode.postMessage({
      command: "bruin.getAssetMetadata",
      payload: {
        startDate: String(newStart || ''),
        endDate: String(newEnd || ''),
        environment: String(newEnv || ''),
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
