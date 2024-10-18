<template>
  <div
    v-if="processedErrors.length"
    class="rounded-md bg-red-50 p-4 my-4 overflow-hidden transition-all duration-300"
    :class="{ 'h-16': !isExpanded, 'max-h-64': isExpanded }"
  >
    <div class="flex justify-between items-center">
      <div class="flex items-center flex-grow">
        <XCircleIcon class="h-5 w-5 text-red-500 mr-2" aria-hidden="true" />
        <h3 class="text-lg font-medium text-red-800">{{ errorPhase }} Error</h3>
      </div>
      <div class="flex items-center">
        <button @click="isExpanded = !isExpanded" class="text-red-500 mr-2">
          <component :is="isExpanded ? ChevronUpIcon : ChevronDownIcon" class="h-5 w-5" aria-hidden="true" />
        </button>
        <button @click="$emit('errorClose')" class="text-red-700">
          <XMarkIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div v-if="isExpanded" class="mt-4 overflow-y-auto" style="max-height: 200px">
      <div v-for="(errorMessage, index) in processedErrors" :key="index">
        <div v-if="errorPhase === 'Validation'" class="mt-4">
          <div @click="toggleExpansion(index)" class="flex items-center cursor-pointer">
            <component :is="errorMessage.expanded ? ChevronDownIcon : ChevronRightIcon" class="h-5 w-5 text-red-500" aria-hidden="true" />
            <span class="ml-2 text-red-700">Pipeline: {{ errorMessage.pipeline }}</span>
          </div>
        </div>
        <div v-if="errorMessage.expanded || errorPhase === 'Rendering'" class="ml-5 mt-2">
          <div v-for="(issue, issueIndex) in errorMessage.issues" :key="issueIndex" class="mb-2">
            <h4 v-if="issue.asset" class="text-md font-semibold text-gray-900">
              Asset: {{ issue.asset }}
            </h4>
            <p class="text-sm text-red-600">{{ issue.description }}</p>
            <div v-if="issue.context.length" class="flex items-center space-x-1 mt-2 justify-end">
              <button
                @click="toggleIssueExpansion(index, issueIndex)"
                class="text-xs text-red-700 flex items-center"
              >
                <span class="mr-1">Details</span>
                <component :is="issue.expanded ? ChevronUpIcon : ChevronDownIcon" class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div v-if="issue.expanded" class="text-sm text-gray-700 ml-1 mt-1 w-full">
              <pre class="whitespace-pre-wrap bg-red-100 rounded p-2">{{ issue.context.join('\n') }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  XCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/vue/20/solid";
import type { FormattedErrorMessage, ParsedValidationErrorMessage, Issue, FormattedIssue } from "@/types";

const props = defineProps<{
  errorMessage: string | any | null;
  errorPhase: "Validation" | "Rendering" | "Unknown";
}>();

defineEmits(["errorClose"]);
const isExpanded = ref(false);
const processedErrors = ref<FormattedErrorMessage[]>([]);

const parseErrorMessage = (): FormattedErrorMessage[] => {
  if (!props.errorMessage) return [];

  try {
    const errorObject = JSON.parse(props.errorMessage);

    if (errorObject.error) {
      return [{
        pipeline: "Unknown",
        expanded: false,
        issues: [{
          asset: null,
          description: errorObject.error,
          context: [],
          expanded: false,
          severity: "critical"
        }],
      }];
    }

    if (Array.isArray(errorObject)) {
      return errorObject.map((validationError: ParsedValidationErrorMessage) => ({
        pipeline: validationError.pipeline || null,
        expanded: false,
        issues: Object.entries(validationError.issues || {}).flatMap(([test, issues]) =>
          issues.filter((issue: Issue) => issue.severity === "critical").map((issue: Issue): FormattedIssue => ({
            asset: issue.asset || null,
            description: issue.description,
            context: issue.context || [],
            expanded: false,
            severity: issue.severity
          }))
        ),
      })).filter(error => error.issues.length > 0);
    }

    return [];
  } catch (e) {
    console.error("Failed to parse error message:", e);
    return [{
      pipeline: "Error",
      expanded: true,
      issues: [{
        asset: null,
        description: String(props.errorMessage),
        context: [],
        expanded: false,
        severity: "critical"
      }],
    }];
  }
};

watch(() => props.errorMessage, () => {
  processedErrors.value = parseErrorMessage();
}, { immediate: true });

const toggleExpansion = (index: number) => {
  processedErrors.value[index].expanded = !processedErrors.value[index].expanded;
};

const toggleIssueExpansion = (pipelineIndex: number, issueIndex: number) => {
  processedErrors.value[pipelineIndex].issues[issueIndex].expanded = !processedErrors.value[pipelineIndex].issues[issueIndex].expanded;
};
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}
</style>