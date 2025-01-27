<template>
  <!-- Main container for the error alert -->
  <div
    v-if="processedErrors.length"
    class="rounded-md bg-red-50 p-4 my-4 overflow-hidden transition-all duration-300"
    :class="{ 'h-16': !isExpanded, 'max-h-64': isExpanded }"
  >
    <!-- Header section -->
    <div class="flex justify-between items-center">
      <div class="flex items-center flex-grow">
        <XCircleIcon class="h-5 w-5 text-red-500 mr-2" aria-hidden="true" />
        <h3 class="text-lg font-medium text-red-800">{{ errorPhase }} Error</h3>
      </div>
      <div class="flex items-center">
        <button @click="isExpanded = !isExpanded" class="text-red-500 mr-2">
          <component :is="isExpanded ? ChevronUpIcon : ChevronDownIcon" class="h-5 w-5" />
        </button>
        <button @click="$emit('errorClose')" class="text-red-700">
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Error content -->
    <div v-if="isExpanded" class="overflow-y-auto" style="max-height: 200px">
      <template v-for="(errorMessage, index) in processedErrors" :key="index">
        <!-- Single Asset Validation Display -->
        <div v-if="isSingleAsset" class="mt-4">
          <h4 class="text-md font-semibold text-gray-900">Asset: {{ singleAssetName }}</h4>
          <div
            v-for="(issue, issueIndex) in errorMessage.issues"
            :key="issueIndex"
            class="mb-2 ml-2"
          >
            <p class="text-sm text-red-600">{{ issue.description }}</p>
            <div v-if="issue.context.length" class="flex items-center space-x-1 mt-2 justify-end">
              <button
                @click="toggleIssueExpansion(index, issueIndex)"
                class="text-xs text-red-700 flex items-center"
              >
                <span class="mr-1">Details</span>
                <component :is="issue.expanded ? ChevronUpIcon : ChevronDownIcon" class="h-4 w-4" />
              </button>
            </div>
            <div v-if="issue.expanded" class="text-sm text-gray-700 ml-1 mt-1 w-full">
              <pre class="whitespace-pre-wrap bg-red-100 rounded p-2">{{
                issue.context.join("\n")
              }}</pre>
            </div>
          </div>
        </div>

        <!-- Full Pipeline Validation Display -->
        <div v-else>
          <div @click="toggleExpansion(index)" class="flex items-center cursor-pointer mt-4">
            <component
              :is="errorMessage.expanded ? ChevronDownIcon : ChevronRightIcon"
              class="h-5 w-5 text-red-500"
            />
            <span class="ml-2 text-red-700">Pipeline: {{ errorMessage.pipeline }}</span>
          </div>
          <div v-if="errorMessage.expanded" class="ml-5 mt-2">
            <div v-for="(issue, issueIndex) in errorMessage.issues" :key="issueIndex" class="mb-2">
              <h4 v-if="issue.asset" class="text-md font-semibold text-gray-900">
                Asset: {{ issue.asset }}
              </h4>
              <p class="text-sm text-red-600">{{ issue.description }}</p>
              <div v-if="issue.context.length" class="flex items-center space-x-1 mt-2 justify-end">
                <!-- Button to toggle the expansion of issue details -->
                <button
                  @click="toggleIssueExpansion(index, issueIndex)"
                  class="text-xs text-red-700 flex items-center"
                >
                  <span class="mr-1">Details</span>
                  <component
                    :is="issue.expanded ? ChevronUpIcon : ChevronDownIcon"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <div v-if="issue.expanded" class="text-sm text-gray-700 ml-1 mt-1 w-full">
                <pre class="whitespace-pre-wrap bg-red-100 rounded p-2">{{
                  issue.context.join("\n")
                }}</pre>
              </div>
            </div>
          </div>
        </div>
      </template>
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
const isExpanded = ref(false); // Tracks whether the error details are expanded
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
      return errorObject
        .map((validationError: ParsedValidationErrorMessage) => ({
          pipeline: validationError.pipeline || null,
          expanded: false,
          issues: extractCriticalIssues(validationError.issues), // Extract critical issues
        }))
        .filter((error) => error.issues.length > 0); // Filter out errors with no issues
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
        expanded: false,
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
          expanded: false,
          severity: issue.severity,
        })
      )
  );
};
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
