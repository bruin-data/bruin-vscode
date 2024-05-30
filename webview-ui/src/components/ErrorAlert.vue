<template>
  <div v-if="formattedErrorMessages.length" class="rounded-md bg-red-50 p-4 my-4 max-h-64 overflow-y-auto">
    <div class="flex">
      <div class="flex-shrink-0">
        <XCircleIcon class="h-5 w-5 text-red-500" aria-hidden="true" />
      </div>
      <div class="ml-4">
        <div v-for="(errorMessage, index) in formattedErrorMessages" :key="index" class="mb-4">
          <h3 class="text-lg font-medium text-red-800" v-if="errorMessage.pipeline">
            Pipeline: {{ errorMessage.pipeline }}
          </h3>
          <div v-for="(issue, issueIndex) in errorMessage.issues" :key="issueIndex" class="mt-3">
            <h4 class="text-md font-semibold text-gray-900" v-if="issue.asset">
              Asset: {{ issue.asset }}
            </h4>
            <p class="text-sm text-red-600">{{ issue.description }}</p>
            <div
              v-if="issue.context.length"
              class="flex items-center space-x-1 mt-2 justify-end text-[color:var(--vscode-editor-background)]"
            >
              <span class="font-semibold">Details</span>
              <transition name="fade">
                <ChevronUpIcon
                  v-if="issue.expanded.value"
                  class="h-5 w-5"
                  aria-hidden="true"
                  @click="issue.expanded.value = !issue.expanded.value"
                />
                <ChevronDownIcon
                  v-else
                  class="h-5 w-5"
                  aria-hidden="true"
                  @click="issue.expanded.value = !issue.expanded.value"
                />
              </transition>
            </div>
            <div class="text-sm text-gray-700 ml-1 mt-1 w-full" v-show="issue.expanded.value"> 
            <pre class="whitespace-pre-wrap bg-red-100 rounded p-2">{{ formattedIssueContext(issue.context) }}</pre>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { computed, ref } from "vue";
import { defineProps } from "vue";
import { XCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/vue/20/solid";
import type { FormattedErrorMessage, ParsedValidationErrorMessage } from "@/types";

// Define the types explicitly


const props = defineProps<{
  errorMessage: string | any | null;
}>();

// Helper function to format issue context
const formattedIssueContext = (context: string[]) => context.join("\n");

const formattedErrorMessages = computed<FormattedErrorMessage[]>(() => {
  if (!props.errorMessage) return [];

  try {
    const errorObject = JSON.parse(props.errorMessage);

    // Handling a simple error message from render command
    if (errorObject.error) {
      return [
        {
          pipeline: null,
          issues: [
            {
              asset: null,
              description: errorObject.error,
              context: [],
              expanded: ref(false),
            },
          ],
        },
      ];
    }

    // Handling validation errors
    if (Array.isArray(errorObject) && errorObject.length > 0) {
      return errorObject.map((validationError: ParsedValidationErrorMessage) => ({
        pipeline: validationError.pipeline || null,
        issues: Object.entries(validationError.issues || {})
          .flatMap(([test, issues]) =>
            issues.map(issue => ({
              asset: issue.asset || null,
              description: issue.description,
              context: issue.context || [],
              expanded: ref(false),
            }))
          ),
      }));
    }

    return [];
  } catch (e) {
    console.error("Failed to parse error message:", e);
    return [];
  }
});
</script>



<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>