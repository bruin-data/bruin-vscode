<template>
  <!-- Container -->
  <div class="divide-y overflow-hidden w-full">
    <!-- Header Section -->
    <div class="flex flex-col space-y-3">
      <div class="flex flex-col">
        <!-- Checkbox and Date Controls Row -->
        <div class="flex flex-col xs:flex-row gap-1 w-full justify-between">
          <EnvSelectMenu :options="environments" @selected-env="setSelectedEnv"
            :selectedEnvironment="selectedEnvironment" class="flex-shrink-0" />
          <!-- Date Controls and Checkbox Group -->
          <div id="controls" class="flex flex-col xs:w-1/2">
            <div class="flex flex-col xs:flex-row gap-1 w-full justify-between xs:justify-end">
              <DateInput label="Start Date" v-model="startDateForFullRefresh" :disabled="isFullRefreshChecked" />
              <DateInput label="End Date" v-model="endDate" />
              <div class="flex items-center gap-1 self-start xs:self-end">
                <button type="button" @click="resetDatesOnSchedule" :title="`Reset Start and End Date`"
                  class="rounded-sm bg-editor-button-bg p-1 text-editor-button-fg hover:bg-editor-button-hover-bg disabled:opacity-50 disabled:cursor-not-allowed">
                  <ArrowPathRoundedSquareIcon class="h-3 w-3" aria-hidden="true" />
                </button>
                <div class="relative" id="checkbox-group-chevron">
                  <ChevronUpIcon v-if="showCheckboxGroup" class="h-4 w-4" @click="updateVisibility" />
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
            <div class="flex items-center gap-[1px] relative">
              <label class="text-xs text-editor-fg">Tags</label>
              <vscode-button appearance="icon"
                class="h-3.5 w-auto p-0 opacity-70 hover:opacity-100 inline-flex items-center" id="tag-filter-button"
                title="Edit tag filters" @click="toggleTagFilterOpen">
                <span :class="[
                  'codicon',
                  hasActiveTagFilters ? 'codicon-filter-filled' : 'codicon-filter',
                  'text-[9px]',
                ]"></span>
              </vscode-button>

              <!-- Dropdown -->
              <div v-if="isTagFilterOpen"
                class="absolute top-full left-0 z-[99999] w-[220px] max-w-[90vw] bg-dropdown-bg border border-commandCenter-border shadow-md rounded overflow-hidden tag-filter-dropdown mt-1"
                @mousedown.stop>
                <div class="sticky top-0 bg-dropdown-bg border-b border-commandCenter-border px-2 py-1">
                  <input v-model="tagFilterSearch" placeholder="Search tags..."
                    class="w-full bg-dropdown-bg text-inputValidation-infoBorder text-[11px] border-0 focus:outline-none focus:ring-1 focus:ring-editorLink-activeFg h-6 px-2 rounded"
                    @click.stop @mousedown.stop />
                </div>
                <div class="max-h-48 overflow-y-auto">
                  <div v-for="tag in filteredTags" :key="tag"
                    class="flex items-center justify-between px-2 py-1 text-[11px] hover:bg-list-hoverBackground/60">
                    <span class="font-mono truncate pr-2 opacity-80">{{ tag }}</span>
                    <div class="flex items-center gap-1.5">
                      <button type="button"
                        class="inline-flex items-center justify-center h-3.5 px-1 rounded-sm text-3xs opacity-70 hover:opacity-100"
                        :class="includeTags.includes(tag) ? 'bg-button-bg text-button-fg' : ''" title="Include"
                        @click="toggleTag(tag, 'include')">
                        Inc
                      </button>
                      <button type="button"
                        class="inline-flex items-center justify-center h-3.5 px-1 rounded-sm text-3xs opacity-70 hover:opacity-100"
                        :class="excludeTags.includes(tag) ? 'bg-button-bg text-button-fg' : ''" title="Exclude"
                        @click="toggleTag(tag, 'exclude')">
                        Exc
                      </button>
                    </div>
                  </div>
                  <div v-if="filteredTags.length === 0" class="px-2 py-2 text-2xs opacity-60">
                    No tags found
                  </div>
                </div>
                <div class="flex justify-end gap-2 p-1 border-t border-commandCenter-border">
                  <vscode-button class="text-[10px] h-4 px-2 opacity-80 hover:opacity-100" appearance="secondary"
                    @click="clearAllTagFilters">Clear</vscode-button>
                  <vscode-button class="text-[10px] h-4 px-2 opacity-80 hover:opacity-100"
                    @click="closeTagFilter">Done</vscode-button>
                </div>
              </div>
            </div>
            <div v-if="!isPipelineData" class="flex items-center gap-2">
              <div class="flex items-center gap-[1px]">
                <label class="text-xs text-editor-fg">Variables</label>
                <span v-if="pipelineVariables && Object.keys(pipelineVariables).length > 0"
                  class="text-3xs text-editor-fg opacity-60">
                  ({{ Object.keys(pipelineVariables).length }})
                </span>
                <vscode-button appearance="icon"
                  class="h-3.5 w-auto p-0 opacity-70 hover:opacity-100 inline-flex items-center" id="variables-button"
                  title="Add temporary variable overrides for this run" @click="toggleVariablesOpen">
                  <span class="codicon codicon-settings-gear text-[9px]"></span>
                </vscode-button>
              </div>
              <div class="flex items-center gap-0">
                <vscode-checkbox :checked="applyVariableOverrides"
                  @change="handleApplyOverridesToggle($event.target.checked)" class="text-xs opacity-70 gap-0">
                  Variable overrides
                </vscode-checkbox>
                <span class="text-3xs text-editor-fg opacity-60 -ml-2">
                  ({{ variableOverridesCount }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex flex-col xs:flex-row gap-2 justify-end items-start xs:items-end">
        <div
          class="flex flex-col 2xs:flex-row flex-wrap gap-2 justify-start xs:justify-end items-stretch 2xs:items-center w-full xs:w-auto">
           <!-- Lock Dependencies Button (Python only) -->
           <div v-if="props.assetType === 'python' || props.filePath?.endsWith('requirements.txt')" class="inline-flex">
             <vscode-button @click="lockPythonDependencies" :disabled="lockDependenciesStatus === 'loading'"
               class="text-xs h-7" title="Lock Python dependencies in requirements.txt">
               <div class="flex items-center justify-center">
                 <template v-if="lockDependenciesStatus === 'success'">
                   <CheckCircleIcon class="h-4 w-4 mr-1 text-editor-button-fg" aria-hidden="true" />
                 </template>
                 <template v-else-if="lockDependenciesStatus === 'error'">
                   <XCircleIcon class="h-4 w-4 mr-1 text-editorError-foreground" aria-hidden="true" />
                 </template>
                 <template v-else-if="lockDependenciesStatus === 'loading'">
                   <svg class="animate-spin mr-1 h-4 w-4 text-editor-bg" xmlns="http://www.w3.org/2000/svg" fill="none"
                     viewBox="0 0 24 24">
                     <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                     <path class="opacity-75" fill="currentColor"
                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                     </path>
                   </svg>
                 </template>
                 <template v-else>
                   <span class="codicon codicon-lock-small mr-1" aria-hidden="true"></span>
                 </template>
                 <span>Lock requirements</span>
               </div>
             </vscode-button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton :disabled="lockDependenciesStatus === 'loading'"
                class="relative h-7 border border-transparent inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-editor-button-bg px-1 text-editor-button-fg hover:bg-editor-button-hover-bg focus:z-10">
                <ChevronDownIcon class="h-3 w-3" aria-hidden="true" />
              </MenuButton>
              <transition enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95">
                <MenuItems class="absolute right-0 z-[99999] w-48 origin-top-right">
                  <div class="p-1 bg-editorWidget-bg rounded-sm border border-commandCenter-border">
                    <MenuItem key="specific-version">
                    <vscode-button
                      class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg whitespace-nowrap"
                      @click="showPythonVersionInput = true">
                      Specify Python Version...
                    </vscode-button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>
          <!-- Validate Button Group -->
          <div class="inline-flex">
            <vscode-button @click="handleBruinValidateCurrentAsset" :disabled="isNotAsset" class="text-xs h-7">
              <div class="flex items-center justify-center">
                <template v-if="validateButtonStatus === 'validated'">
                  <CheckCircleIcon class="h-4 w-4 mr-1 text-editor-button-fg" aria-hidden="true" />
                </template>
                <template v-else-if="validateButtonStatus === 'failed'">
                  <XCircleIcon class="h-4 w-4 mr-1 text-editorError-foreground" aria-hidden="true" />
                </template>
                <template v-else-if="validateButtonStatus === 'loading'">
                  <svg class="animate-spin mr-1 h-4 w-4 text-editor-bg" xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                    </path>
                  </svg>
                </template>
                <template v-else>
                  <SparklesIcon class="h-4 w-4 mr-1"></SparklesIcon>
                </template>
                <span>Validate</span>
              </div>
            </vscode-button>
            <Menu as="div" class="relative -ml-px block">
              <MenuButton :disabled="isNotAsset"
                class="relative h-7 border border-transparent inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed bg-editor-button-bg px-1 text-editor-button-fg hover:bg-editor-button-hover-bg focus:z-10">
                <ChevronDownIcon class="h-3 w-3" aria-hidden="true" />
              </MenuButton>
              <!-- Dropdown Menu for Validate -->
              <transition enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95">
                <MenuItems
                  class="absolute left-0 xs:right-0 xs:left-auto z-[99999] w-40 xs:w-48 origin-top-left xs:origin-top-right max-w-[calc(100vw-2rem)]">
                  <div class="p-1 bg-editorWidget-bg rounded-sm border border-commandCenter-border">
                    <MenuItem key="validate-current">
                    <vscode-button
                      class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                      @click="handleBruinValidateCurrentPipeline">
                      Validate current pipeline
                    </vscode-button>
                    </MenuItem>
                    <MenuItem key="validate-all">
                    <vscode-button
                      class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                      @click="handleBruinValidateAllPipelines">
                      Validate all pipelines
                    </vscode-button>
                    </MenuItem>
                    <div class="border-t border-commandCenter-border my-1"></div>
                    <MenuItem key="format-current">
                    <vscode-button
                      class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                      @click="formatAsset">
                      Format current asset
                    </vscode-button>
                    </MenuItem>
                    <MenuItem key="format-all">
                    <vscode-button
                      class="block text-editor-fg rounded-sm w-full border-0 text-left text-2xs hover:bg-editor-button-hover-bg hover:text-editor-button-fg bg-editorWidget-bg"
                      @click="formatAllAssets">
                      Format all assets
                    </vscode-button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </transition>
            </Menu>
          </div>

          <!-- Run Button Group -->
          <ButtonGroup :label="runButtonLabel" :icon="PlayIcon" icon-class="h-3 w-3 mr-1" :disabled="isNotAsset"
            :dropdown-items="runDropdownItems"
            @main-click="runAssetOnly"
            @dropdown-click="handleRunDropdown" />


        </div>
      </div>

      <!-- Python version input (below buttons) -->
      <div v-if="showPythonVersionInput && props.assetType === 'python'"
        class="flex items-center justify-end space-x-1">
        <input v-model="pythonVersion" type="text" placeholder="3.11"
          class="border rounded-sm text-sm w-20 h-6 bg-input-background text-input-foreground px-2" />
        <vscode-button @click="lockPythonDependencies(); showPythonVersionInput = false" appearance="icon"
          class="text-xs bg-input-background text-input-foreground"><span class="codicon codicon-check"></span></vscode-button>
        <vscode-button @click="showPythonVersionInput = false; pythonVersion = '3.11'" appearance="icon"
          class="text-xs bg-input-background text-input-foreground"><span class="codicon codicon-x"></span></vscode-button>
      </div>
      <!-- Lock error message -->
      <SimpleErrorAlert :errorMessage="lockDependenciesMessage" errorPhase="Lock Dependencies"
        @error-close="lockDependenciesStatus = null; lockDependenciesMessage = null"
        v-if="lockDependenciesMessage && lockDependenciesStatus === 'error'" />

      <SelectMultipleAssets :isOpen="showSelectMultipleAssetsDialog" :assets="pipelineAssets"
        :loading="loadingPipelineAssets" :initialSelected="selectedAssetsForRun"
        :fullRefreshEnabled="isFullRefreshChecked" @close="showSelectMultipleAssetsDialog = false"
        @run="handleRunMultipleAssets" />

      <!-- Selected assets summary (clickable to open panel) -->
      <div v-if="selectedAssetsForRun.length > 0 && !showSelectMultipleAssetsDialog"
        class="mt-2 flex items-center gap-1.5 text-xs min-w-0">
        <button @click="openMultipleAssetsPanel"
          class="flex-1 flex items-center gap-1.5 text-left hover:bg-list-hoverBackground rounded px-1 py-0.5 -mx-1 min-w-0 overflow-hidden"
          title="Click to edit selection">
          <span class="text-editor-fg text-2xs opacity-60 flex-shrink-0">Selected:</span>
          <span class="flex items-center gap-2 min-w-0 overflow-hidden">
            <span v-for="(name, index) in selectedAssetsDisplay.names" :key="name"
              class="inline-block px-1.5 py-0.5 bg-badge-bg text-badge-fg text-2xs rounded font-mono truncate max-w-28"
              :title="name">{{ name }}</span>
            <span v-if="selectedAssetsDisplay.remaining > 0"
              class="text-2xs text-editor-fg opacity-60 flex-shrink-0">+{{
                selectedAssetsDisplay.remaining }} more</span>
          </span>
          <span v-if="isFullRefreshChecked" class="text-2xs text-editor-fg opacity-50 flex-shrink-0 ml-1">
            (full refresh)
          </span>
        </button>
        <button @click="clearSelectedAssets" class="text-editor-fg opacity-50 hover:opacity-100 flex-shrink-0"
          title="Clear selection">
          <span class="codicon codicon-close text-xs"></span>
        </button>
      </div>

      <!-- Alerts and Code Display Section -->
      <ErrorAlert v-if="hasCriticalErrors" :errorMessage="errorMessage!" class="mb-4" :errorPhase="errorPhase"
        @errorClose="handleErrorClose" />
      <WarningAlert v-if="hasWarnings" :warnings="warningMessages" @warningClose="handleWarningClose" />

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
            <tr v-if="
              pipelineInfo.default_connections &&
              Object.keys(pipelineInfo.default_connections).length > 0
            ">
              <td class="py-0.5 pr-3 text-editor-fg opacity-60 w-32 whitespace-nowrap align-top">
                Default Connection
              </td>
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
        <div v-else-if="code && !renderSQLAssetError" class="mt-1">
          <!-- SqlEditor handles both success and error cost display in its header -->
          <SqlEditor :code="code" :copied="false" :language="language" :showIntervalAlert="showIntervalAlert"
            :assetType="props.assetType" :bigqueryMetadata="bigqueryMetadata"
            :bigqueryError="props.assetMetadataError" />
          <div class="overflow-hidden w-full h-20"></div>
        </div>
        <div v-else class="overflow-hidden w-full h-40">
          <pre class="white-space"></pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Full Refresh Confirmation Dialog -->
  <AlertWithActions v-if="showFullRefreshAlert" message="Do you want to run with full refresh? This may drop the table"
    confirm-text="Continue" @confirm="confirmFullRefresh" @cancel="cancelFullRefresh" />

  <AssetVariablesPanel v-if="!isPipelineData" :is-open="isVariablesOpen" :variables="pipelineVariables"
    trigger-element-id="variables-button" :initial-overrides="currentVariableOverrides"
    :initial-apply-overrides="applyVariableOverrides" @close="closeVariablesPanel"
    @render-with-overrides="handleRenderWithOverrides" @save-overrides="handleSaveOverrides"
    @apply-overrides-toggle="handleApplyOverridesToggle" />
</template>
<script setup lang="ts">
import { vscode } from "@/utilities/vscode";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ErrorAlert from "@/components/ui/alerts/ErrorAlert.vue";
import WarningAlert from "@/components/ui/alerts/WarningAlert.vue";
import AlertWithActions from "@/components/ui/alerts/AlertWithActions.vue";
import SimpleErrorAlert from "@/components/ui/alerts/SimpleErrorAlert.vue";
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
import AssetVariablesPanel from "@/components/ui/variables-panel/AssetVariablesPanel.vue";
import ButtonGroup from "@/components/ui/buttons/ButtonGroup.vue";
import { updateValue, resetStates, determineValidationStatus } from "@/utilities/helper";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import SelectMultipleAssets from "@/components/ui/asset/SelectMultipleAssets.vue";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/vue/24/solid";
import { SparklesIcon, PlayIcon, ArrowPathRoundedSquareIcon, LockClosedIcon } from "@heroicons/vue/24/outline";
import type { FormattedErrorMessage } from "@/types";
import { Transition } from "vue";
import RudderStackService from "@/services/RudderStackService";
import { useConnectionsStore, usePipelineRunStore } from "@/store/bruinStore";

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
  pipelineAssets: any[];
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
const lockDependenciesStatus = ref<"success" | "error" | "loading" | null>(null);
const lockDependenciesMessage = ref<string | null>(null);
const showPythonVersionInput = ref(false);
const pythonVersion = ref("3.11");
const showWarnings = ref(true);
const errorState = computed(() => handleError(validationError.value, renderSQLAssetError.value));
const isError = computed(() => errorState.value?.errorCaptured);
const errorMessage = computed(() => errorState.value?.errorMessage);
const toggled = ref(false);
const rudderStack = RudderStackService.getInstance();
const showIntervalAlert = ref(false);
const dismissedIntervalAlert = ref(false);
const variableOverridesCount = ref(0);
const pipelineRunStore = usePipelineRunStore();
const showSelectMultipleAssetsDialog = computed({
  get: () => pipelineRunStore.showDialog,
  set: (val) => pipelineRunStore.setShowDialog(val),
});
const loadingPipelineAssets = ref(false);
const pipelineAssets = computed(() => props.pipelineAssets || []);
const selectedAssetsForRun = computed({
  get: () => pipelineRunStore.selectedAssets,
  set: (val) => pipelineRunStore.setSelectedAssets(val),
});
const currentPipelineName = ref<string | null>(null);

// Dynamic run button label based on selected assets
const runButtonLabel = computed(() => {
  const count = selectedAssetsForRun.value.length;
  return count > 0 ? `Run (${count})` : 'Run';
});

const runDropdownItems = computed(() => [
  { key: 'run-with-downstream', label: 'Run with downstream', disabled: isPipelineFile.value },
  { key: 'run-current-pipeline', label: 'Run the whole pipeline' },
  { key: 'run-with-continue', label: 'Continue from last failure' },
  { key: 'run-multiple-assets', label: 'Run multiple assets' },
  { key: 'copy-command', label: 'Copy command' },
]);

// Display selected assets - first 2 names + "and X more"
const selectedAssetsDisplay = computed(() => {
  const assets = selectedAssetsForRun.value;
  const maxDisplay = 2;

  if (assets.length === 0) return { names: [], remaining: 0 };

  const displayedNames = assets.slice(0, maxDisplay).map(a => a.name);
  const remaining = Math.max(0, assets.length - maxDisplay);

  return { names: displayedNames, remaining };
});

const isPipelineStartDateAvailable = computed(() => {
  const startDate = props.startDate;
  return startDate !== undefined && startDate !== null && startDate !== "";
});

// Full refresh alert state
const showFullRefreshAlert = ref(false);
const pendingRunAction = ref<(() => void) | null>(null);

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

const formatAllAssets = () => {
  vscode.postMessage({
    command: "bruin.formatAllAssets",
  });
};

const lockPythonDependencies = () => {
  lockDependenciesStatus.value = "loading";
  lockDependenciesMessage.value = null;
  vscode.postMessage({
    command: "bruin.lockPythonDependencies",
    payload: { pythonVersion: pythonVersion.value },
    source: "AssetGeneral_lockPythonDependencies",
  });
};

const handleRunDropdown = (key: string) => {
  switch (key) {
    case "run-with-downstream":
      runAssetWithDownstream();
      break;
    case "run-current-pipeline":
      runCurrentPipeline();
      break;
    case "run-with-continue":
      runPipelineWithContinue();
      break;
    case "run-multiple-assets":
      runMultipleAssets();
      break;
    case "copy-command":
      copyRunCommand();
      break;
  }
};

const copyRunCommand = async () => {
  const baseFlags = getCheckboxChangePayload();
  const flags = isPipelineData.value
    ? buildCommandPayload(baseFlags)
    : buildCommandPayload(stripAllTagFlags(baseFlags));

  const assetPath = props.filePath || "";
  const escapedPath = assetPath.includes(' ') ? `"${assetPath}"` : assetPath;
  const command = `bruin run${flags ? " " + flags.trim() : ""} ${escapedPath}`.trim();

  try {
    await navigator.clipboard.writeText(command);
    vscode.postMessage({
      command: "showInfoMessage",
      payload: "Command copied to clipboard",
    });
  } catch (err) {
    vscode.postMessage({
      command: "showErrorMessage",
      payload: "Failed to copy command to clipboard",
    });
  }
};

const runMultipleAssets = () => {
  showSelectMultipleAssetsDialog.value = true;
  // Request fresh pipeline assets when dialog opens
  vscode.postMessage({ command: "bruin.getPipelineAssets" });
};

interface AssetWithSettings {
  name: string;
  definition_file?: { path: string };
  fullRefresh: boolean;
}

// Open multiple assets panel (for editing existing selection)
const openMultipleAssetsPanel = () => {
  showSelectMultipleAssetsDialog.value = true;
  vscode.postMessage({ command: "bruin.getPipelineAssets" });
};

// Handle run from multi-select dialog - run immediately with per-asset settings
const handleRunMultipleAssets = (assets: AssetWithSettings[]) => {
  showSelectMultipleAssetsDialog.value = false;

  if (assets.length === 0) return;

  // Store selection for display
  selectedAssetsForRun.value = assets;

  // Check if full-refresh is enabled from the main checkbox
  const isFullRefresh = isFullRefreshChecked.value;

  // Build base flags without full refresh (we'll add it if needed)
  const baseFlags = stripFullRefreshFlag(stripAllTagFlags(getCheckboxChangePayload()));

  const executeRun = () => {
    const assetPaths = assets
      .map((a) => a.definition_file?.path)
      .filter((p): p is string => !!p);

    if (assetPaths.length === 0) return;

    // Build base payload first
    const basePayload = buildCommandPayload(baseFlags);

    // Add --full-refresh flag if enabled (applies to all selected assets)
    const flags = isFullRefresh ? basePayload + " --full-refresh" : basePayload;

    vscode.postMessage({
      command: "bruin.runMultipleAssets",
      payload: {
        assets: assetPaths,
        flags: flags,
      },
    });
  };

  // Show confirmation if full-refresh is enabled
  if (isFullRefresh) {
    showFullRefreshConfirmation(executeRun);
  } else {
    executeRun();
  }
};

// Clear selected assets
const clearSelectedAssets = () => {
  selectedAssetsForRun.value = [];
};

// Run selected assets (called from main Run button when assets are selected)
const runSelectedAssets = () => {
  if (selectedAssetsForRun.value.length === 0) return;

  // Use the stored per-asset settings
  handleRunMultipleAssets(selectedAssetsForRun.value);
};

// Helper to strip --full-refresh from flags
const stripFullRefreshFlag = (flags: string): string => {
  return flags.replace(/--full-refresh\s*/g, '').trim();
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
const isPipelineFile = computed(() => {
  if (props.filePath) {
    console.log("isPipelineFile", props.filePath);
    return props.filePath.endsWith("pipeline.yml") || props.filePath.endsWith("pipeline.yaml");
  }
  return false;
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
  console.log("Pipeline info:", props.pipeline, props.pipeline?.raw);
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
      } catch { }
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

const checkboxItems = ref([
  { name: "Full-Refresh", checked: false },
  { name: "Interval-modifiers", checked: false },
  { name: "Exclusive-End-Date", checked: true },
  { name: "Push-Metadata", checked: false },
  { name: "Apply-Sensor-Mode", checked: false },
]);

// Sensor mode setting from VS Code configuration
const sensorModeSetting = ref<string>("skip");

// Tag filter state
const includeTags = ref<string[]>([]);
const excludeTags = ref<string[]>([]);
const availableTags = computed(() => {
  if (isPipelineData.value && pipelineInfo.value?.assets) {
    // For pipeline files: aggregate all tags from all assets
    const allTags = new Set<string>();
    pipelineInfo.value.assets.forEach(asset => {
      if (asset.tags && Array.isArray(asset.tags)) {
        asset.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  }

  // For individual assets: use current asset tags
  return Array.isArray(props.tags) ? props.tags : [];
});
const isTagFilterOpen = ref(false);
const tagFilterContainer = ref<HTMLElement | null>(null);
const tagFilterSearch = ref("");
const hasActiveTagFilters = computed(
  () => includeTags.value.length > 0 || excludeTags.value.length > 0
);

const isVariablesOpen = ref(false);
const currentVariableOverrides = ref<Record<string, any>>({});
const applyVariableOverrides = ref(false);
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


onMounted(() => {
  window.addEventListener("click", onWindowClick, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", onWindowClick, true);
});

function clearAllTagFilters() {
  includeTags.value = [];
  excludeTags.value = [];
}

const showCheckboxGroup = ref(false);

function updateVisibility() {
  showCheckboxGroup.value = !showCheckboxGroup.value;
}

const selectedEnv = ref<string>("");
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
const startDateForFullRefresh = computed({
  get() {
    return isFullRefreshChecked.value && isPipelineStartDateAvailable.value
      ? props.startDate
      : startDate.value;
  },
  set(newValue: string) {
    startDate.value = newValue;
  },
});

function getCheckboxChangePayload() {
  const effectiveStartDate =
    isFullRefreshChecked.value && isPipelineStartDateAvailable.value ? props.startDate : startDate.value;

  let baseFlags = concatCommandFlags(
    effectiveStartDate,
    endDate.value,
    endDateExclusive.value,
    checkboxItems.value,
    {
      include: includeTags.value,
      exclude: excludeTags.value,
    },
    sensorModeSetting.value
  );

  if (
    applyVariableOverrides.value &&
    currentVariableOverrides.value &&
    Object.keys(currentVariableOverrides.value).length > 0
  ) {
    const availableVariables = Object.keys(pipelineVariables.value || {});
    const validOverrides = Object.entries(currentVariableOverrides.value)
      .filter(([key]) => availableVariables.includes(key))
      .map(([key, value]) => {
        if (value === null || value === undefined) return "";
        let formattedValue;
        if (typeof value === "object") {
          formattedValue = JSON.stringify(value);
        } else if (typeof value === "string") {
          formattedValue = `"${value}"`;
        } else {
          formattedValue = String(value);
        }
        return `--var ${key}='${formattedValue}'`;
      })
      .filter((flag) => flag !== "");
    variableOverridesCount.value = validOverrides.length;
    if (validOverrides.length > 0) {
      const overrideFlags = validOverrides.join(" ");
      baseFlags = baseFlags ? `${baseFlags} ${overrideFlags}` : overrideFlags;
    }
  }

  return baseFlags;
}

const language = ref("");
const code = ref(null);
onMounted(() => {
  if (props.selectedEnvironment) {
    selectedEnv.value = props.selectedEnvironment;
  }
  const persistedState = vscode.getState() as {
    checkboxState?: { [key: string]: boolean };
    startDate?: string;
    endDate?: string;
    // Legacy fields (kept for backwards compatibility)
    includeTags?: string[];
    excludeTags?: string[];
    tagsFilePath?: string;
    // Per-pipeline tag filters
    tagFiltersByPipeline?: Record<string, { includeTags: string[]; excludeTags: string[] }>;
    variableOverrides?: Record<string, any>;
    applyVariableOverrides?: boolean;
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
  if (persistedState?.variableOverrides) {
    currentVariableOverrides.value = { ...persistedState.variableOverrides };
  }
  if (persistedState?.applyVariableOverrides !== undefined) {
    applyVariableOverrides.value = persistedState.applyVariableOverrides;
  }
  // Restore tags for the current pipeline (only if we have a valid file path)
  try {
    const currentFilePath = props.filePath;
    if (currentFilePath && persistedState?.tagFiltersByPipeline?.[currentFilePath]) {
      const pipelineTags = persistedState.tagFiltersByPipeline[currentFilePath];
      if (Array.isArray(pipelineTags.includeTags)) {
        includeTags.value = [...pipelineTags.includeTags];
      }
      if (Array.isArray(pipelineTags.excludeTags)) {
        excludeTags.value = [...pipelineTags.excludeTags];
      }
    }
  } catch (_) { }

  sendInitialMessage();
  window.addEventListener("message", receiveMessage);
  sendInitialMessage();
});

watch(
  () => props.selectedEnvironment,
  (newValue) => {
    selectedEnv.value = newValue;
  }
);

watch(
  [
    checkboxItems,
    startDate,
    endDate,
    endDateExclusive,
    includeTags,
    excludeTags,
    currentVariableOverrides,
    applyVariableOverrides,
  ],
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
      const currentFilePath = props.filePath;

      // Build state update
      const stateUpdate: Record<string, any> = {
        ...prevState,
        checkboxState,
        startDate: startDate.value,
        endDate: endDate.value,
        variableOverrides: currentVariableOverrides.value,
        applyVariableOverrides: applyVariableOverrides.value,
      };

      // Only persist tag filters if we have a valid file path
      if (currentFilePath) {
        const existingTagFilters = prevState.tagFiltersByPipeline || {};
        stateUpdate.tagFiltersByPipeline = {
          ...existingTagFilters,
          [currentFilePath]: {
            includeTags: [...includeTags.value],
            excludeTags: [...excludeTags.value],
          },
        };
      }

      vscode.setState(stateUpdate);
    } catch (_) { }
  },
  { deep: true }
);

watch(
  () => pipelineVariables.value,
  (newVariables, oldVariables) => {
    if (
      applyVariableOverrides.value &&
      currentVariableOverrides.value &&
      Object.keys(currentVariableOverrides.value).length > 0
    ) {
      const oldKeys = Object.keys(oldVariables || {}).sort();
      const newKeys = Object.keys(newVariables || {}).sort();

      if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
        const currentFlags = getCheckboxChangePayload();
        vscode.postMessage({
          command: "checkboxChange",
          payload: {
            flags: currentFlags,
            checkboxState: checkboxItems.value.reduce(
              (acc, item) => {
                acc[String(item.name)] = Boolean(item.checked);
                return acc;
              },
              {} as Record<string, boolean>
            ),
            tagFilters: {
              include: [...includeTags.value].map((tag) => String(tag)),
              exclude: [...excludeTags.value].map((tag) => String(tag)),
            },
          },
        });
      }
    }
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

function stripIncludeTagFlags(flags: string) {
  try {
    return flags.replace(/\s--tag\s+[^\s]+/g, "");
  } catch (_) {
    return flags;
  }
}

function stripExcludeTagFlags(flags: string) {
  try {
    return flags.replace(/\s--exclude-tag\s+[^\s]+/g, "");
  } catch (_) {
    return flags;
  }
}

function stripAllTagFlags(flags: string) {
  try {
    return flags
      .replace(/\s--tag\s+[^\s]+/g, "")
      .replace(/\s--exclude-tag\s+[^\s]+/g, "");
  } catch (_) {
    return flags;
  }
}

function runAssetOnly() {
  // If multiple assets are selected, run those instead
  if (selectedAssetsForRun.value.length > 0) {
    runSelectedAssets();
    return;
  }

  const fullRefreshChecked = checkboxItems.value.find(
    (item) => item.name === "Full-Refresh"
  )?.checked;

  // Helper to conditionally strip tags based on file type
  const getRunPayload = () => {
    const baseFlags = getCheckboxChangePayload();
    if (isPipelineData.value) {
      return baseFlags;
    } else {
      return stripAllTagFlags(baseFlags);
    }
  };

  if (fullRefreshChecked) {
    showFullRefreshConfirmation(() => {
      const payload = buildCommandPayload(getRunPayload());
      vscode.postMessage({
        command: "bruin.runSql",
        payload,
      });
    });
    return;
  }

  const payload = buildCommandPayload(getRunPayload());

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

function resetDatesOnSchedule() {
  resetStartEndDate(props.schedule, today.getTime(), startDate, endDate);
}

function handleIngestrSave(parameters) {
  vscode.postMessage({
    command: "bruin.setAssetDetails",
    payload: {
      parameters: parameters,
    },
    source: "AssetGeneral_ingestrSave",
  });
}

function toggleVariablesOpen() {
  isVariablesOpen.value = !isVariablesOpen.value;
}

function closeVariablesPanel() {
  isVariablesOpen.value = false;
}

function handleRenderWithOverrides(overrides: Record<string, any>) {
  currentVariableOverrides.value = { ...overrides };
}

function handleSaveOverrides(overrides: Record<string, any>, applyOverrides: boolean) {
  currentVariableOverrides.value = { ...overrides };
  applyVariableOverrides.value = applyOverrides;

  const prevState = (vscode.getState() as Record<string, any>) || {};
  vscode.setState({
    ...prevState,
    variableOverrides: { ...overrides },
    applyVariableOverrides: applyOverrides,
  });
}

function handleApplyOverridesToggle(applyOverrides: boolean) {
  applyVariableOverrides.value = applyOverrides;

  const prevState = (vscode.getState() as Record<string, any>) || {};
  vscode.setState({
    ...prevState,
    applyVariableOverrides: applyOverrides,
  });
}

function handleSaveVariable(event: { name: string; config: any; oldName?: string }) {
  const { name, config, oldName } = event;

  const currentVariables = JSON.parse(JSON.stringify(pipelineVariables.value || {}));
  if (oldName && oldName !== name) {
    delete currentVariables[oldName];
  }

  currentVariables[name] = config;

  try {
    const formattedVariables = formatVariablesForPayload(currentVariables);
    const payload = { variables: formattedVariables };
    const payloadStr = JSON.stringify(payload);
    const safePayload = JSON.parse(payloadStr);

    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: safePayload,
      source: "variables-save",
    });
  } catch (error) {
    console.error("Error serializing variables data:", error);
    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: { variables: {} },
      source: "variables-save",
    });
  }
}

function deleteVariable(varName: string) {
  const currentVariables = JSON.parse(JSON.stringify(pipelineVariables.value || {}));
  delete currentVariables[varName];

  try {
    const formattedVariables = formatVariablesForPayload(currentVariables);
    const payload = { variables: formattedVariables };
    const payloadStr = JSON.stringify(payload);
    const safePayload = JSON.parse(payloadStr);

    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: safePayload,
      source: "variables-delete",
    });
  } catch (error) {
    console.error("Error serializing variables data:", error);
    vscode.postMessage({
      command: "bruin.setPipelineDetails",
      payload: { variables: {} },
      source: "variables-delete",
    });
  }
}

function formatVariablesForPayload(variables: any) {
  const formattedVariables: any = {};

  Object.keys(variables).forEach((varName) => {
    const variable = variables[varName];
    const safeVariable: any = {
      type: String(variable.type || "string"),
      default: variable.default !== undefined ? variable.default : null,
    };

    if (variable.description) {
      safeVariable.description = String(variable.description);
    }
    if (variable.items) {
      safeVariable.items = variable.items;
    }
    if (variable.properties) {
      safeVariable.properties = variable.properties;
    }

    try {
      JSON.stringify(safeVariable);
      formattedVariables[varName] = safeVariable;
    } catch (error) {
      console.error(`Error serializing variable ${varName}:`, error);
      formattedVariables[varName] = {
        type: "string",
        default: null,
      };
    }
  });

  return formattedVariables;
}

onBeforeUnmount(() => {
  window.removeEventListener("message", receiveMessage);
  if (requestTimeout) {
    clearTimeout(requestTimeout);
    requestTimeout = null;
  }
});

watch(
  [startDate, endDate, selectedEnv, isFullRefreshChecked, () => props.startDate],
  ([newStart, newEnd, newEnv]) => {
    const effectiveStartDate = isFullRefreshChecked.value && isPipelineStartDateAvailable.value
      ? props.startDate
      : newStart;

    vscode.postMessage({
      command: "bruin.updateQueryDates",
      payload: {
        startDate: String(effectiveStartDate || ""),
        endDate: String(newEnd || ""),
        environment: String(newEnv || ""),
      },
    });

    vscode.postMessage({
      command: "bruin.getAssetMetadata",
      payload: {
        startDate: String(effectiveStartDate || ""),
        endDate: String(newEnd || ""),
        environment: String(newEnv || ""),
      },
    });
  },
  { immediate: true }
);

// Reset selected assets only when pipeline changes (not when switching files in same pipeline)
watch(
  () => props.pipeline?.name,
  (newPipelineName, oldPipelineName) => {
    if (newPipelineName !== oldPipelineName && oldPipelineName !== undefined) {
      selectedAssetsForRun.value = [];
      showSelectMultipleAssetsDialog.value = false;
    }
    currentPipelineName.value = newPipelineName || null;
  }
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
        } catch (_) { }

        // Store sensor mode setting from extension
        if (envelope.sensorModeSetting) {
          sensorModeSetting.value = envelope.sensorModeSetting;
        }

        // Sync persisted state with values coming from the extension side
        try {
          const prevState = (vscode.getState() as Record<string, any>) || {};
          vscode.setState({
            ...prevState,
            checkboxState: envelope.payload,
            sensorModeSetting: sensorModeSetting.value,
          });
        } catch (_) { }
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
    case "format-message":
      const formatSuccess = updateValue(envelope, "success");
      const formatError = updateValue(envelope, "error");
      console.log("formatSuccess", formatSuccess);
      console.log("formatError", formatError);

      // Show simple toast notifications
      if (formatSuccess) {
        vscode.postMessage({
          command: "showInfoMessage",
          payload: formatSuccess,
        });
      }
      if (formatError) {
        vscode.postMessage({
          command: "showErrorMessage",
          payload: formatError,
        });
      }
      break;

    case "lock-python-dependencies-message":
      if (envelope.payload.status === "loading") {
        lockDependenciesStatus.value = "loading";
        lockDependenciesMessage.value = envelope.payload.message;
      } else if (envelope.payload.status === "success") {
        lockDependenciesStatus.value = "success";
        lockDependenciesMessage.value = envelope.payload.message;
        // Clear success status after 2 seconds (similar to typical button feedback)
        setTimeout(() => {
          lockDependenciesStatus.value = null;
          lockDependenciesMessage.value = null;
        }, 2000);
      } else if (envelope.payload.status === "error") {
        lockDependenciesStatus.value = "error";
        lockDependenciesMessage.value = envelope.payload.message;
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

<style>
vscode-checkbox::part(label) {
  @apply ps-1;
}
</style>
