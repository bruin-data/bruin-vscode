<template>
  <!-- Main container for the error alert -->
  <div
    v-if="processedErrors.length"
    class="rounded-md bg-rose-50 p-3 my-2 transition-all duration-300"
    :class="{ 'h-12 overflow-hidden': !isExpanded }"
  >
    <!-- Header section with error icon, title, and control buttons -->
    <div class="flex justify-between items-center">
      <div class="flex items-center flex-grow">
        <XCircleIcon class="h-4 w-4 text-rose-400 mr-2" aria-hidden="true" />
        <h3 class="text-sm font-medium text-rose-700">{{ errorPhase }} Error</h3>
      </div>
      <div class="flex items-center">
        <!-- Toggle button for expanding/collapsing the error details -->
        <button v-if="errorPhase !== 'Rendering'" @click="isExpanded = !isExpanded" class="text-rose-400 hover:text-rose-500 mr-1">
          <component
            :is="isExpanded ? ChevronUpIcon : ChevronDownIcon"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
        <!-- Button to close the error alert -->
        <button @click="$emit('errorClose')" class="text-rose-400 hover:text-rose-500">
          <XMarkIcon class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
    <!-- Expanded section to display detailed error messages -->
    <div v-if="isExpanded && errorPhase !== 'Rendering'" class="overflow-y-auto" style="max-height: 250px">
      <template v-for="(errorMessage, index) in processedErrors" :key="index">
        <!-- Single Asset Validation Display -->
        <div v-if="isSingleAsset" class="mt-2">
          <h4 class="text-xs font-medium text-gray-600">Asset: {{ singleAssetName }}</h4>
          <div
            v-for="(issue, issueIndex) in errorMessage.issues"
            :key="issueIndex"
            class="mb-1 ml-2"
          >
            <p class="text-xs text-rose-600">{{ issue.description }}</p>
            <div v-if="issue.context.length" class="flex items-center space-x-1 mt-1 justify-end">
              <!-- Button to toggle the expansion of issue details -->
              <button
                @click="toggleIssueExpansion(index, issueIndex)"
                class="text-xs text-rose-500 hover:text-rose-600 flex items-center"
              >
                <span class="mr-1">Details</span>
                <component
                  :is="issue.expanded ? ChevronUpIcon : ChevronDownIcon"
                  class="h-3 w-3"
                  aria-hidden="true"
                />
              </button>
            </div>
            <div v-if="issue.expanded" class="text-xs text-gray-600 ml-1 mt-1 w-full">
              <pre class="whitespace-pre-wrap bg-rose-100 rounded p-2">{{
                issue.context.join("\n")
              }}</pre>
            </div>
          </div>
        </div>

        <!-- Full Pipeline Validation Display -->
        <div v-else>
          <!-- Single Pipeline: No collapse functionality -->
          <div v-if="processedErrors.length === 1" class="mt-2">
            <h4 class="text-xs font-medium text-rose-600">Pipeline: {{ errorMessage.pipeline }}</h4>
            <div class="mt-1">
              <div v-for="(issue, issueIndex) in errorMessage.issues" :key="issueIndex" class="mb-1">
                <h4 v-if="issue.asset" class="text-xs font-medium text-gray-600">
                  Asset: {{ issue.asset }}
                </h4>
                <p class="text-xs text-rose-600">{{ issue.description }}</p>
                <div v-if="issue.context.length" class="flex items-center space-x-1 mt-1 justify-end">
                  <button
                    @click="toggleIssueExpansion(index, issueIndex)"
                    class="text-xs text-rose-500 hover:text-rose-600 flex items-center"
                  >
                    <span class="mr-1">Details</span>
                    <component
                      :is="issue.expanded ? ChevronUpIcon : ChevronDownIcon"
                      class="h-3 w-3"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div v-if="issue.expanded" class="text-xs text-gray-600 ml-1 mt-1 w-full">
                  <pre class="whitespace-pre-wrap bg-rose-100 rounded p-2">{{
                    issue.context.join("\n")
                  }}</pre>
                </div>
              </div>
            </div>
          </div>
          <!-- Multiple Pipelines: Show with collapse functionality -->
          <div v-else>
            <div @click="toggleExpansion(index)" class="flex items-center cursor-pointer mt-2">
              <component
                :is="errorMessage.expanded ? ChevronDownIcon : ChevronRightIcon"
                class="h-4 w-4 text-rose-400"
                aria-hidden="true"
              />
              <span class="ml-1 text-xs text-rose-600">Pipeline: {{ errorMessage.pipeline }}</span>
            </div>
            <div v-if="errorMessage.expanded" class="ml-4 mt-1">
              <div v-for="(issue, issueIndex) in errorMessage.issues" :key="issueIndex" class="mb-1">
                <h4 v-if="issue.asset" class="text-xs font-medium text-gray-600">
                  Asset: {{ issue.asset }}
                </h4>
                <p class="text-xs text-rose-600">{{ issue.description }}</p>
                <div v-if="issue.context.length" class="flex items-center space-x-1 mt-1 justify-end">
                  <button
                    @click="toggleIssueExpansion(index, issueIndex)"
                    class="text-xs text-rose-500 hover:text-rose-600 flex items-center"
                  >
                    <span class="mr-1">Details</span>
                    <component
                      :is="issue.expanded ? ChevronUpIcon : ChevronDownIcon"
                      class="h-3 w-3"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div v-if="issue.expanded" class="text-xs text-gray-600 ml-1 mt-1 w-full">
                  <pre class="whitespace-pre-wrap bg-rose-100 rounded p-2">{{
                    issue.context.join("\n")
                  }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <!-- Display only the error message for Rendering phase -->
    <div v-if="errorPhase === 'Rendering'" class="mt-1">
      <p class="text-xs text-rose-600">{{ processedErrors[0]?.issues[0]?.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  XCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/vue/20/solid";
import type {
  FormattedErrorMessage,
  ParsedValidationErrorMessage,
  Issue,
  FormattedIssue,
} from "@/types";

// Define the props for the component
const props = defineProps<{
  errorMessage: string | any | null; // The error message to display
  errorPhase: "Validation" | "Rendering" | "Unknown"; // The phase of the error
}>();

// Define the events emitted by the component
defineEmits(["errorClose"]);

// State variables
const isExpanded = ref(true); // Tracks whether the error details are expanded
const processedErrors = ref<FormattedErrorMessage[]>([]); // Holds the formatted error messages

// Function to parse the error message and format it
const parseErrorMessage = (): FormattedErrorMessage[] => {
  if (!props.errorMessage) return []; // Return empty if no error message

  try {
    const errorObject = JSON.parse(props.errorMessage); // Parse the error message
    if (errorObject.error) {
      return createErrorMessage("Unknown", errorObject.error); // Handle unknown errors
    }
    if (Array.isArray(errorObject)) {
      // Process validation errors
      const formattedErrors = errorObject
        .map((validationError: ParsedValidationErrorMessage) => ({
          pipeline: validationError.pipeline || null,
          expanded: false, // Set initially to false, will be updated after processing
          issues: extractCriticalIssues(validationError.issues), // Extract critical issues
        }))
        .filter((error) => error.issues.length > 0); // Filter out errors with no issues

      // Set expansion state based on number of pipelines
      const isOneError = formattedErrors.length === 1;
      return formattedErrors.map((error) => ({
        ...error,
        expanded: isOneError, // Expand if there's only one pipeline
        issues: error.issues.map((issue) => ({
          ...issue,
          expanded: isOneError && isSingleAsset.value, // Expand issues for single asset/pipeline
        })),
      }));
    }
    return [];
  } catch (e) {
    console.error("Failed to parse error message:", e); // Log parsing errors
    return createErrorMessage("Error", String(props.errorMessage)); // Handle parsing errors
  }
};

// Helper function to create a formatted error message
const createErrorMessage = (pipeline: string, description: string) => [
  {
    pipeline,
    expanded: true,
    issues: [
      {
        asset: null,
        description,
        context: [],
        expanded: true,
        severity: "critical",
      },
    ],
  },
];

// Helper function to extract critical issues from validation errors
const extractCriticalIssues = (issues: any) => {
  return Object.entries(issues || {}).flatMap(([test, issueList]) =>
    (issueList as Issue[])
      .filter((issue: Issue) => issue.severity === "critical")
      .map(
        (issue: Issue): FormattedIssue => ({
          asset: issue.asset || null,
          description: issue.description,
          context: issue.context || [],
          expanded: false, // Will be updated after initial processing
          severity: issue.severity,
        })
      )
  );
};

// Computed properties
const isSingleAsset = computed(() => {
  if (props.errorPhase !== "Validation") return false;
  const firstError = processedErrors.value[0];
  if (!firstError) return false;

  const assets = new Set(firstError.issues.map((issue) => issue.asset));
  return assets.size === 1;
});

const singleAssetName = computed(() => {
  if (!isSingleAsset.value) return "";
  return processedErrors.value[0].issues[0].asset || "Unknown Asset";
});
// Watch for changes in the errorMessage prop and reprocess the errors
watch(
  () => props.errorMessage,
  () => {
    processedErrors.value = parseErrorMessage(); // Update processed errors on prop change
  },
  { immediate: true }
);

// Function to toggle the expansion state of an error message
const toggleExpansion = (index: number) => {
  processedErrors.value[index].expanded = !processedErrors.value[index].expanded; // Toggle expansion
};

// Function to toggle the expansion state of an issue within an error message
const toggleIssueExpansion = (pipelineIndex: number, issueIndex: number) => {
  processedErrors.value[pipelineIndex].issues[issueIndex].expanded =
    !processedErrors.value[pipelineIndex].issues[issueIndex].expanded; // Toggle issue expansion
};
</script>

<style scoped>
pre {
  white-space: pre-wrap; /* Allow text to wrap */
  word-wrap: break-word; /* Break long words */
  line-height: 1.5; /* Set line height for readability */
}
</style>
